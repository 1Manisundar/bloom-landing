// Names, roles, sample lines and alt text come only from the exported companions.json.
import raw from "../../public/companions/companions.json";

export interface Companion {
  key: string;
  name: string;
  type: string;
  role: string;      // e.g. "The Listener"
  bestFor: string;   // e.g. "best for venting"
  greeting: string;  // the sample line
  alt: string;
}

const all: Companion[] = (raw as Array<Record<string, string>>).map((c) => {
  const [role, bestFor = ""] = c.role.split(" · ");
  return { key: c.key, name: c.name, type: c.type, role, bestFor, greeting: c.greeting, alt: c.alt };
});

// Jyothi does not want Nimbus used anywhere on the site.
const BANNED = new Set(["nimbus"]);

export function companion(key: string): Companion {
  if (BANNED.has(key)) throw new Error(`Companion "${key}" must not be used on the site.`);
  const found = all.find((c) => c.key === key);
  if (!found) throw new Error(`Unknown companion "${key}"`);
  return found;
}

export type Pose =
  | "front" | "idle" | "listening" | "thinking" | "talking"
  | "waving" | "discovering" | "reading" | "writing" | "sleeping";

/** Path to a real exported SVG. Only `animated: true` returns a moving file. */
export function companionSrc(key: string, pose: Pose = "front", animated = false): string {
  companion(key);
  if (pose === "front") return `/companions/${key}/${key}.svg`;
  return `/companions/${key}/actions/${key}-${pose}${animated ? "" : "-still"}.svg`;
}

// The shelf: 8 companions. Not Nimbus; not Dev (his sample line quotes invented numbers).
export const SHELF = ["mira", "hoot", "biscuit", "tomo", "lumo", "sprout", "mochi", "latte"].map(companion);
