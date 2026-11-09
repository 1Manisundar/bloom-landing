// Page-wide motion: Lenis smooth scroll (wheel only), the page colour that follows the scroll,
// the header height, the phone menu, in-page links, reveals and the count-up.
// One requestAnimationFrame loop drives everything; other scripts add to it with onFrame().
// Every hidden starting state is set here, in script, so nothing is hidden if this file fails.

import Lenis from "lenis";

const root = document.documentElement;
const reduceQ = window.matchMedia("(prefers-reduced-motion: reduce)");
/** Pinned story and smooth scroll: motion allowed and a screen at least 600px tall. */
export const pinQ = window.matchMedia("(prefers-reduced-motion: no-preference) and (min-height: 600px)");

interface ND { lenis: Lenis | null; ready: Promise<void>; jump: (y: number) => void }
declare global { interface Window { __nd: ND } }
let markReady: () => void = () => {};
window.__nd = {
  lenis: null,
  ready: new Promise<void>((done) => { markReady = done; }),
  jump: (y) => { if (window.__nd.lenis) window.__nd.lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); },
};

/* ---------------- Frame loop ---------------- */
type Tick = (now: number, dt: number) => void;
const ticks: Tick[] = [];
export function onFrame(fn: Tick) { ticks.push(fn); }
let last = performance.now();
function frame(now: number) {
  requestAnimationFrame(frame);
  window.__nd.lenis?.raf(now);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  paint(false);
  for (const t of ticks) t(now, dt);
}

/* ---------------- Header height ---------------- */
const nav = document.getElementById("nav");
const navH = () => nav?.offsetHeight ?? 0;
function measureNav() { root.style.setProperty("--navh", `${navH()}px`); }
measureNav();
window.addEventListener("resize", measureNav, { passive: true });

/* ---------------- Smooth scroll (Lenis on wheel; touch stays native) ---------------- */
function setLenis() {
  const want = pinQ.matches;
  if (want && !window.__nd.lenis) window.__nd.lenis = new Lenis({ lerp: 0.085, smoothWheel: true, syncTouch: false, autoRaf: false });
  if (!want && window.__nd.lenis) { window.__nd.lenis.destroy(); window.__nd.lenis = null; }
}
setLenis();
pinQ.addEventListener("change", () => { setLenis(); collect(); paint(true); });

/* ---------------- Page colour that follows the scroll ----------------
   Each section carries data-bg / data-fg (brand token names). While a section moves up, the page
   blends from the colour before it to its colour: from its top at 88% of the screen to 52%,
   with smoothstep, then a small lag (0.14 per frame). The header reads the same --pbg / --pfg. */
const smooth = (x: number) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
function tokenRGB(name: string): number[] {
  const hex = getComputedStyle(root).getPropertyValue(`--c-${name}`).trim().replace("#", "");
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
interface Sec { el: HTMLElement; bg: number[]; fg: number[] }
let secs: Sec[] = [];
function collect() {
  // Pinned story: the four marks inside it. Stacked story: the chapters themselves.
  const pinned = pinQ.matches;
  secs = [...document.querySelectorAll<HTMLElement>("[data-bg]")]
    .filter((el) => (pinned ? !el.hasAttribute("data-stack-mark") : !el.hasAttribute("data-pin-mark")))
    .map((el) => ({ el, bg: tokenRGB(el.dataset.bg!), fg: tokenRGB(el.dataset.fg ?? "ink") }));
}
collect();
const cur = { bg: secs[0]?.bg.slice() ?? [0, 0, 0], fg: secs[0]?.fg.slice() ?? [0, 0, 0] };
let shown = "";
function paint(snap: boolean) {
  if (!secs.length) return;
  const vh = window.innerHeight, nav = navH();
  const bg = secs[0].bg.slice(), fg = secs[0].fg.slice();
  let prevTop = secs[0].el.getBoundingClientRect().top;
  for (let i = 1; i < secs.length; i++) {
    const top = secs[i].el.getBoundingClientRect().top;
    const raw = smooth((vh * 0.88 - top) / (vh * 0.36));
    if (raw <= 0) break;
    // A section shorter than the screen must keep its colour while its top is still under the header
    // (a menu jump lands there), so the next colour waits until the previous section has scrolled up.
    // Tall sections have long passed the header by then, so this changes nothing for them.
    const k = raw * smooth((nav - prevTop) / (vh * 0.3));
    prevTop = top;
    for (let c = 0; c < 3; c++) { bg[c] += (secs[i].bg[c] - bg[c]) * k; fg[c] += (secs[i].fg[c] - fg[c]) * k; }
  }
  const f = snap || reduceQ.matches ? 1 : 0.14;
  for (let c = 0; c < 3; c++) { cur.bg[c] += (bg[c] - cur.bg[c]) * f; cur.fg[c] += (fg[c] - cur.fg[c]) * f; }
  const b = `rgb(${cur.bg.map(Math.round)})`, t = `rgb(${cur.fg.map(Math.round)})`;
  if (b + t === shown) return;
  shown = b + t;
  root.style.setProperty("--pbg", b);
  root.style.setProperty("--pfg", t);
}
paint(true);

/* ---------------- Phone menu ---------------- */
const menuBtn = document.getElementById("menuBtn");
const drop = document.getElementById("dropMenu");
function setMenu(open: boolean) {
  if (!menuBtn || !drop) return;
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  drop.hidden = !open;
  measureNav();
}
menuBtn?.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
drop?.addEventListener("click", (e) => { if ((e.target as Element).closest("a")) setMenu(false); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menuBtn?.getAttribute("aria-expanded") === "true") { setMenu(false); menuBtn.focus(); }
});

/* ---------------- In-page links ----------------
   One offset only: the measured header height (also scroll-padding-top in CSS for native jumps).
   After the jump, focus moves to the section's heading. */
function targetY(el: HTMLElement) {
  if (el.id === "top") return 0;
  return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - navH()));
}
function focusHeading(section: HTMLElement) {
  const target = section.querySelector<HTMLElement>("h1, h2") ?? section;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}
function goTo(section: HTMLElement, animate: boolean) {
  const arrive = () => {
    const y = targetY(section);
    if (Math.abs(window.scrollY - y) > 1) window.__nd.jump(y);
    focusHeading(section);
  };
  const lenis = window.__nd.lenis;
  if (lenis && animate) { lenis.scrollTo(targetY(section), { duration: 1.4, onComplete: arrive }); return; }
  window.__nd.jump(targetY(section));
  arrive();
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
  goTo(section, !reduceQ.matches);
});
window.addEventListener("popstate", () => {
  const section = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (section) goTo(section, false);
});

/* ---------------- Reveals and count-up (only below the first screen) ---------------- */
if (!reduceQ.matches && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.remove("wait"); io.unobserve(en.target); }
  }, { threshold: 0.12 });
  for (const el of document.querySelectorAll<HTMLElement>(".rise")) {
    if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add("wait"); io.observe(el); }
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-count]")) {
    if (el.getBoundingClientRect().top < window.innerHeight) continue;
    const to = Number(el.dataset.count), suffix = el.dataset.suffix ?? "", final = el.textContent;
    const o = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      o.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min((t - t0) / 1400, 1);
        el.textContent = p < 1 ? Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US") + suffix : final;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    o.observe(el);
  }
}

/* ---------------- Start ---------------- */
requestAnimationFrame(frame);
const settle = () => { measureNav(); collect(); paint(true); };
document.fonts?.ready.then(settle);
window.addEventListener("load", settle);
window.addEventListener("resize", () => { collect(); }, { passive: true });
requestAnimationFrame(() => {
  const section = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (section) goTo(section, false);
  markReady();
});
