// The story as the world sees it: one row per chapter, in page order. Each row names the shape the particles
// take, how the light sits, and where the camera stands. Everything in between is interpolated.

import type { ShapeName } from "./shapes";

type Vec3 = [number, number, number];

export interface Shot {
  /** Where the camera stands. */
  pos: Vec3;
  /** What it looks at. The subject always sits at the origin, so looking beside it moves it off-centre. */
  look: Vec3;
}

export interface Chapter {
  /** The section's id in index.html. */
  id: string;
  shape: ShapeName;
  /** Brightness of the particles: lower where a lot of text sits over the world. */
  gain: number;
  /** 0 = warm gold, 1 = the cold grey-violet of things not yet understood. */
  cool: number;
  /** How far the particles wander when at rest. */
  drift: number;
  /** 1 = lit like a solid thing, its far side in shadow (the brain); 0 = see-through (everything else). */
  solid: number;
  /** How far the whole shape sways from side to side, in radians. */
  sway: number;
  /** The two background lights, as in the CSS poster: amber x, y, iris x, y (0 to 1), amber strength. */
  lights: [number, number, number, number, number];
  /**
   * The shot on a wide screen, and on a tall one (a phone held upright). On a wide screen the subject sits
   * beside the text. On a tall one the text runs down the middle, so the camera looks well below the subject
   * and it sits in the top third, clear of the words, as in the hero.
   */
  wide: Shot;
  tall: Shot;
}

export const CHAPTERS: Chapter[] = [
  {
    id: "hero", shape: "hero", gain: 1.1, cool: 0.12, drift: 0.02, solid: 0.9, sway: 0.26,
    lights: [0.72, 0.38, 0.16, 0.84, 0.15],
    wide: { pos: [1.6, 4.6, 8.4], look: [-2.75, -0.2, 0] },
    tall: { pos: [0.6, 5.5, 11.5], look: [0, -2.2, 0] },
  },
  {
    // The week: its things float as cards (see story.ts) in a cold, unsorted cloud.
    id: "week", shape: "noise", gain: 0.6, cool: 0.8, drift: 0.3, solid: 0, sway: 0.15,
    lights: [0.78, 0.5, 0.3, 0.2, 0.1],
    wide: { pos: [1.2, 0.4, 8.6], look: [-2.4, 0.15, 0] },
    tall: { pos: [0.4, 0.3, 11], look: [0, -2.4, 0] },
  },
  {
    // Reading: the cards fly into the brain and the ideas they carried gather around it.
    id: "reading", shape: "brain", gain: 1, cool: 0, drift: 0.012, solid: 1, sway: 0.22,
    lights: [0.62, 0.5, 0.12, 0.8, 0.17],
    wide: { pos: [2.6, 5.2, 8.6], look: [-2.35, 0.25, 0.3] },
    tall: { pos: [1.2, 6.4, 11.6], look: [0, -3.3, 0] },
  },
  {
    // The pattern: the ideas become a map, its links draw in, and the week's two patterns light up.
    id: "pattern", shape: "graph", gain: 1, cool: 0, drift: 0.012, solid: 0, sway: 0.16,
    lights: [0.66, 0.52, 0.12, 0.3, 0.2],
    wide: { pos: [2.4, 0.6, 11], look: [-1.95, -0.35, 0] },
    tall: { pos: [1.4, 0.8, 15.5], look: [0, -4.4, 0] },
  },
  {
    // The mirror reflects the same map. What you said sits outside it; what you did is inside.
    id: "mirror", shape: "mirror", gain: 1, cool: 0.06, drift: 0.01, solid: 0, sway: 0.08,
    lights: [0.7, 0.4, 0.2, 0.92, 0.13],
    wide: { pos: [1.2, 0.1, 9.4], look: [-2.5, 0.05, 0] },
    tall: { pos: [0.4, 0.6, 15.5], look: [0, -3.8, 0] },
  },
  {
    // Close on the reflection, and dim: the three promises are the words to read here.
    id: "promises", shape: "mirror", gain: 0.1, cool: 0.06, drift: 0.01, solid: 0, sway: 0.08,
    lights: [0.5, 0.3, 0.5, 0.96, 0.1],
    wide: { pos: [0.1, 0.25, 2.5], look: [0, 0.1, -0.3] },
    tall: { pos: [0, 0.2, 4.6], look: [0, -0.1, -0.3] },
  },
  {
    // Practice: one idea, as a flashcard, comes back round on wider and wider rings.
    id: "practice", shape: "orbit", gain: 1, cool: 0, drift: 0.01, solid: 0, sway: 0.12,
    lights: [0.64, 0.46, 0.18, 0.24, 0.17],
    wide: { pos: [2.2, 4.2, 11.2], look: [-2.45, -0.3, 0] },
    tall: { pos: [1.2, 4.6, 16], look: [0, -4.3, 0] },
  },
  {
    // Today: fourteen ways of asking one question gather into one card.
    id: "today", shape: "card", gain: 0.75, cool: 0, drift: 0.008, solid: 0, sway: 0.05,
    lights: [0.5, 0.52, 0.5, 1, 0.22],
    wide: { pos: [0, 0.1, 8.4], look: [0, 0.08, 0] },
    tall: { pos: [0, 0.4, 16.5], look: [0, -5.2, 0] },
  },
  {
    // Private: the whole map, on the screen of your own laptop.
    id: "private", shape: "laptop", gain: 1, cool: 0.04, drift: 0.008, solid: 0, sway: 0.18,
    lights: [0.7, 0.62, 0.2, 0.16, 0.1],
    wide: { pos: [1.7, 1.9, 7.6], look: [-1.75, -0.1, -0.3] },
    tall: { pos: [0.8, 2.4, 10.4], look: [0, -2.6, -0.3] },
  },
  {
    id: "begin", shape: "brain", gain: 1, cool: 0, drift: 0.012, solid: 1, sway: 0.22,
    lights: [0.5, 0.8, 0.5, 0, 0.2],
    // From above and in front, with the brain low in the picture: it rises behind the form like a sun.
    wide: { pos: [0, 6.6, 5.2], look: [0, 3.95, 0.3] },
    tall: { pos: [0, 8.6, 7.4], look: [0, 3.9, 0] },
  },
];
