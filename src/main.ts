// neuroditto landing: boot. The page, its type, its scroll, the preloader and the sound toggle start here;
// the 3D world loads alongside. Neuro (milestone 5) plugs in after it.

import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./styles/tokens.css";
import "./styles/base.css";

import { setupScroll, type Scroll } from "./scroll";
import { startPreloader } from "./ui/preloader";
import { setupReveals } from "./ui/reveals";
import { setupSound } from "./ui/sound";
import { setupVerdicts } from "./ui/verdicts";
import { setupWaitlist } from "./ui/waitlist";
import type { World } from "./world";

declare global {
  interface Window {
    /** A handle for the screenshot script and for poking at the page from the console. */
    __nd?: { scroll: Scroll; ready: Promise<void>; world: Promise<World | null> };
  }
}

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
root.classList.add("js", "is-loading");

/** The faces the first screen is set in. The preloader waits for these, and only these. */
const FACES = [
  '400 1em "Instrument Serif"',
  'italic 400 1em "Instrument Serif"',
  '400 1em "Manrope Variable"',
  '500 1em "JetBrains Mono Variable"',
];

const windowLoaded = new Promise<void>((resolve) => {
  if (document.readyState === "complete") resolve();
  else window.addEventListener("load", () => resolve(), { once: true });
});

const preloader = startPreloader(reduced);
for (const face of FACES) preloader.track(document.fonts.load(face));
preloader.track(windowLoaded);
const worldLoading = preloader.progress(6);
preloader.seal();

const scroll = setupScroll(reduced);
scroll.lock();

// The 3D world is a separate download, fetched while the preloader is up. The page never waits on it to be
// readable, and if it cannot start (no WebGL), the poster behind the canvas stays as the backdrop.
const canvas = document.getElementById("world") as HTMLCanvasElement | null;
const world: Promise<World | null> = canvas
  ? import("./world")
      .then((m) => { worldLoading(0.1); return m.createWorld({ canvas, scroll, reduced, report: (f) => worldLoading(0.1 + f * 0.9) }); })
      .catch((error: unknown) => { console.warn("The 3D world could not start; showing the still backdrop.", error); return null; })
      .finally(() => worldLoading(1))
  : Promise.resolve(null);

const sound = setupSound();
setupWaitlist();
setupVerdicts();

// The hairline under the top bar shows how far through the story you are.
const progressBar = document.getElementById("progress-bar");
scroll.on((state) => { if (progressBar) progressBar.style.transform = `scaleX(${state.progress.toFixed(4)})`; });

// A soft tick each time the story moves into a new chapter (only once sound is on).
scroll.on((_state, chapterChanged) => { if (chapterChanged) sound.tick(); });

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const ready = preloader.finished.then(() => {
  scroll.unlock();
  scroll.refresh();
  setupReveals(reduced);
});

window.__nd = { scroll, ready, world };
