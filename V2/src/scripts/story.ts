// The pinned story: scroll progress through #story drives four chapters on one phone.
// Pinned only with motion allowed and a screen at least 600px tall (same query as the CSS).
// Otherwise the chapters stay stacked in their final state and nothing here runs per frame.

import { onFrame, pinQ } from "./page";

const st = document.getElementById("story");
const stage = document.getElementById("stStage");

if (st && stage) {
  const $$ = <T extends Element = HTMLElement>(sel: string) => [...st.querySelectorAll<T>(sel)];
  const txts = $$(".st-txt"), scrs = $$(".scr"), dots = $$(".st-dots i");
  const pebs = $$(".peb"), nodes = $$<SVGGElement>(".map__node"), links = $$<SVGPathElement>(".map__link");
  const chain = st.querySelector<HTMLElement>(".chain"), lis = $$(".chain li"), marks = $$(".strip i");
  const devs = $$(".st-dev");
  const animated: Array<HTMLElement | SVGElement> = [...txts, ...scrs, ...pebs, ...nodes, ...lis, ...marks];

  const smooth = (x: number) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const show = (el: HTMLElement | SVGElement, v: number, dy: number) => {
    el.style.opacity = v.toFixed(3);
    el.style.transform = `translate3d(0,${((1 - v) * dy).toFixed(1)}px,0)`;
  };

  /* The phone is designed at 320 × 660 and scales down to the space it has, never cut off. */
  function fit() {
    const dev = devs[0];
    if (!dev) return;
    const w = dev.clientWidth;
    const s = pinQ.matches ? Math.min(1, (dev.clientHeight - 20) / 660, (w - 24) / 320) : Math.min(1, (w - 24) / 320);
    st!.style.setProperty("--s", Math.max(0.3, s).toFixed(3));
  }

  function draw(ps: number) {
    const c = Math.min(3.999, ps * 4);
    for (let i = 0; i < 4; i++) {
      const l = c - i;
      const v = i === 0 ? 1 - smooth((l - 0.82) / 0.18)
        : i === 3 ? smooth((l + 0.18) / 0.18)
        : smooth((l + 0.18) / 0.18) * (1 - smooth((l - 0.82) / 0.18));
      show(txts[i], v, i === 0 && l < 0 ? 0 : 24);
      scrs[i].style.opacity = v.toFixed(3);
      scrs[i].style.transform = `scale(${(0.96 + 0.04 * v).toFixed(3)})`;
      dots[i]?.classList.toggle("on", Math.floor(c) === i);
    }
    // 02: pebbles drop in, month by month.
    const l1 = c - 1, n = pebs.length;
    pebs.forEach((p, k) => {
      const t = smooth((l1 * 1.6 + 0.1 - (k / n) * 0.9) / 0.18);
      p.style.opacity = t.toFixed(2);
      p.style.transform = `translateY(${((1 - t) * -60).toFixed(1)}px)`;
    });
    // 03: areas pop in around "You", then the gold lines draw.
    const l2 = c - 2;
    nodes.forEach((g, k) => {
      const t = smooth((l2 + 0.1 - k * 0.04) / 0.25);
      g.style.opacity = t.toFixed(2);
      g.style.transform = `scale(${(0.6 + 0.4 * t).toFixed(3)})`;
    });
    links.forEach((q, k) => { q.style.strokeDashoffset = (1 - smooth((l2 - 0.3 - k * 0.06) / 0.3)).toFixed(3); });
    // 04: the if–then chain builds along the gold line, then the strip fills.
    const l3 = c - 3;
    chain?.style.setProperty("--th", smooth((l3 + 0.05) / 0.6).toFixed(3));
    lis.forEach((li, k) => show(li, smooth((l3 + 0.12 - k * 0.13) / 0.15), 10));
    marks.forEach((d, k) => { d.style.transform = `scale(${smooth((l3 - 0.5 - k * 0.05) / 0.12).toFixed(3)})`; });
  }

  function clear() {
    for (const el of animated) { el.style.opacity = ""; el.style.transform = ""; }
    for (const q of links) q.style.strokeDashoffset = "";
    chain?.style.removeProperty("--th");
    dots.forEach((d) => d.classList.remove("on"));
  }

  const progress = () => {
    const r = st.getBoundingClientRect(), h = st.offsetHeight - stage.offsetHeight;
    return h > 0 ? Math.max(0, Math.min(1, -r.top / h)) : 0;
  };

  let ps = 0;
  function start() {
    fit();
    if (pinQ.matches) { ps = progress(); draw(ps); } else clear();
  }
  start();
  pinQ.addEventListener("change", start);
  window.addEventListener("resize", fit, { passive: true });
  document.fonts?.ready.then(fit);

  let target = 0, onScreen = false;
  onFrame({
    read() {
      if (!pinQ.matches) return;
      // Paused while the story is off screen.
      const r = st.getBoundingClientRect();
      onScreen = !(r.bottom < -50 || r.top > window.innerHeight + 50);
      if (onScreen) target = progress();
    },
    write(dt) {
      if (!pinQ.matches || !onScreen || Math.abs(target - ps) < 0.0004) return;
      ps += (target - ps) * Math.min(1, dt * 8);
      draw(ps);
    },
  });

  /* Mira waves for 5 seconds once she is on screen, then holds the still pose: moving content longer
     than 5 seconds needs a way to stop it (WCAG 2.2.2), and a short wave needs none. */
  const mira = st.querySelector<HTMLImageElement>(".mira");
  if (mira?.dataset.still && "IntersectionObserver" in window) {
    const still = mira.dataset.still;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      window.setTimeout(() => { mira.src = still; }, 5000);
    });
    io.observe(mira);
  }
}
