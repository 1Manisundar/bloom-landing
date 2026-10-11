// The preloader. Its counter follows real work: every promise handed to track() moves it forward when it
// settles. The number on screen eases toward that real value; it never runs ahead of it.

const NEURONS = 12;
/** A slow font must not hold the page hostage: the fallback stack is good enough to read. */
const GIVE_UP_MS = 10_000;

export interface Preloader {
  /** Count this piece of loading work. A rejection still counts as settled. */
  track<T>(work: Promise<T>, weight?: number): Promise<T>;
  /** For work that can say how far along it is: returns a function to call with 0 to 1 as it goes. */
  progress(weight?: number): (fraction: number) => void;
  /** Call once everything has been handed to track() or progress(). */
  seal(): void;
  /** Resolves when the work is done and the screen has shown it. */
  finished: Promise<void>;
}

export function startPreloader(reduced: boolean): Preloader {
  const root = document.getElementById("preloader");
  const count = document.getElementById("preloader-count");
  const row = document.getElementById("preloader-neurons");

  const dots: HTMLElement[] = [];
  if (row) {
    for (let i = 0; i < NEURONS; i++) {
      const dot = document.createElement("span");
      row.appendChild(dot);
      dots.push(dot);
    }
  }

  let total = 0;
  let settled = 0;
  let sealed = false;
  let shown = 0;
  let over = false;
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => { finish = resolve; });

  const real = () => (total === 0 ? (sealed ? 100 : 0) : (settled / total) * 100);

  const paint = () => {
    const n = Math.round(shown);
    if (count) count.textContent = String(n);
    const lit = Math.round((shown / 100) * NEURONS);
    dots.forEach((dot, i) => dot.classList.toggle("is-on", i < lit));
  };

  const end = () => {
    if (over) return;
    over = true;
    shown = 100;
    paint();
    root?.classList.add("is-done");
    document.documentElement.classList.remove("is-loading");
    finish();
  };

  const frame = () => {
    if (over) return;
    const target = real();
    shown = reduced ? target : Math.min(target, shown + Math.max(0.6, (target - shown) * 0.14));
    paint();
    if (sealed && settled >= total - 1e-6 && shown >= 99.5) end();
    else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  window.setTimeout(end, GIVE_UP_MS);

  return {
    track(work, weight = 1) {
      total += weight;
      const done = () => { settled += weight; };
      work.then(done, done);
      return work;
    },
    progress(weight = 1) {
      total += weight;
      let reported = 0;
      return (fraction) => {
        const next = Math.min(1, Math.max(reported, fraction));
        settled += weight * (next - reported);
        reported = next;
      };
    },
    seal() { sealed = true; },
    finished,
  };
}
