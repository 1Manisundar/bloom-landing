// Scroll is the timeline. Lenis smooths it, ScrollTrigger reads it, and everything else (the poster now,
// the 3D world and Neuro later) listens to one small state object.

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface ScrollState {
  /** 0 at the top of the story, 1 at its end. */
  progress: number;
  /** The id of the chapter in the middle of the screen. */
  chapter: string;
  /** 0 to 1 through that chapter. */
  local: number;
}

type Listener = (state: ScrollState, chapterChanged: boolean) => void;

export interface Scroll {
  readonly state: ScrollState;
  on(listener: Listener): void;
  /** Hold the page still (while the preloader is up). */
  lock(): void;
  unlock(): void;
  /** Measure again after the layout changed (fonts arriving, for instance). */
  refresh(): void;
  /** Go straight to a point in a chapter: t = 0 is its start, 1 its end. Used by the screenshot script. */
  jump(id: string, t?: number): void;
  /** Go straight to the point where chapter id is `local` (0 to 1) of the way through, as the world counts it. */
  seek(id: string, local: number): void;
}

export function setupScroll(reduced: boolean): Scroll {
  const state: ScrollState = { progress: 0, chapter: "hero", local: 0 };
  const listeners: Listener[] = [];
  const emit = (changed: boolean) => listeners.forEach((fn) => fn(state, changed));

  // With reduced motion the browser's own scrolling is left alone.
  const lenis = reduced ? null : new Lenis({ lerp: 0.1, anchors: true });
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const sections = Array.from(document.querySelectorAll<HTMLElement>("section.chapter"));

  // One marker per chapter: it runs from the chapter's top reaching the middle of the screen to its bottom
  // doing the same, so the markers tile the page and exactly one chapter is "in the middle" at a time.
  const marks = sections.map((section) => ({
    section,
    trigger: ScrollTrigger.create({ trigger: section, start: "top center", end: "bottom center" }),
  }));
  const main = document.getElementById("main");
  const story = main ? ScrollTrigger.create({ trigger: main, start: "top top", end: "bottom bottom" }) : null;

  // The state is worked out from the scroll position itself, never pieced together from enter and leave
  // events, so a jump across several chapters lands in the same state as scrolling there would.
  let measured = false;
  const measure = () => {
    if (!marks.length) return;
    const y = window.scrollY;
    let at = marks[0];
    for (const mark of marks) if (y >= mark.trigger.start) at = mark;
    const start = Math.max(0, at.trigger.start);
    const span = Math.max(1, at.trigger.end - start);
    state.local = Math.min(1, Math.max(0, (y - start) / span));
    if (story) state.progress = Math.min(1, Math.max(0, (y - story.start) / Math.max(1, story.end - story.start)));

    const changed = state.chapter !== at.section.id || !measured;
    measured = true;
    if (changed) {
      state.chapter = at.section.id;
      document.body.dataset.chapter = at.section.id;
    }
    emit(changed);
  };
  ScrollTrigger.addEventListener("refresh", measure);
  window.addEventListener("scroll", measure, { passive: true });
  measure();

  return {
    state,
    on(listener) { listeners.push(listener); },
    lock() { lenis?.stop(); },
    unlock() { lenis?.start(); },
    refresh() { lenis?.resize(); ScrollTrigger.refresh(); },
    seek(id, local) {
      const section = document.getElementById(id);
      if (!section) return;
      const top = section.getBoundingClientRect().top + window.scrollY;
      const y = Math.max(0, top + local * section.offsetHeight - window.innerHeight / 2);
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
      ScrollTrigger.update();
      measure();
    },
    jump(id, t = 0) {
      const section = document.getElementById(id);
      if (!section) return;
      const top = section.getBoundingClientRect().top + window.scrollY;
      const y = top + Math.max(0, section.offsetHeight - window.innerHeight) * t;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
      ScrollTrigger.update();
      measure();
    },
  };
}
