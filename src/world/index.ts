// The world: one canvas, one scene, one camera, driven by scroll. It sits behind the page's real text and is
// never required: if WebGL is missing, or the machine cannot keep up, it steps aside and the poster shows.

import gsap from "gsap";
import { Group, MathUtils, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import type { Scroll } from "../scroll";
import { createBackdrop } from "./backdrop";
import { createRig } from "./camera";
import { CARD_ARRIVES, CARD_PERIOD, createCards } from "./cards";
import { CHAPTERS } from "./chapters";
import { createGraphLines } from "./graph";
import { createParticles } from "./particles";
import { createLens, type Lens } from "./post";
import { buildShapes } from "./shapes";

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
const UP = new Vector3(0, 1, 0);
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
  const particles = createParticles(count, shapes.targets);
  const graph = createGraphLines(shapes.graph);
  const cards = createCards();
  const subject = new Group();
  subject.add(particles.points, graph.lines, cards.mesh);
  scene.add(backdrop.mesh, subject);

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
  const order = CHAPTERS.map((c) => c.id);
  /** The shape position and the camera position the scroll is asking for, each 0 to LAST. */
  const asked = (): [number, number] => {
    const i = Math.max(0, order.indexOf(scroll.state.chapter));
    if (i >= LAST) return [LAST, LAST];
    const f = scroll.state.local;
    const turn = smooth((f - LEAVE_AT) / (1 - LEAVE_AT));
    // The camera creeps a little while you read, then travels with the morph.
    const creep = f < LEAVE_AT ? 0.14 * (f / LEAVE_AT) : 0.14 + 0.86 * turn;
    return [i + turn, i + creep];
  };

  let [shapeAt, cameraAt] = asked();
  let clock = 0, last = performance.now(), dirty = true, running = true, shown = false, pulse = 0;
  const pointer = { x: 0, y: 0 }, lean = { x: 0, y: 0 };
  const phases = cards.offsets.map(() => 0);

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

    const [wantShape, wantCamera] = asked();
    if (reduced) {
      // Reduced motion: nothing drifts and nothing travels. Each chapter is a still picture.
      const still = Math.round(wantShape);
      if (still === shapeAt && !dirty) return;
      shapeAt = cameraAt = still;
    } else {
      clock += dt;
      shapeAt += (wantShape - shapeAt) * (1 - Math.exp(-dt * 5));
      cameraAt += (wantCamera - cameraAt) * (1 - Math.exp(-dt * 3.2));
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

    // Chapter III: the links between concepts, shown once the nodes have nearly settled.
    const linked = smooth((near(order.indexOf("graph")) - 0.55) / 0.4);
    graph.lines.visible = linked > 0.001;
    graph.uniforms.uShow.value = linked;
    graph.uniforms.uTime.value = clock;

    // Chapter II: cards flying into the brain. Each arrival makes the brain flare for a moment.
    const feeding = reduced ? 0 : smooth((near(order.indexOf("sense")) - 0.5) / 0.4);
    cards.mesh.visible = feeding > 0.001;
    cards.uniforms.uShow.value = feeding;
    cards.uniforms.uTime.value = clock;
    // The text of chapter II is on the right of a wide screen: the camera's right, seen from the brain.
    cards.uniforms.uTextSide.value.setFromMatrixColumn(camera.matrixWorld, 0).applyAxisAngle(UP, -subject.rotation.y)
      .multiplyScalar(width > height ? 1 : 0);
    cards.offsets.forEach((offset, n) => {
      const phase = (clock / CARD_PERIOD + offset) % 1;
      if (phases[n] < CARD_ARRIVES && phase >= CARD_ARRIVES && feeding > 0.3) pulse = 1;
      phases[n] = phase;
    });
    pulse *= Math.exp(-dt * 4.5);
    u.uPulse.value = pulse * feeding;

    subject.rotation.y = Math.sin(clock * 0.11) * mix((c) => c.sway);
    subject.rotation.x = Math.sin(clock * 0.07 + 2) * 0.04;
    rig.update(cameraAt, clock, lean);

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
