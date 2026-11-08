// Names and alt text come only from the exported companions.json. Art is only the real SVG files.
import raw from "../../public/companions/companions.json";

export interface Companion { key: string; name: string; alt: string }

const all: Companion[] = (raw as Array<Record<string, string>>).map((c) => ({ key: c.key, name: c.name, alt: c.alt }));

// Jyothi does not want Nimbus used anywhere on the site.
const BANNED = new Set(["nimbus"]);

export function companion(key: string): Companion {
  if (BANNED.has(key)) throw new Error(`Companion "${key}" must not be used on the site.`);
  const found = all.find((c) => c.key === key);
  if (!found) throw new Error(`Unknown companion "${key}"`);
  return found;
}

export type Pose = "front" | "waving";

/** Path to a real exported SVG. Only `animated: true` returns a moving file (one on screen at a time). */
export function companionSrc(key: string, pose: Pose = "front", animated = false): string {
  companion(key);
  if (pose === "front") return `/companions/${key}/${key}.svg`;
  return `/companions/${key}/actions/${key}-${pose}${animated ? "" : "-still"}.svg`;
}

/** Face tiles use light brand tints in turn (the kit's 20 colours only). */
export const TINTS = ["sage", "mist", "lavender", "blush", "oat", "champagne"] as const;

// The two scrolling rows, in the reference page's order (29 companions, no Nimbus).
export const ROW_A = ["mira", "kai", "nani", "pop", "anand", "theo", "ren", "luna", "amara", "dev", "zara", "jamal", "leila", "obi"].map(companion);
export const ROW_B = ["mochi", "hoot", "biscuit", "tomo", "ember", "pip", "nellie", "pebble", "hazel", "leo", "lumo", "sprout", "button", "nova", "latte"].map(companion);
export const BENTO_FACES = ["mira", "hoot", "mochi", "kai", "sprout", "nani"].map(companion);
export const JOIN_FACES = ["biscuit", "hoot", "mira"].map(companion);
