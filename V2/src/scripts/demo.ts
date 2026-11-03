// The hero moment demo. Three fixed example moments. Nothing is typed by the visitor and nothing is sent.
//
// - Frame 0 (moment 1, complete) is in the HTML, so the first screen never waits for this script.
// - With motion allowed: after a pause it plays moments 2 and 3, typing each one, then returns to 1 and stops.
//   It only runs while the demo is on screen and the tab is visible.
// - The dots switch moments at any time; the pause button stops or restarts the cycle (WCAG 2.2.2).
// - Reduced motion: no autoplay, no typing; the dots switch instantly.

interface Moment { text: string; tag: string; line: string }

const FIRST_WAIT = 3500; // time on frame 0 before the cycle starts
const HOLD = 5200;       // time each complete moment stays up
const TYPE_MS = 30;      // per character
const SETTLE_GAP = 400;  // between the reaction and the companion line

export function startDemo() {
  const fig = document.querySelector<HTMLElement>(".demo");
  if (!fig?.dataset.moments) return;
  const moments: Moment[] = JSON.parse(fig.dataset.moments);
  const q = <T extends HTMLElement = HTMLElement>(sel: string) => fig.querySelector<T>(sel);
  const text = q("[data-demo='text']");
  const textSr = q("[data-demo='text-sr']");
  const tag = q("[data-demo='tag']");
  const line = q("[data-demo='line']");
  const live = q("[data-demo='live']");
  const controls = q("[data-demo='controls']");
  const pauseBtn = q<HTMLButtonElement>("[data-demo='pause']");
  const dots = [...fig.querySelectorAll<HTMLButtonElement>("[data-demo-go]")];
  if (!text || !tag || !line || !controls || !pauseBtn) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  q("[data-demo='static-pips']")?.setAttribute("hidden", "");
  controls.hidden = false;

  let index = 0;
  let playing = !reduce.matches;
  let inView = false;
  let generation = 0;
  let timer = 0;

  const later = (fn: () => void, ms: number) => { timer = window.setTimeout(fn, ms); };
  const clear = () => { window.clearTimeout(timer); generation++; };

  function setDots() {
    dots.forEach((d, i) => {
      d.setAttribute("aria-pressed", String(i === index));
      d.querySelector(".demo__pip")?.classList.toggle("is-on", i === index);
    });
  }
  function setPause() {
    pauseBtn!.setAttribute("aria-label", playing ? "Pause the examples" : "Play the examples");
    pauseBtn!.querySelector<HTMLElement>("[data-icon='pause']")!.hidden = !playing;
    pauseBtn!.querySelector<HTMLElement>("[data-icon='play']")!.hidden = playing;
  }

  function show(i: number, animate: boolean) {
    clear();
    const gen = generation;
    index = i;
    const m = moments[i];
    setDots();
    if (textSr) textSr.textContent = m.text;

    if (!animate || reduce.matches) {
      fig!.classList.remove("is-typing");
      text!.textContent = m.text;
      tag!.textContent = m.tag;
      line!.textContent = m.line;
      tag!.classList.remove("is-waiting");
      line!.classList.remove("is-waiting");
      schedule();
      return;
    }

    // Fade the old reaction out, type the new moment, then settle the reaction and the line in.
    fig!.classList.add("is-typing");
    later(() => {
      if (gen !== generation) return;
      tag!.textContent = m.tag;
      line!.textContent = m.line;
      tag!.classList.add("is-waiting");
      line!.classList.add("is-waiting");
      fig!.classList.remove("is-typing");
      let n = 0;
      const type = () => {
        if (gen !== generation) return;
        n++;
        text!.textContent = m.text.slice(0, n);
        if (n < m.text.length) { later(type, TYPE_MS); return; }
        later(() => {
          if (gen !== generation) return;
          tag!.classList.remove("is-waiting");
          later(() => {
            if (gen !== generation) return;
            line!.classList.remove("is-waiting");
            schedule();
          }, SETTLE_GAP);
        }, 200);
      };
      text!.textContent = "";
      later(type, 160);
    }, 260);
  }

  function schedule(wait = HOLD) {
    window.clearTimeout(timer);
    if (!playing || !inView || document.hidden || reduce.matches) return;
    const gen = generation;
    later(() => {
      if (gen !== generation) return;
      const next = (index + 1) % moments.length;
      if (next === 0) { playing = false; setPause(); }   // one full cycle, then stop on moment 1
      show(next, true);
    }, wait);
  }

  dots.forEach((d) => d.addEventListener("click", () => {
    live?.setAttribute("aria-live", "polite");
    playing = false;
    setPause();
    show(Number(d.dataset.demoGo), false);
  }));
  pauseBtn.addEventListener("click", () => {
    playing = !playing;
    setPause();
    if (playing) { live?.setAttribute("aria-live", "off"); schedule(800); }
    else clear();
  });

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) schedule(index === 0 ? FIRST_WAIT : HOLD);
    else window.clearTimeout(timer);
  }, { threshold: 0.5 }).observe(fig);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); else window.clearTimeout(timer); });
  reduce.addEventListener("change", () => { playing = !reduce.matches && playing; setPause(); show(index, false); });

  setPause();
}
