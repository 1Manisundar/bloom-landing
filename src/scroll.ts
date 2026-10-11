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
  const topLabel = document.getElementById("top-chapter");

  const labelOf = (section: HTMLElement): string => {
    if (section.id === "hero") return "";
    const label = section.querySelector(".label")?.cloneNode(true) as HTMLElement | undefined;
    label?.querySelectorAll(".dim").forEach((extra) => extra.remove());
    return label?.textContent?.trim() ?? "";
  };

  const enter = (section: HTMLElement) => {
    if (state.chapter === section.id) return;
    state.chapter = section.id;
    document.body.dataset.chapter = section.id;
    if (topLabel) topLabel.textContent = labelOf(section);
    emit(true);
  };

  for (const section of sections) {
    ScrollTrigger.create({
      trigger: section,
      start: "top center",
      end: "bottom center",
      onToggle: (self) => { if (self.isActive) enter(section); },
      onUpdate: (self) => {
        if (state.chapter !== section.id) return;
        state.local = self.progress;
        emit(false);
      },
    });
  }

  const main = document.getElementById("main");
  if (main) {
    ScrollTrigger.create({
      trigger: main,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => { state.progress = self.progress; emit(false); },
    });
  }

  return {
    state,
    on(listener) { listeners.push(listener); },
    lock() { lenis?.stop(); },
    unlock() { lenis?.start(); },
    refresh() { lenis?.resize(); ScrollTrigger.refresh(); },
    jump(id, t = 0) {
      const section = document.getElementById(id);
      if (!section) return;
      const top = section.getBoundingClientRect().top + window.scrollY;
      const y = top + Math.max(0, section.offsetHeight - window.innerHeight) * t;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
      ScrollTrigger.update();
    },
  };
}
