// The world: one canvas, one scene, one camera, driven by scroll. It sits behind the page's real text and is
// never required: if WebGL is missing, or the machine cannot keep up, it steps aside and the poster shows.

import gsap from "gsap";
import { Group, MathUtils, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type { Scroll } from "../scroll";
import { createBackdrop } from "./backdrop";
import { createRig } from "./camera";
import { CHAPTERS } from "./chapters";
import { createGraphLines } from "./graph";
import { createParticles } from "./particles";
import { createLens, type Lens } from "./post";
import { buildShapes, intoMirror } from "./shapes";
import { createStory } from "./story";

export interface WorldStats {
  /** Frames per second over the last couple of seconds. */
  fps: number;
  pixelRatio: number;
  particles: number;
  bloom: boolean;
  /** What the browser says is drawing it. */
  gpu: string;
  tier: "desktop" | "small";
  running: boolean;
  /** Where the shapes and the camera are along the story, 0 to the last chapter's index. */
  at: [number, number];
}

export interface World {
  stats(): WorldStats;
}

interface Options {
  canvas: HTMLCanvasElement;
  scroll: Scroll;
  reduced: boolean;
  /** Loading progress, 0 to 1, for the preloader. */
  report(fraction: number): void;
}

const smooth = (x: number) => { const t = MathUtils.clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const LAST = CHAPTERS.length - 1;
/** How far through a chapter (0 to 1) the world starts turning into the next one. */
const LEAVE_AT = 0.55;

export async function createWorld({ canvas, scroll, reduced, report }: Options): Promise<World | null> {
  // Ask quietly first: three reports a missing WebGL as an error, and here it is an expected case.
  const probe = document.createElement("canvas").getContext("webgl2");
  if (!probe) return null;
  probe.getExtension("WEBGL_lose_context")?.loseContext();

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }

  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown";

  // A phone gets fewer particles and fewer pixels; it still gets the whole story.
  const small = Math.min(window.innerWidth, window.innerHeight) < 700 || window.matchMedia("(pointer: coarse)").matches;
  // For tuning: ?particles=20000 and ?bloom=0 in the address override the defaults.
  const tuning = new URLSearchParams(window.location.search);
  const count = Number(tuning.get("particles")) || (small ? 14000 : 44000);
  const minRatio = 0.75;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);

  const shapes = await buildShapes(count, (done, of) => report((done / of) * 0.8));

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  const rig = createRig(camera);
  const backdrop = createBackdrop();
  const particles = createParticles(count, shapes.targets, shapes.clusterOf);
  const graph = createGraphLines(shapes.graph);
  const subject = new Group();
  subject.add(particles.points, graph.lines);
  scene.add(backdrop.mesh, subject);

  // The annotations: the story places names and pointers over the picture, frame by frame.
  const layer = document.getElementById("annot");
  const svg = document.getElementById("annot-lines") as SVGSVGElement | null;
  const story = layer && svg
    ? createStory({ layer, svg, subject, camera, graph: shapes.graph, size: () => ({ width, height }) })
    : null;
  // Where the graph's links sit when they are seen in the mirror (see intoMirror in shapes.ts).
  const glass = intoMirror(0, 0, 0);

  let lens: Lens | null = tuning.get("bloom") === "0" ? null : createLens(renderer, scene, camera, small);
  let width = 0, height = 0;

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    width = w; height = h;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    lens?.resize(w, h);
    rig.resize(w / h);
    backdrop.uniforms.uAspect.value = w / h;
    // Particle size follows the picture's height, so the world looks the same on any screen.
    particles.uniforms.uSize.value = h * pixelRatio * (w < h ? 0.04 : 0.03);
    dirty = true;
  };

  // ---------- where the story is ----------
  // One number follows the scroll: the chapter in the middle of the screen, plus how far through it you are.
  // Everything else is read off that one number once it has been smoothed, so the scene, the camera and the
  // annotations can never disagree about where the story is.
  const order = CHAPTERS.map((c) => c.id);
  const asked = () => {
    const i = Math.max(0, order.indexOf(scroll.state.chapter));
    return Math.min(LAST + 0.999, i + scroll.state.local);
  };
  /** The parts of a story position: the chapter, its scene's progress, and the turn into the next one. */
  const parts = (u: number) => {
    const chapter = MathUtils.clamp(Math.floor(u), 0, LAST);
    const local = u - chapter;
    const beat = MathUtils.clamp(local / LEAVE_AT, 0, 1);
    const turn = chapter < LAST ? smooth((local - LEAVE_AT) / (1 - LEAVE_AT)) : 0;
    // The camera creeps a little while you read, then travels with the turn.
    const creep = chapter < LAST ? (local < LEAVE_AT ? 0.14 * (local / LEAVE_AT) : 0.14 + 0.86 * turn) : 0;
    return { chapter, beat, turn, shape: chapter + turn, camera: chapter + creep };
  };

  let storyAt = asked();
  let cameraAt = parts(storyAt).camera;
  let shapeAt = parts(storyAt).shape;
  let clock = 0, last = performance.now(), dirty = true, running = true, shown = false, flare = 0;
  let lastStill = -1;
  const pointer = { x: 0, y: 0 }, lean = { x: 0, y: 0 };
  window.addEventListener("nd:verdict", () => { dirty = true; });

  if (!reduced && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", (e) => {
      pointer.x = e.clientX / window.innerWidth - 0.5;
      pointer.y = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  // ---------- keeping up ----------
  // If frames run slow for a while, draw fewer pixels; then give up the bloom; then give up the world.
  const times: number[] = [];
  let slowFor = 0;
  const keepUp = (dt: number, now: number) => {
    times.push(now);
    while (times.length > 2 && now - times[0] > 2000) times.shift();
    if (reduced || dt > 0.25) return;
    slowFor = dt > 1 / 42 ? slowFor + dt : Math.max(0, slowFor - dt * 2);
    if (slowFor < 1.6) return;
    slowFor = 0;
    if (pixelRatio > minRatio) {
      pixelRatio = Math.max(minRatio, pixelRatio - 0.25);
      resize();
    } else if (lens) {
      lens.dispose();
      lens = null;
    } else if (fps() < 18) {
      stop();
    }
  };
  const fps = () => (times.length > 1 ? ((times.length - 1) * 1000) / (times[times.length - 1] - times[0]) : 0);

  const stop = () => {
    running = false;
    gsap.ticker.remove(frame);
    document.documentElement.classList.remove("has-world");
  };

  // ---------- one frame ----------
  const frame = () => {
    if (!running || document.hidden) { last = performance.now(); return; }
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    const want = asked();
    let here = parts(want);
    if (reduced) {
      // Reduced motion: nothing drifts and nothing travels. Each chapter is a still picture of its scene,
      // finished, and the picture changes when the next chapter takes over the middle of the screen.
      const raw = parts(want);
      const still = raw.chapter < LAST && raw.turn > 0.5 ? raw.chapter + 1 : raw.chapter;
      if (still === lastStill && !dirty) return;
      lastStill = still;
      here = { chapter: still, beat: 1, turn: 0, shape: still, camera: still };
      shapeAt = cameraAt = still;
    } else {
      clock += dt;
      storyAt += (want - storyAt) * (1 - Math.exp(-dt * 4.5));
      here = parts(storyAt);
      shapeAt = here.shape;
      cameraAt += (here.camera - cameraAt) * (1 - Math.exp(-dt * 3.2));
      lean.x += (pointer.x - lean.x) * (1 - Math.exp(-dt * 3));
      lean.y += (pointer.y - lean.y) * (1 - Math.exp(-dt * 3));
    }
    dirty = false;

    // Between which two chapters, and how far.
    const i = MathUtils.clamp(Math.floor(shapeAt), 0, LAST - 1);
    const f = MathUtils.clamp(shapeAt - i, 0, 1);
    const from = CHAPTERS[i], to = CHAPTERS[i + 1];
    const mix = (pick: (c: typeof from) => number) => MathUtils.lerp(pick(from), pick(to), f);
    /** 1 when the story is exactly at chapter n, falling to 0 a chapter away. */
    const near = (n: number) => Math.max(0, 1 - Math.abs(shapeAt - n));

    particles.setShapes(from.shape, to.shape);
    const u = particles.uniforms;
    u.uMix.value = f;
    u.uTime.value = clock;
    u.uGain.value = mix((c) => c.gain) * (width < height ? 0.8 : 1);
    u.uCool.value = mix((c) => c.cool);
    u.uDrift.value = reduced ? 0 : mix((c) => c.drift);
    u.uSolid.value = mix((c) => c.solid);

    const lights = backdrop.uniforms.uLights.value;
    lights.set(mix((c) => c.lights[0]), mix((c) => c.lights[1]), mix((c) => c.lights[2]), mix((c) => c.lights[3]));
    backdrop.uniforms.uGlow.value = mix((c) => c.lights[4]);

    subject.rotation.y = Math.sin(clock * 0.11) * mix((c) => c.sway);
    subject.rotation.x = Math.sin(clock * 0.07 + 2) * 0.04;
    rig.update(cameraAt, clock, lean);
    // The story places its annotations from the camera as it stands this frame.
    camera.updateMatrixWorld();
    subject.updateMatrixWorld();
    const cue = story?.update({ chapter: here.chapter, beat: here.beat, turn: here.turn, time: clock }) ?? { highlight: [-1, 0] as [number, number], reveal: 1, flare: 0 };

    // The map's links: drawn in during the pattern scene, and carried into the mirror at the mirror's scale.
    const pattern = order.indexOf("pattern"), mirrorAt = order.indexOf("mirror");
    const linked = smooth((Math.max(near(pattern), near(mirrorAt)) - 0.55) / 0.4);
    graph.lines.visible = linked > 0.001;
    graph.uniforms.uShow.value = linked;
    graph.uniforms.uTime.value = clock;
    graph.uniforms.uReveal.value = cue.reveal;
    const inGlass = MathUtils.clamp(shapeAt - pattern, 0, 1);
    graph.lines.position.set(glass[0] * inGlass, glass[1] * inGlass, glass[2] * inGlass);
    graph.lines.scale.set(MathUtils.lerp(1, 0.5, inGlass), MathUtils.lerp(1, 0.5, inGlass), MathUtils.lerp(1, 0.22, inGlass));

    u.uHighlight.value.set(cue.highlight[0], cue.highlight[1]);
    flare = Math.max(flare * Math.exp(-dt * 4.5), cue.flare);
    u.uPulse.value = flare;

    if (lens) lens.render(dt);
    else renderer.render(scene, camera);

    if (!shown) {
      shown = true;
      document.documentElement.classList.add("has-world");
    }
    keepUp(dt, now);
  };

  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stop(); });
  window.addEventListener("resize", resize);
  resize();

  // Compile the shaders now, behind the preloader, so the first scroll does not stutter.
  await renderer.compileAsync(scene, camera);
  report(1);

  gsap.ticker.add(frame);

  return {
    stats: () => ({ fps: Math.round(fps() * 10) / 10, pixelRatio: Math.round(pixelRatio * 100) / 100, particles: count, bloom: lens !== null, gpu, tier: small ? "small" : "desktop", running, at: [shapeAt, cameraAt] }),
  };
}
