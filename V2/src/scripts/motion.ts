// Scroll motion for the whole page.
//
// Cinematic mode (smooth scroll + the pinned "Over weeks" scene + scroll-linked night chapter)
// runs only with motion allowed AND a viewport at least 700px tall. Otherwise the page stays the
// normal stacked layout from Phase 1. Reveals run whenever motion is allowed.
// Every hidden starting state is set here, in script, so nothing is hidden if this file fails.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, CustomEase);
// The brand easing: cubic-bezier(0.22, 1, 0.36, 1), "settles like a stone".
CustomEase.create("settle", "0.22,1,0.36,1");

const root = document.documentElement;
const token = (name: string) => getComputedStyle(root).getPropertyValue(name).trim();
const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => scope.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => [...scope.querySelectorAll<T>(sel)];

interface SceneInfo { id: string; start: number; end: number }
interface ND {
  mode: "cinematic" | "stacked" | "reduced";
  scenes: SceneInfo[];
  jump: (y: number) => void;
  ready: Promise<void>;
}
declare global { interface Window { __nd: ND } }

let lenis: Lenis | null = null;
let markReady: () => void = () => {};
window.__nd = {
  mode: "stacked",
  scenes: [],
  jump: (y) => {
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
    ScrollTrigger.update();
  },
  ready: new Promise<void>((done) => { markReady = done; }),
};

/* ---------------- Header: height token, scrolled state, day/night tone ---------------- */
const header = $(".site-header");
function measureHeader() {
  if (header) root.style.setProperty("--header-h", `${Math.round(header.getBoundingClientRect().height)}px`);
}
function updateHeader() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 8);
  // The tone of whatever sits just under the header's bottom edge.
  const y = header.getBoundingClientRect().bottom + 1;
  const under = document.elementsFromPoint(24, y).find((el) => !header.contains(el));
  const tone = under?.closest<HTMLElement>("[data-tone]")?.dataset.tone ?? "day";
  header.dataset.tone = tone;
}
measureHeader();
updateHeader();
window.addEventListener("resize", measureHeader, { passive: true });
let headerQueued = false;
window.addEventListener("scroll", () => {
  if (headerQueued) return;
  headerQueued = true;
  requestAnimationFrame(() => { headerQueued = false; updateHeader(); });
}, { passive: true });

/* ---------------- In-page links ----------------
   One offset only: the measured header height. CSS uses it as scroll-padding-top (--header-h, for
   native hash jumps and no-script), and this handler uses the same number. The target is measured at
   click time, so jumps across the pinned scene land where the section really is. After the jump the
   header tone is updated and focus moves to the section's heading. */
const headerHeight = () => header?.getBoundingClientRect().height ?? 0;
function targetY(el: HTMLElement) {
  return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - headerHeight()));
}
function focusHeading(section: HTMLElement) {
  const heading = section.matches("h1, h2") ? section : section.querySelector<HTMLElement>("h2, h1");
  const target = heading ?? section;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}
function arrive(section: HTMLElement) {
  // Correct any last-pixel drift (a pin or a late image can move the target during the jump).
  const y = targetY(section);
  if (Math.abs(window.scrollY - y) > 1) window.__nd.jump(y);
  updateHeader();
  focusHeading(section);
}
function goToSection(section: HTMLElement, smooth: boolean) {
  const y = targetY(section);
  if (lenis) {
    lenis.scrollTo(y, smooth ? { duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete: () => arrive(section) } : { immediate: true, force: true, onComplete: () => arrive(section) });
    if (!smooth) arrive(section);
    return;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!smooth || reduce) { window.scrollTo(0, y); arrive(section); return; }
  let done = false;
  const finish = () => { if (done) return; done = true; arrive(section); };
  window.addEventListener("scrollend", finish, { once: true });
  window.setTimeout(finish, 1500);
  window.scrollTo({ top: y, behavior: "smooth" });
}
document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element).closest<HTMLAnchorElement>("a[href*='#']");
  if (!link) return;
  const url = new URL(link.href, location.href);
  if (url.pathname !== location.pathname || !url.hash || url.hash === "#") return;
  const section = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!section) return;
  event.preventDefault();
  if (location.hash !== url.hash) history.pushState(null, "", url.hash);
  goToSection(section, true);
});
window.addEventListener("popstate", () => {
  const section = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (section) goToSection(section, false);
});

/* ---------------- Keep scroll positions true ----------------
   Refresh ScrollTrigger once fonts and images have loaded, and whenever the page's height changes
   (a pattern card turning, a companion card opening, an FAQ answer), so pins and jumps stay right. */
let refreshQueued = 0;
function queueRefresh() {
  window.clearTimeout(refreshQueued);
  refreshQueued = window.setTimeout(() => { measureHeader(); ScrollTrigger.refresh(); }, 120);
}
document.fonts?.ready.then(queueRefresh);
window.addEventListener("load", queueRefresh);
const main = document.getElementById("main");
if (main && "ResizeObserver" in window) {
  let lastHeight = 0;
  new ResizeObserver(([entry]) => {
    const h = Math.round(entry.contentRect.height);
    if (lastHeight && Math.abs(h - lastHeight) > 1) queueRefresh();
    lastHeight = h;
  }).observe(main);
}

/* ---------------- Modes ---------------- */
const mm = gsap.matchMedia();
mm.add(
  {
    cinematic: "(prefers-reduced-motion: no-preference) and (min-height: 700px)",
    motion: "(prefers-reduced-motion: no-preference)",
  },
  (ctx) => {
    const { cinematic, motion } = ctx.conditions as { cinematic: boolean; motion: boolean };
    window.__nd.mode = cinematic ? "cinematic" : motion ? "stacked" : "reduced";
    root.dataset.motion = window.__nd.mode;
    window.__nd.scenes = [];
    const cleanups: Array<() => void> = [];

    if (cinematic) {
      cleanups.push(smoothScroll());
      overWeeksScene();
      nightChapter(true);
      returnToDay();
      privacyDrop();
    } else if (motion) {
      nightChapter(false);
    }
    if (motion) reveals();

    ScrollTrigger.refresh();
    requestAnimationFrame(() => {
      // A page opened with #section lands under the header once the pins exist.
      const section = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
      if (section) goToSection(section, false);
      updateHeader();
      markReady();
    });
    return () => {
      cleanups.forEach((fn) => fn());
      $("#weeks")?.classList.remove("is-scene");
      delete root.dataset.motion;
    };
  },
);
// Reduced motion matches neither query branch with content; still resolve `ready`.
if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
  window.__nd.mode = "reduced";
  root.dataset.motion = "reduced";
  markReady();
}

/* ---------------- Smooth scroll (Lenis) ---------------- */
function smoothScroll() {
  // No `anchors` option: in-page links are handled below, with one offset (the measured header).
  lenis = new Lenis({ lerp: 0.12 });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

/* ---------------- Over weeks: the pinned scene ---------------- */
function overWeeksScene() {
  const section = $("#weeks");
  const stage = $(".weeks__stage", section ?? document);
  if (!section || !stage) return;
  section.classList.add("is-scene");

  const stones = $$<SVGEllipseElement>(".pebbles__stone", stage);
  const thread = $<SVGPathElement>(".pebbles__thread", stage);
  const dot = $<SVGCircleElement>(".pebbles__dot", stage);
  const ground = $<SVGLineElement>(".pebbles__ground", stage);
  const weekText = $$<SVGTextElement>(".pebbles__weeks text", stage);
  const fadeOut = $$(".weeks__copy, .weeks__figure figcaption", stage);
  const day = $(".weeks__day", stage);
  const copy = $(".weeks__copy", stage);
  const grid = $(".weeks__grid", stage);
  const line = $(".weeks__line", stage);
  const grain = $(".weeks__grain", stage);
  const counter = $(".weeks__count", stage);
  const counterN = $("[data-week-n]", stage);

  const c = {
    ivory: token("--c-ivory"), emerald: token("--c-emerald"), sage: token("--c-sage"),
    forest: token("--c-forest"), jade: token("--c-jade"),
    gold: token("--c-gold"), lightGold: token("--c-light-gold"),
    border: token("--c-border"), darkCard: token("--c-dark-card"),
    eucalyptus: token("--c-eucalyptus"), darkText2: token("--c-dark-text-2"),
    bronze: token("--c-bronze"),
  };

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      id: "weeks",
      trigger: stage,
      start: "top top",
      end: "+=250%",
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => { stage.dataset.tone = self.progress > 0.66 ? "night" : "day"; },
      onRefresh: (self) => {
        window.__nd.scenes = window.__nd.scenes.filter((s) => s.id !== "weeks");
        window.__nd.scenes.push({ id: "weeks", start: self.start, end: self.end });
      },
    },
  });

  // 0 → 5: pebbles drop in, week 1 to week 6, each settling like a stone.
  stones.forEach((stone) => {
    const week = Number(stone.dataset.week) - 1;
    const i = Number(stone.dataset.i);
    tl.fromTo(stone, { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "settle" }, 0.3 + week * 0.75 + i * 0.12);
  });
  // 1 → 5.6: the gold thread draws through them, then the dot lands.
  if (thread) {
    // Dash 1, gap 2: at offset 1 the path is all gap, so no round cap shows before it draws.
    gsap.set(thread, { strokeDasharray: "1 2", strokeDashoffset: 1 });
    tl.to(thread, { strokeDashoffset: 0, duration: 4.6 }, 1);
  }
  if (dot) tl.fromTo(dot, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.4, ease: "settle" }, 5.4);

  // 5.4 → 7.8: the text steps aside, the chart rises to make room, and the day deepens into night
  // (through sage and forest, so the middle of the change stays green instead of grey).
  const figure = $(".weeks__figure", stage);
  const caption = $(".weeks__figure figcaption", stage);
  const narrow = window.matchMedia("(max-width: 900px)");
  const lift = () => {
    // Phone and tablet: raise the chart so it sits just above the night line, the pair centred.
    if (narrow.matches && figure && line) {
      // Boxes relative to the stage, with the lift already applied taken back out.
      const stageTop = stage.getBoundingClientRect().top;
      const applied = Number(gsap.getProperty(day!, "y")) || 0;
      const chartBottom = figure.getBoundingClientRect().bottom - (caption?.offsetHeight ?? 0) - stageTop - applied;
      const lineTop = line.closest<HTMLElement>(".weeks__night")!.getBoundingClientRect().top - stageTop;
      return lineTop - 40 - chartBottom;
    }
    // Wider screens: raise the chart by the height of the text that just faded.
    return -((copy?.offsetHeight ?? 0) + parseFloat(getComputedStyle(grid ?? stage).rowGap || "0"));
  };
  tl.to(fadeOut, { opacity: 0, y: -12, duration: 0.8 }, 5.4)
    .to(day, { y: lift, duration: 1.6, ease: "settle" }, 5.8)
    .fromTo(stage, { backgroundColor: c.ivory }, { keyframes: { backgroundColor: [c.ivory, c.sage, c.forest, c.emerald] }, duration: 2.0 }, 5.8)
    // Pebbles follow the ground: forest on ivory and sage, ivory on forest, light gold on deep emerald.
    // Same keyframe timing as the background, so each stop lands together.
    .to(stones, { keyframes: { fill: [c.forest, c.forest, c.ivory, c.lightGold] }, duration: 2.0 }, 5.8)
    .to(thread, { stroke: c.lightGold, duration: 1.2 }, 6.6)
    .to(dot, { fill: c.lightGold, duration: 1.2 }, 6.6)
    .to(ground, { stroke: c.darkCard, duration: 1.2 }, 6.6)
    .to(weekText, { fill: c.darkText2, duration: 0.8 }, 6.4);
  if (grain) tl.fromTo(grain, { opacity: 0 }, { opacity: Number(token("--grain-opacity")) || 0.03, duration: 2.0 }, 5.8);

  // Phone and tablet: "Week N of 6" in the lower third; bronze on light, light gold on dark.
  if (counter) tl.to(counter, { keyframes: { color: [c.bronze, c.bronze, c.lightGold, c.lightGold] }, duration: 2.0 }, 5.8);
  if (counterN) {
    tl.eventCallback("onUpdate", () => {
      const week = Math.min(6, Math.max(1, Math.floor((tl.time() - 0.3) / 0.75) + 1));
      if (counterN.textContent !== String(week)) counterN.textContent = String(week);
    });
  }

  // 7.6 → 8.8: the night line settles in. 8.8 → 10: hold.
  if (line) tl.fromTo(line, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, ease: "settle" }, 7.6);
  tl.to({}, { duration: 0.6 }, 8.8);
}

/* ---------------- Why we build it: thread, count-up, stagger ---------------- */
function nightChapter(scrubbed: boolean) {
  const why = $("#why");
  if (!why) return;

  // Sibling stagger reveal, 90ms apart, brand easing.
  const parts = $$(".why__inner > *", why);
  gsap.from(parts, {
    opacity: 0, y: 24, duration: 0.4, ease: "settle", stagger: 0.09,
    scrollTrigger: { trigger: why, start: "top 75%", once: true },
  });

  const thread = $<SVGPathElement>(".why__thread .thread__line", why);
  const dot = $<SVGCircleElement>(".why__thread .thread__dot", why);
  if (thread) {
    gsap.set(thread, { strokeDasharray: "1 2", strokeDashoffset: 1 });
    gsap.set(dot, { opacity: 0 });
    const t = gsap.timeline({
      scrollTrigger: scrubbed
        ? { trigger: ".why__title", start: "top 70%", end: "top 30%", scrub: true }
        : { trigger: ".why__title", start: "top 75%", once: true },
    });
    t.to(thread, { strokeDashoffset: 0, duration: scrubbed ? 1 : 0.4, ease: scrubbed ? "none" : "settle" })
      .to(dot, { opacity: 1, duration: scrubbed ? 0.15 : 0.16 });
  }

  // Count-up of the real study numbers, following the scroll.
  $$<HTMLElement>("[data-count]", why).forEach((el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix ?? "";
    const value = { n: 0 };
    const render = () => { el.textContent = Math.round(value.n).toLocaleString("en-US") + suffix; };
    render();
    gsap.to(value, {
      n: target, ease: "none", onUpdate: render,
      duration: scrubbed ? 1 : 0.4,
      scrollTrigger: scrubbed
        ? { trigger: ".why__stats", start: "top 85%", end: "top 45%", scrub: true }
        : { trigger: ".why__stats", start: "top 85%", once: true },
    });
  });
}

/* ---------------- Return to day: night eases back to ivory as companions arrive ---------------- */
function returnToDay() {
  const section = $("#companions");
  if (!section) return;
  // Through forest and sage, so the change stays green instead of passing through grey.
  gsap.fromTo(section, { backgroundColor: token("--c-emerald") }, {
    keyframes: { backgroundColor: [token("--c-emerald"), token("--c-forest"), token("--c-sage"), token("--c-ivory")] },
    ease: "none",
    scrollTrigger: { trigger: section, start: "top bottom", end: "top 62%", scrub: true },
  });
  gsap.from($$(".companions__head > *", section), {
    opacity: 0, y: 24, duration: 0.4, ease: "settle", stagger: 0.09,
    scrollTrigger: { trigger: section, start: "top 66%", once: true },
  });
  gsap.from($$(".shelf__card", section), {
    opacity: 0, x: 40, duration: 0.4, ease: "settle", stagger: 0.06,
    scrollTrigger: { trigger: ".shelf", start: "top 80%", once: true },
  });
}

/* ---------------- Privacy: the moment card drops into the phone ---------------- */
function privacyDrop() {
  const cards = $$(".phone__card");
  if (!cards.length) return;
  gsap.fromTo(cards, { y: -160, opacity: 0 }, {
    y: 0, opacity: 1, ease: "settle", stagger: 0.35,
    scrollTrigger: { trigger: ".privacy__art", start: "top 85%", end: "center 55%", scrub: true },
  });
}

/* ---------------- Reveals for the light sections ---------------- */
function reveals() {
  $$("[data-reveal-group]").forEach((group) => {
    // Skip groups the cinematic scenes already handle.
    if (group.closest("#companions") && window.__nd.mode === "cinematic") return;
    const items = $$("[data-reveal]", group);
    if (!items.length) return;
    gsap.from(items, {
      opacity: 0, y: 20, duration: 0.4, ease: "settle", stagger: 0.09,
      scrollTrigger: { trigger: group, start: "top 80%", once: true },
    });
  });
  // Rule-extend: hairlines draw across as they enter.
  $$("[data-rule]").forEach((el) => {
    gsap.fromTo(el, { "--rule-x": 0 }, {
      "--rule-x": 1, duration: 0.4, ease: "settle",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });
}
