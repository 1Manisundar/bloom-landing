// Every particle has a place in every shape. This file works out those places: one Float32Array of
// x, y, z per shape, all built around the origin. A fixed seed means the world looks the same on every visit.

export type ShapeName = "hero" | "noise" | "brain" | "graph" | "mirror" | "orbit" | "card" | "box";
export const SHAPE_NAMES: ShapeName[] = ["noise", "brain", "hero", "graph", "mirror", "orbit", "card", "box"];

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
/** Roughly bell-shaped, from -1 to 1. */
const gauss = (r: Rng) => (r() + r() + r() - 1.5) / 1.5;
const between = (r: Rng, a: number, b: number) => a + r() * (b - a);

/** The orbit rings, shared with the particle shader, which keeps them turning. */
export const RING_RADIUS = [1.1, 1.9, 2.6, 3.3];
export const RING_TILT = [0.2, -0.35, 0.5, -0.15];

// ---------- I · noise: everything, everywhere, unsorted ----------
function noise(n: number, r: Rng): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = between(r, -8, 8);
    a[i * 3 + 1] = between(r, -4.8, 4.8);
    a[i * 3 + 2] = between(r, -7, 3);
  }
  return a;
}

// ---------- II · the brain: two hemispheres, folded, with a cerebellum tucked under the back ----------
const BRAIN_SCALE = 1.72;

/** 0 at the bottom of a groove, rising to 1 on the crest of a fold. The grooves wind, as real ones do. */
function fold(x: number, y: number, z: number, side: number): number {
  const a = Math.abs(Math.sin(5.6 * y + 2.4 * Math.sin(4.1 * z + 1.7 * Math.sin(3.6 * x * side + 1)) + side * 0.9));
  const b = Math.abs(Math.sin(4.3 * z + 2.1 * Math.sin(4.9 * y + side * 1.7)));
  return Math.min(a, b * 1.3);
}

function brainPoint(r: Rng, out: Float32Array, at: number): void {
  const part = r();
  let x: number, y: number, z: number;

  if (part < 0.86) {
    // The cerebrum. Start from a direction on a sphere, then shape each half separately.
    for (;;) {
      const u = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - u * u);
      x = s * Math.cos(th); y = u; z = s * Math.sin(th);
      const side = x < 0 ? -1 : 1;
      const g = fold(x, y, z, side);
      // Few particles fall into a groove, so the folds read as dark winding lines.
      if (g < 0.3 && r() > 0.025) continue;
      const surface = r() < 0.96;
      // The crest of each fold stands a little proud of the grooves either side of it.
      let rad = surface ? 0.9 + 0.12 * Math.min(1, (g - 0.3) / 0.45) + gauss(r) * 0.008 : Math.cbrt(r()) * 0.84;
      // The long cleft between the two halves.
      rad *= 1 - 0.3 * Math.exp(-(x * x) / 0.02);
      x = side * (0.1 + 0.9 * Math.abs(x)) * rad;
      y *= rad; z *= rad;
      if (y < 0) y *= 0.72;                               // flatter underneath
      x *= (1 - 0.13 * z) * (1 + 0.07 * (1 - z * z));     // narrower at the front, fullest in the middle
      x *= 1.0; y *= 0.86; z *= 1.27;
      break;
    }
  } else if (part < 0.96) {
    // The cerebellum: a small striped bulb at the back, underneath.
    for (;;) {
      const u = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - u * u);
      const rad = r() < 0.85 ? 1 : Math.cbrt(r());
      y = u * 0.32 * rad;
      if (Math.abs(Math.sin(30 * y)) < 0.4 && r() > 0.12) continue;
      x = s * Math.cos(th) * 0.6 * rad; z = s * Math.sin(th) * 0.4 * rad;
      y -= 0.6; z -= 0.8;
      break;
    }
  } else {
    // The stem, heading down and a little back.
    const t = r(), th = r() * TAU, w = 0.15 - 0.05 * t;
    x = Math.cos(th) * w; z = Math.sin(th) * w - 0.38 - 0.16 * t; y = -0.55 - 0.72 * t;
  }

  out[at] = x * BRAIN_SCALE;
  out[at + 1] = y * BRAIN_SCALE + 0.2;
  out[at + 2] = z * BRAIN_SCALE;
}

function brain(n: number, r: Rng): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) brainPoint(r, a, i * 3);
  return a;
}

// ---------- hero: the brain not yet gathered, half lost in the noise ----------
function hero(n: number, r: Rng, cloud: Float32Array, mind: Float32Array): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // Most particles are already home, so the brain can be made out; the rest are still on their way in.
    const k = r() < 0.78 ? 1 : Math.pow(r(), 0.7) * 0.9;
    for (let c = 0; c < 3; c++) a[i * 3 + c] = cloud[i * 3 + c] * (1 - k) * 0.8 + mind[i * 3 + c] * k;
  }
  return a;
}

// ---------- III · the graph: concepts as nodes, links as lines ----------
export interface GraphData {
  /** x, y, z per node. */
  nodes: Float32Array;
  /** 0.25 to 1: how large a node is. */
  sizes: Float32Array;
  /** Node index pairs. */
  edges: Uint16Array;
}

export function buildGraph(r: Rng): GraphData {
  const centres = [[-1.7, 0.7, 0.3], [1.6, 1.0, -0.5], [0.3, -1.3, 0.7], [-0.3, 0.5, -1.7], [2.0, -1.0, 0.9]];
  const count = 64;
  const nodes = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const c = centres[i % centres.length];
    const hub = i < centres.length;
    const u = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - u * u), rad = hub ? 0 : 0.35 + Math.cbrt(r()) * 0.85;
    nodes[i * 3] = c[0] + s * Math.cos(th) * rad;
    nodes[i * 3 + 1] = c[1] + u * rad * 0.85;
    nodes[i * 3 + 2] = c[2] + s * Math.sin(th) * rad;
    sizes[i] = hub ? 1 : 0.25 + r() * 0.4;
  }

  const seen = new Set<number>();
  const pairs: number[] = [];
  const link = (a: number, b: number) => {
    if (a === b) return;
    const key = Math.min(a, b) * 1000 + Math.max(a, b);
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push(a, b);
  };
  const dist = (a: number, b: number) =>
    Math.hypot(nodes[a * 3] - nodes[b * 3], nodes[a * 3 + 1] - nodes[b * 3 + 1], nodes[a * 3 + 2] - nodes[b * 3 + 2]);
  // Each concept links to its two nearest neighbours and to its cluster's hub; the hubs link to each other.
  for (let i = 0; i < count; i++) {
    const near = Array.from({ length: count }, (_, j) => j).filter((j) => j !== i).sort((p, q) => dist(i, p) - dist(i, q));
    link(i, near[0]);
    link(i, near[1]);
    if (i >= centres.length && r() < 0.55) link(i, i % centres.length);
  }
  for (let i = 0; i < centres.length; i++) link(i, (i + 1) % centres.length);
  link(0, 2); link(1, 3);

  return { nodes, sizes, edges: Uint16Array.from(pairs) };
}

function graph(n: number, r: Rng, g: GraphData): Float32Array {
  const a = new Float32Array(n * 3);
  const nodeCount = g.sizes.length, edgeCount = g.edges.length / 2;
  // Bigger nodes gather more particles.
  const total = g.sizes.reduce((sum, s) => sum + s * s + 0.1, 0);
  const pickNode = () => {
    let t = r() * total;
    for (let i = 0; i < nodeCount; i++) { t -= g.sizes[i] * g.sizes[i] + 0.1; if (t <= 0) return i; }
    return nodeCount - 1;
  };
  for (let i = 0; i < n; i++) {
    if (r() < 0.46) {
      const j = pickNode(), spread = 0.035 + 0.11 * g.sizes[j];
      const u = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - u * u), rad = spread * (r() < 0.6 ? 1 : r());
      a[i * 3] = g.nodes[j * 3] + s * Math.cos(th) * rad;
      a[i * 3 + 1] = g.nodes[j * 3 + 1] + u * rad;
      a[i * 3 + 2] = g.nodes[j * 3 + 2] + s * Math.sin(th) * rad;
    } else {
      const e = Math.floor(r() * edgeCount), p = g.edges[e * 2], q = g.edges[e * 2 + 1], t = r();
      for (let c = 0; c < 3; c++) a[i * 3 + c] = g.nodes[p * 3 + c] + (g.nodes[q * 3 + c] - g.nodes[p * 3 + c]) * t + gauss(r) * 0.012;
    }
  }
  return a;
}

// ---------- IV · the mirror: an oval frame, and a small brain looking back out of it ----------
function mirror(n: number, r: Rng, mind: Float32Array): Float32Array {
  const a = new Float32Array(n * 3);
  const A = 1.95, B = 2.65;
  for (let i = 0; i < n; i++) {
    const kind = i % 20;
    let x: number, y: number, z: number;
    if (kind < 8) {
      // The frame: a bright outer rim and a finer inner one, like a bevel.
      const th = r() * TAU, inner = kind >= 6, w = (inner ? 0.93 : 1) + gauss(r) * (inner ? 0.006 : 0.022);
      x = Math.cos(th) * A * w; y = Math.sin(th) * B * w; z = gauss(r) * 0.05 + (inner ? -0.06 : 0);
    } else if (kind < 10) {
      // The glass: a faint shimmer across the oval.
      const th = r() * TAU, rad = Math.sqrt(r()) * 0.9;
      x = Math.cos(th) * A * rad; y = Math.sin(th) * B * rad; z = -0.14;
    } else {
      // You, reflected: the same brain, smaller and pressed flat into the glass.
      x = mind[i * 3] * 0.56; y = (mind[i * 3 + 1] - 0.2) * 0.56 + 0.12; z = mind[i * 3 + 2] * 0.2 - 0.3;
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  return a;
}

// ---------- V · practice: things coming back round, on widening orbits ----------
function orbit(n: number, r: Rng): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const ring = i % 4, tilt = RING_TILT[ring];
    let x: number, y: number, z: number;
    if (ring === 0 && r() < 0.5) {
      // The core the rings turn about.
      const u = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - u * u), rad = 0.62 * (r() < 0.75 ? 1 : Math.cbrt(r()));
      x = s * Math.cos(th) * rad; y = u * rad; z = s * Math.sin(th) * rad;
    } else {
      // A thin ring, with a few bright clumps travelling on it: the cards that are due.
      const clump = r() < 0.3;
      const th = clump ? Math.floor(r() * (2 + ring)) * (TAU / (2 + ring)) + gauss(r) * 0.07 : r() * TAU;
      const rad = RING_RADIUS[ring] + gauss(r) * (clump ? 0.07 : 0.025);
      const flat = Math.sin(th) * rad;
      x = Math.cos(th) * rad; y = flat * Math.sin(tilt) + gauss(r) * (clump ? 0.06 : 0.012); z = flat * Math.cos(tilt);
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  return a;
}

// ---------- VI · today: one card ----------
function card(n: number, r: Rng): Float32Array {
  const a = new Float32Array(n * 3);
  // It is drawn as a frame only. The words belong to the page: this card sits around the real one.
  const W = 2.6, H = 1.66, corner = 0.26;
  for (let i = 0; i < n; i++) {
    const kind = r();
    let x: number, y: number, z = gauss(r) * 0.02;
    if (kind < 0.6) {
      // The outline, with rounded corners.
      const t = r() * (W + H) * 4;
      if (t < W * 2) { x = t - W; y = -H; } else if (t < W * 2 + H * 2) { x = W; y = t - W * 2 - H; }
      else if (t < W * 4 + H * 2) { x = t - W * 3 - H * 2; y = H; } else { x = -W; y = t - W * 4 - H * 3; }
      const cx = Math.sign(x) * (W - corner), cy = Math.sign(y) * (H - corner);
      if (Math.abs(x) > W - corner && Math.abs(y) > H - corner) {
        const d = Math.hypot(x - cx, y - cy) || 1;
        x = cx + ((x - cx) / d) * corner; y = cy + ((y - cy) / d) * corner;
      }
      x += gauss(r) * 0.012; y += gauss(r) * 0.012;
    } else if (kind < 0.72) {
      // A second, fainter outline just inside the first.
      const t = r() * 4, s = 0.965;
      if (t < 1) { x = (t * 2 - 1) * W; y = -H; } else if (t < 2) { x = W; y = ((t - 1) * 2 - 1) * H; }
      else if (t < 3) { x = ((t - 2) * 2 - 1) * W; y = H; } else { x = -W; y = ((t - 3) * 2 - 1) * H; }
      x *= s; y *= s * 0.975; z = -0.12;
    } else {
      // Light spilling past the edges.
      const th = r() * TAU, s = 1.05 + Math.abs(gauss(r)) * 0.5;
      x = Math.cos(th) * W * s; y = Math.sin(th) * H * s; z = gauss(r) * 0.3;
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  return a;
}

// ---------- VII · private: one small box, with everything inside it ----------
function box(n: number, r: Rng): Float32Array {
  const a = new Float32Array(n * 3);
  const S = 0.58;
  for (let i = 0; i < n; i++) {
    const kind = r();
    const p = [0, 0, 0];
    if (kind < 0.5) {
      const axis = Math.floor(r() * 3);
      p[axis] = between(r, -S, S);
      p[(axis + 1) % 3] = (r() < 0.5 ? -S : S) + gauss(r) * 0.008;
      p[(axis + 2) % 3] = (r() < 0.5 ? -S : S) + gauss(r) * 0.008;
    } else if (kind < 0.72) {
      const axis = Math.floor(r() * 3);
      p[axis] = r() < 0.5 ? -S : S;
      p[(axis + 1) % 3] = between(r, -S, S);
      p[(axis + 2) % 3] = between(r, -S, S);
    } else if (kind < 0.9) {
      // What it keeps: a small warm glow in the middle.
      const u = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - u * u), rad = Math.abs(gauss(r)) * 0.3;
      p[0] = s * Math.cos(th) * rad; p[1] = u * rad; p[2] = s * Math.sin(th) * rad;
    } else {
      // The surface it rests on, as a faint ring of light.
      const th = r() * TAU, rad = 1.05 + gauss(r) * 0.32;
      p[0] = Math.cos(th) * rad; p[1] = -S - 0.03; p[2] = Math.sin(th) * rad;
    }
    a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2];
  }
  return a;
}

export interface Shapes {
  targets: Record<ShapeName, Float32Array>;
  graph: GraphData;
}

/** Builds every shape, pausing between them so the preloader can show the work as it happens. */
export async function buildShapes(count: number, onStep: (done: number, of: number) => void): Promise<Shapes> {
  const r = mulberry32(20261012);
  const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  const g = buildGraph(r);
  const targets = {} as Record<ShapeName, Float32Array>;
  const steps: Array<[ShapeName, () => Float32Array]> = [
    ["noise", () => noise(count, r)],
    ["brain", () => brain(count, r)],
    ["hero", () => hero(count, r, targets.noise, targets.brain)],
    ["graph", () => graph(count, r, g)],
    ["mirror", () => mirror(count, r, targets.brain)],
    ["orbit", () => orbit(count, r)],
    ["card", () => card(count, r)],
    ["box", () => box(count, r)],
  ];
  for (let i = 0; i < steps.length; i++) {
    const [name, make] = steps[i];
    targets[name] = make();
    onStep(i + 1, steps.length);
    await pause();
  }
  return { targets, graph: g };
}
