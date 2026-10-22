// The story: what the world points at, scene by scene. It reads the example week from the page (the list of
// things, and the fourteen questions), then each frame works out which names, cards and lines are showing,
// where in the 3D picture they sit, and which cluster of ideas should glow.
//
// Everything here is HTML laid over the canvas (crisp text, cheap to draw) and is aria-hidden: the page's
// own words already say the same things.

import { MathUtils, Vector3, type Camera, type Object3D } from "three";
import { CLUSTERS, LAPTOP, RING_RADIUS, RING_TILT, intoMirror, mulberry32, onScreen, type GraphData } from "./shapes";

/** Where the story is this frame. */
export interface Beat {
  /** The chapter whose words are on screen (its index in CHAPTERS). */
  chapter: number;
  /** 0 to 1 through that chapter's still part, where its scene plays. */
  beat: number;
  /** 0 to 1 through the turn into the next chapter. */
  turn: number;
  /** Seconds, for small idle motion (0 under reduced motion). */
  time: number;
}

/** What the story asks of the 3D world in return. */
export interface Cue {
  /** A cluster to light up, and how much. */
  highlight: [number, number];
  /** How much of the map's links have drawn in, 0 to 1. */
  reveal: number;
  /** A brief flare of the brain as a card is taken in, 0 to 1. */
  flare: number;
}

export interface Story {
  update(beat: Beat): Cue;
}

const smooth = (x: number) => { const t = MathUtils.clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const clamp01 = (x: number) => MathUtils.clamp(x, 0, 1);
/** Fades in over [a, a + w]. */
const after = (x: number, a: number, w = 0.1) => smooth((x - a) / w);

// The chapters, by name, so the choreography reads in words rather than numbers.
const SCENE = { hero: 0, week: 1, reading: 2, pattern: 3, mirror: 4, promises: 5, practice: 6, today: 7, private: 8, begin: 9 };

/** Which cluster each concept of the example week belongs to (see CLUSTERS in shapes.ts). */
const CONCEPT_CLUSTER: Record<string, number> = {
  "Rendering": 0, "Gaussian splatting": 0, "NeRF": 0, "Shaders": 0,
  "Ray tracing": 1, "Sampling": 1,
  "Backprop": 2, "Gradient descent": 2,
  "Neural networks": 3, "Attention": 3,
  "Explaining": 4,
};
/** The concept that names each cluster's hub. */
const HUB_CONCEPT = ["Rendering", "Ray tracing", "Backprop", "Neural networks", "Explaining"];

// ---------- the pieces of the annotation layer ----------

const SVG = "http://www.w3.org/2000/svg";

/** One label: an HTML chip, and optionally a pointer line and a dot at the point it names. */
class Chip {
  readonly el: HTMLElement;
  private line: SVGLineElement | null = null;
  private dot: SVGCircleElement | null = null;
  private on = false;
  private w = 0;
  private last = "";

  constructor(layer: HTMLElement, svg: SVGSVGElement, className: string, html: string, pointer: "none" | "line" | "dash" | "dot",
    private bounds: () => { width: number; height: number }) {
    this.el = document.createElement("div");
    this.el.className = `chip ${className}`;
    this.el.innerHTML = html;
    layer.appendChild(this.el);
    if (pointer === "line" || pointer === "dash") {
      this.line = document.createElementNS(SVG, "line");
      if (pointer === "dash") this.line.classList.add("is-dash", "is-faint");
      svg.appendChild(this.line);
    }
    if (pointer !== "none") {
      this.dot = document.createElementNS(SVG, "circle");
      this.dot.setAttribute("r", "2.5");
      svg.appendChild(this.dot);
    }
  }

  /**
   * Shows the chip with its top-left corner at (x, y), or its top-right corner when `alignRight` is set.
   * When (ax, ay) is given, a dot marks that point and a line runs from it to the chip.
   */
  show(x: number, y: number, opacity: number, scale = 1, ax?: number, ay?: number, alignRight = false): void {
    if (opacity < 0.01) { this.hide(); return; }
    this.on = true;
    // Never past the edge of the screen: a label that would run off is nudged back in.
    if (!this.w) this.w = this.el.offsetWidth;
    const { width, height } = this.bounds(), w = this.w * scale;
    x = alignRight ? MathUtils.clamp(x, w + 12, width - 12) : MathUtils.clamp(x, 12, width - w - 12);
    // Nor under the top bar.
    y = MathUtils.clamp(y, width > height ? 84 : 104, height - 48);
    // Only touch the page when something actually moved: most labels sit still most of the time.
    const transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)${alignRight ? " translateX(-100%)" : ""} scale(${scale.toFixed(3)})`;
    const key = transform + opacity.toFixed(2);
    if (key === this.last && ax === undefined) return;
    this.last = key;
    this.el.style.opacity = opacity.toFixed(3);
    this.el.style.transform = transform;
    if (ax === undefined || ay === undefined) return;
    const o = opacity.toFixed(3);
    if (this.dot) { this.dot.setAttribute("cx", ax.toFixed(1)); this.dot.setAttribute("cy", ay.toFixed(1)); this.dot.style.opacity = o; }
    if (this.line) {
      this.line.setAttribute("x1", ax.toFixed(1)); this.line.setAttribute("y1", ay.toFixed(1));
      this.line.setAttribute("x2", x.toFixed(1)); this.line.setAttribute("y2", (y + 9).toFixed(1));
      this.line.style.opacity = o;
    }
  }

  hide(): void {
    if (!this.on) return;
    this.on = false;
    this.last = "";
    this.el.style.opacity = "0";
    if (this.line) this.line.style.opacity = "0";
    if (this.dot) this.dot.style.opacity = "0";
  }
}

/** A bare line between two screen points (the possibility's evidence). */
class Thread {
  private line: SVGLineElement;
  private dot: SVGCircleElement;
  constructor(svg: SVGSVGElement) {
    this.line = document.createElementNS(SVG, "line");
    this.dot = document.createElementNS(SVG, "circle");
    this.dot.setAttribute("r", "3");
    svg.append(this.line, this.dot);
    this.hide();
  }
  show(x1: number, y1: number, x2: number, y2: number, opacity: number): void {
    const o = opacity < 0.01 ? "0" : opacity.toFixed(3);
    this.line.setAttribute("x1", x1.toFixed(1)); this.line.setAttribute("y1", y1.toFixed(1));
    this.line.setAttribute("x2", x2.toFixed(1)); this.line.setAttribute("y2", y2.toFixed(1));
    this.dot.setAttribute("cx", x2.toFixed(1)); this.dot.setAttribute("cy", y2.toFixed(1));
    this.line.style.opacity = o; this.dot.style.opacity = o;
  }
  hide(): void { this.line.style.opacity = "0"; this.dot.style.opacity = "0"; }
}

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

// ---------- the story itself ----------

interface Options {
  layer: HTMLElement;
  svg: SVGSVGElement;
  subject: Object3D;
  camera: Camera;
  graph: GraphData;
  /** The canvas's size in CSS pixels, which is also the annotation layer's. */
  size(): { width: number; height: number };
}

export function createStory({ layer, svg, subject, camera, graph, size }: Options): Story {
  if (CLUSTERS.length !== HUB_CONCEPT.length) throw new Error("Every cluster needs a named hub.");
  const r = mulberry32(31);

  // ---- the example week, read from the page ----
  const items = Array.from(document.querySelectorAll<HTMLLIElement>("#week-items li")).map((li, k) => ({
    source: li.dataset.source ?? "",
    time: li.dataset.time ?? "",
    title: li.textContent?.trim() ?? "",
    concepts: (li.dataset.concepts ?? "").split("|").filter(Boolean),
    // Where it floats in the week: a loose grid of three columns with a little depth, so nearer cards are larger.
    home: [-3.2 + (k % 3) * 2.1 + (r() - 0.5) * 0.35, 2.25 - Math.floor(k / 3) * 1.36 + (r() - 0.5) * 0.2, (r() - 0.5) * 1.1],
    // When, in the reading scene, it flies into the brain: the first one slowly, so you can follow it.
    start: k === 0 ? 0.03 : 0.3 + (k - 1) * 0.05,
    length: k === 0 ? 0.26 : 0.13,
  }));
  const arrive = (k: number) => items[k].start + items[k].length;

  // Each concept goes to a node of its cluster: the hub for the cluster's name, the next members for the rest.
  // Members are taken a few apart, so their names do not land on top of each other.
  const nextMember = graph.ranges.map((range) => range.start + 2);
  const concepts: Array<{ name: string; node: number; arrivals: number[]; angle: number }> = [];
  for (let k = 0; k < items.length; k++) {
    for (const name of items[k].concepts) {
      let c = concepts.find((x) => x.name === name);
      if (!c) {
        const cluster = CONCEPT_CLUSTER[name] ?? 0;
        const node = HUB_CONCEPT[cluster] === name ? graph.ranges[cluster].start : nextMember[cluster];
        if (node !== graph.ranges[cluster].start) nextMember[cluster] = Math.min(graph.ranges[cluster].start + graph.ranges[cluster].count - 1, node + 3);
        c = { name, node, arrivals: [], angle: 0 };
        concepts.push(c);
      }
      c.arrivals.push(arrive(k));
    }
  }
  concepts.forEach((c, j) => { c.angle = (j / concepts.length) * Math.PI * 2 + 0.4; });

  const questions = Array.from(document.querySelectorAll<HTMLLIElement>("#today-questions li")).map((li, q, all) => {
    const angle = (q / all.length) * Math.PI * 2 + (r() - 0.5) * 0.3;
    const reach = 3.2 + r() * 1.3;
    return { text: li.textContent?.trim() ?? "", start: [Math.cos(angle) * reach * 1.45, Math.sin(angle) * reach * 0.62, (r() - 0.5) * 1.5] };
  });

  // ---- the chips ----
  const itemChips = items.map((it) => new Chip(layer, svg, "chip--item",
    `<span class="chip__meta"><b>${escape(it.source)}</b><span>${escape(it.time)}</span></span><span class="chip__title">${escape(it.title)}</span>`, "none", size));
  const conceptChips = concepts.map((c) => new Chip(layer, svg, "chip--tag", escape(c.name), "dot", size));
  const hoursNote = new Chip(layer, svg, "chip--note", `<span class="mono">Where the hours went</span>3D graphics, by a distance`, "line", size);
  const sessions = new Chip(layer, svg, "chip--sessions-wrap", `<span class="chip--sessions">${"<i></i>".repeat(11)}</span>`, "line", size);
  const sessionDots = Array.from(sessions.el.querySelectorAll("i"));
  const sessionsNote = new Chip(layer, svg, "chip--note", "<span class=\"mono\">Your 11 longest sessions</span>9 of 11 spent explaining something", "none", size);
  const saidNote = new Chip(layer, svg, "chip--note", `<span class="mono">What you said</span>“Becoming an AI engineer is the aim.”`, "dash", size);
  const didNote = new Chip(layer, svg, "chip--note", `<span class="mono">What you did</span>Mostly 3D graphics`, "line", size);
  const evidence = [0, 1, 2].map(() => new Thread(svg));
  const flashcard = new Chip(layer, svg, "chip--card", `<span class="mono">Flashcard · Backprop</span><span>Why does it need the chain rule?</span>`, "none", size);
  const reviews = [0, 1, 2, 3].map((n) => new Chip(layer, svg, "chip--tag", `Review ${n + 1}`, "dot", size));
  const feynman = new Chip(layer, svg, "chip--note", `<span class="mono">Feynman coach</span>“Explain it like I’m five.”`, "line", size);
  const askChips = questions.map((q) => new Chip(layer, svg, "chip--ask", escape(q.text), "none", size));
  const yoursTag = new Chip(layer, svg, "chip--tag is-big", "Your computer", "line", size);
  const localNote = new Chip(layer, svg, "chip--note", `<span class="mono">With a local model</span>Nothing leaves`, "line", size);
  const keyNote = new Chip(layer, svg, "chip--note", `<span class="mono">Or, if you choose</span>One API key`, "dash", size);

  // ---- placing things ----
  const v = new Vector3(), view = new Vector3();
  const screen = { x: 0, y: 0, depth: 1 };
  /** Projects a point of the subject's space onto the screen, in CSS pixels. */
  const project = (p: ArrayLike<number>): typeof screen => {
    const { width, height } = size();
    v.set(p[0], p[1], p[2]).applyMatrix4(subject.matrixWorld);
    view.copy(v).applyMatrix4(camera.matrixWorldInverse);
    screen.depth = Math.max(0.1, -view.z);
    v.project(camera);
    screen.x = (v.x + 1) * 0.5 * width;
    screen.y = (1 - v.y) * 0.5 * height;
    return screen;
  };
  const node = (n: number): number[] => [graph.nodes[n * 3], graph.nodes[n * 3 + 1], graph.nodes[n * 3 + 2]];
  const lerp3 = (a: ArrayLike<number>, b: ArrayLike<number>, t: number): number[] =>
    [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const hub = (cluster: number) => graph.ranges[cluster].start;
  const BRAIN: number[] = [0, 0.2, 0];
  const possibility = document.getElementById("possibility");

  /** A point on orbit ring `ring`, turning as the particles of that ring do (see turnRing in particles.ts). */
  const SPEED = [0.55, -0.34, 0.21, -0.13];
  const onRing = (ring: number, angle: number): number[] => {
    const rad = RING_RADIUS[ring], tilt = RING_TILT[ring], flat = Math.sin(angle) * rad;
    return [Math.cos(angle) * rad, flat * Math.sin(tilt), flat * Math.cos(tilt)];
  };

  return {
    update({ chapter, beat, turn, time }) {
      const { width, height } = size();
      // Read the page before writing to it, so the browser never has to lay it out twice in one frame.
      const box = chapter === SCENE.mirror ? possibility?.getBoundingClientRect() : undefined;
      const wide = width > height;
      const cue: Cue = { highlight: [-1, 0], reveal: 1, flare: 0 };
      // How far along the story is, as one number: 2.5 is halfway through the turn out of chapter 2.
      const at = chapter + turn;
      /** 1 inside chapter n's scene, fading out over the turn into the next. */
      const during = (n: number) => (chapter === n ? 1 - turn : 0);

      // ---------- the week's cards ----------
      items.forEach((it, k) => {
        const chip = itemChips[k];
        let p: number[] = it.home, opacity = 0, scale = 1;
        if (chapter === SCENE.week) {
          opacity = after(beat, k * 0.045, 0.12);
        } else if (chapter === SCENE.reading) {
          const flight = clamp01((beat - it.start) / it.length);
          const pull = flight * flight;
          p = lerp3(it.home, BRAIN, pull);
          scale = 1 - 0.85 * pull;
          opacity = 1 - after(flight, 0.75, 0.25);
        }
        if (opacity < 0.01) { chip.hide(); return; }
        const bob = Math.sin(time * 0.6 + k * 1.7) * 0.05;
        const s = project([p[0], p[1] + bob, p[2]]);
        const depthScale = MathUtils.clamp(8.5 / s.depth, 0.62, 1.25) * (wide ? 1 : 0.74);
        chip.show(s.x, s.y, opacity, depthScale * scale);
      });

      // A card just taken in makes the brain flare.
      if (chapter === SCENE.reading) {
        for (let k = 0; k < items.length; k++) {
          const since = beat - arrive(k);
          if (since >= 0 && since < 0.035) cue.flare = Math.max(cue.flare, 1 - since / 0.035);
        }
      }

      // ---------- the ideas ----------
      const ideasShown = chapter >= SCENE.reading && at < SCENE.promises;
      concepts.forEach((c, j) => {
        const chip = conceptChips[j];
        if (!ideasShown) { chip.hide(); return; }
        // How many times this idea has come up so far; it appears with the first.
        const seen = chapter === SCENE.reading ? c.arrivals.filter((a) => a <= beat).length : c.arrivals.length;
        if (seen === 0) { chip.hide(); return; }
        // A phone has room for the names of the five clusters, not every idea in them.
        const isHub = graph.ranges.some((range) => range.start === c.node);
        if (!wide && !isHub) { chip.hide(); return; }
        const fresh = chapter === SCENE.reading && c.arrivals.some((a) => beat - a >= 0 && beat - a < 0.05);
        chip.el.classList.toggle("is-hot", fresh);
        chip.el.classList.toggle("is-big", seen > 1);

        const angle = c.angle + time * 0.05;
        const ring = [Math.cos(angle) * 2.15, 0.25 + Math.sin(angle * 2) * 0.35, Math.sin(angle) * 2.15];
        const map = node(c.node);
        const glass = intoMirror(map[0], map[1], map[2]);
        let p: number[], opacity = 1;
        if (chapter === SCENE.reading) {
          p = lerp3(ring, map, smooth(turn));
        } else if (chapter === SCENE.pattern) {
          p = lerp3(map, glass, smooth(turn));
          // In the mirror only the ideas the guess is about keep their names.
          const kept = c.node === hub(0) || c.node === hub(3) || c.node === hub(4);
          if (!kept) opacity = 1 - smooth(turn * 1.6);
        } else {
          p = glass;
          const kept = c.node === hub(0) || c.node === hub(3) || c.node === hub(4);
          opacity = kept ? 1 - turn : 0;
        }
        if (!wide && chapter >= SCENE.mirror - 1 && turn + (chapter - SCENE.pattern) > 0.5 && c.node !== hub(4)) opacity = 0;
        const s = project(p);
        chip.show(s.x + 7, isHub ? s.y - 24 : s.y + 6, opacity, 1, s.x, s.y);
      });

      // ---------- the pattern: where the hours went, and what the longest sessions were ----------
      const inPattern = during(SCENE.pattern);
      if (chapter === SCENE.pattern) cue.reveal = smooth(beat / 0.42);
      if (inPattern > 0) {
        const h0 = project(node(hub(0)));
        hoursNote.show(h0.x - 30, h0.y - 185, after(beat, 0.3) * inPattern, 1, h0.x, h0.y, true);
        const h4 = project(node(hub(4)));
        const counting = clamp01((beat - 0.56) / 0.34);
        const lit = Math.round(counting * 9);
        sessionDots.forEach((dot, n) => dot.classList.toggle("is-on", n < lit));
        const show = after(beat, 0.5, 0.08) * inPattern;
        sessions.show(h4.x + 40, h4.y + 46, show, 1, h4.x, h4.y);
        sessionsNote.el.innerHTML = `<span class="mono">Your 11 longest sessions</span>${lit} of 11 spent explaining something`;
        sessionsNote.show(h4.x + 40, h4.y + 76, show);
        cue.highlight = beat < 0.53 ? [0, after(beat, 0.3, 0.15) * 0.7] : [4, after(beat, 0.55, 0.2)];
      } else {
        hoursNote.hide(); sessions.hide(); sessionsNote.hide();
      }

      // ---------- the mirror: said, did, and the guess with its evidence ----------
      const inMirror = during(SCENE.mirror) * (chapter === SCENE.mirror ? 1 : 0);
      if (inMirror > 0) {
        const n3 = node(hub(3)), n0 = node(hub(0));
        const goal = intoMirror(n3[0], n3[1], n3[2]), mass = intoMirror(n0[0], n0[1], n0[2]);
        const g = { ...project(goal) }, m = { ...project(mass) };
        // The notes sit just outside the mirror, on the far side from the page's words.
        const side = wide ? Math.min(width * 0.8, width - 300) : g.x;
        const saidY = project([0, 1.9, 0]).y, didY = project([0, -1.35, 0]).y;
        saidNote.show(side, saidY, after(beat, 0.08) * inMirror, wide ? 1 : 0.85, g.x, g.y);
        didNote.show(side, didY, after(beat, 0.24) * inMirror, wide ? 1 : 0.85, m.x, m.y);

        // Lines from the guess on the page to the ideas it is built on.
        const threads = after(beat, 0.42, 0.14) * inMirror;
        const anchors = [hub(4), hub(4) + 1, hub(4) + 2];
        evidence.forEach((t, n) => {
          if (!box || !wide) { t.hide(); return; }
          const map = node(anchors[n]);
          const e = project(intoMirror(map[0], map[1], map[2]));
          t.show(box.right, box.top + box.height * (0.3 + n * 0.08), e.x, e.y, threads * 0.8);
        });

        const verdict = document.body.dataset.answer;
        const strength = verdict === "signal" ? 1.35 : verdict === "drift" ? 0.2 : verdict === "unsure" ? 0.55 : 0.8;
        cue.highlight = [4, after(beat, 0.42, 0.14) * strength];
      } else {
        saidNote.hide(); didNote.hide(); evidence.forEach((t) => t.hide());
      }

      // ---------- practice: one card, coming back on wider and wider rings ----------
      const inPractice = during(SCENE.practice);
      if (inPractice > 0) {
        const climb = beat * 4.4;
        const ringNow = Math.min(3, Math.floor(climb));
        const hop = ringNow < 3 ? smooth((climb - ringNow - 0.82) / 0.18) : 0;
        const angleOn = (ring: number) => 0.9 + ring * 0.6 + time * SPEED[ring];
        const p = lerp3(onRing(ringNow, angleOn(ringNow)), onRing(Math.min(3, ringNow + 1), angleOn(Math.min(3, ringNow + 1))), hop);
        const s = project(p);
        flashcard.show(s.x - 20, s.y - 30, inPractice * after(beat, 0.02, 0.08), wide ? 1 : 0.85);
        reviews.forEach((chip, ring) => {
          const reached = ring <= ringNow;
          const q = project(onRing(ring, -1.9 + ring * 0.15));
          chip.show(q.x + 8, q.y - 20, reached ? inPractice * 0.9 : 0, 1, q.x, q.y);
        });
        const core = project([0, 0, 0]);
        feynman.show(core.x - 40, core.y + 70, after(beat, 0.72) * inPractice, 1, core.x, core.y);
      } else {
        flashcard.hide(); reviews.forEach((c) => c.hide()); feynman.hide();
      }

      // ---------- today: fourteen ways of asking, gathered into one card ----------
      const inToday = chapter === SCENE.today ? 1 - turn : chapter === SCENE.practice ? after(turn, 0.6, 0.4) : 0;
      questions.forEach((q, n) => {
        const chip = askChips[n];
        if (inToday <= 0) { chip.hide(); return; }
        const gather = chapter === SCENE.today ? smooth((beat - 0.05 - n * 0.03) / 0.36) : 0;
        const p = lerp3(q.start, [0, 0.1, 0], Math.pow(gather, 1.4));
        const s = project(p);
        chip.show(s.x, s.y, inToday * (1 - after(gather, 0.5, 0.3)), 1 - gather * 0.4, undefined, undefined, s.x > width / 2);
      });

      // ---------- private: your computer, and the one optional way out ----------
      const inPrivate = during(SCENE.private);
      if (inPrivate > 0) {
        const base = project([0, LAPTOP.hinge[1] - 0.05, 0.95]);
        yoursTag.show(base.x - 60, base.y + 40, after(beat, 0.08) * inPrivate, 1, base.x, base.y);
        const top = project(onScreen(0.85, 1));
        localNote.show(top.x + 30, top.y - 70, after(beat, 0.26) * inPrivate, 1, top.x, top.y);
        const edge = project([LAPTOP.halfWidth, LAPTOP.hinge[1], 0]);
        keyNote.show(wide ? width - 40 : edge.x + 20, edge.y + 10, after(beat, 0.46) * inPrivate * 0.85, 1, edge.x, edge.y, wide);
      } else {
        yoursTag.hide(); localNote.hide(); keyNote.hide();
      }

      return cue;
    },
  };
}
