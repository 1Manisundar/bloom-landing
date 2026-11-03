// Scroll-frame strips of every pinned scene: a frame at every 10% of its hold, at 1440x900, 1366x768
// and 390x844, plus the same views with reduced motion (the stacked page) and one short viewport.
// Also strips the scroll-linked night chapter and the return to day (not pinned, but scroll-driven).
// Usage: npm run build && node scripts/scenes.mjs <folder>     (writes to shots/<folder>/scenes/)
//
// Checks while it runs: the scene's text and chart stay inside the screen, the chart never overlaps
// the night line, and nothing is cut off at the end frame.

import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { serveStatic } from "./lib/serve.mjs";

const folder = process.argv[2] ?? "latest";
const OUT = resolve("shots", folder, "scenes");
const VIEWS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "phone", width: 390, height: 844, mobile: true },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];

await mkdir(OUT, { recursive: true });
const server = await serveStatic({ port: 4341 });
const url = `${server.origin}/`;
const browser = await chromium.launch({ channel: "chrome" });

async function newPage(view, reducedMotion = "no-preference", height = view.height) {
  const context = await browser.newContext({
    viewport: { width: view.width, height },
    deviceScaleFactor: 1,
    isMobile: Boolean(view.mobile),
    hasTouch: Boolean(view.mobile),
    reducedMotion,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(`${view.name}: page error: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.location().url)) problems.push(`${view.name}: console: ${m.text()}`); });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__nd?.ready);
  await sleep(300);
  return { page, context };
}

async function sheet(title, frames, file, cols) {
  // A contact sheet of frames with their labels, rendered by the browser itself.
  const imgs = await Promise.all(frames.map(async (f) => ({ label: f.label, src: `data:image/jpeg;base64,${(await readFile(f.path)).toString("base64")}` })));
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:24px;background:#e9e6df;font:14px system-ui,sans-serif;color:#222}
    h1{font-size:18px;margin:0 0 16px} .g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:14px}
    figure{margin:0} img{width:100%;display:block;border:1px solid #bbb} figcaption{padding:4px 0}
  </style><h1>${title}</h1><div class="g">${imgs.map((i) => `<figure><img src="${i.src}"><figcaption>${i.label}</figcaption></figure>`).join("")}</div>`);
  await page.waitForLoadState("load");
  await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 82 });
  await page.close();
}

try {
  for (const view of VIEWS) {
    const { page, context } = await newPage(view);
    const mode = await page.evaluate(() => window.__nd.mode);
    if (mode !== "cinematic") problems.push(`${view.name}: expected cinematic mode, got ${mode}`);
    const scenes = await page.evaluate(() => window.__nd.scenes);
    if (!scenes.length) problems.push(`${view.name}: no pinned scenes registered`);

    for (const scene of scenes) {
      const frames = [];
      for (let p = 0; p <= 100; p += 10) {
        await page.evaluate((y) => window.__nd.jump(y), scene.start + ((scene.end - scene.start) * p) / 100);
        await sleep(350);
        const path = resolve(OUT, `${view.name}-${scene.id}-${String(p).padStart(3, "0")}.jpg`);
        await page.screenshot({ path, type: "jpeg", quality: 80 });
        frames.push({ path, label: `${p}%` });

        // Fit checks on the frame.
        const fit = await page.evaluate(() => {
          const r = (s) => document.querySelector(s)?.getBoundingClientRect();
          const fig = r("#weeks .pebbles"), line = r("#weeks .weeks__line"), copy = r("#weeks .weeks__copy");
          return { vh: innerHeight, vw: innerWidth, fig, line, copy, lineOpacity: Number(getComputedStyle(document.querySelector("#weeks .weeks__line")).opacity) };
        });
        if (fit.fig && (fit.fig.bottom > fit.vh || fit.fig.right > fit.vw + 1)) problems.push(`${view.name} ${p}%: the chart runs off the screen`);
        if (fit.line && fit.lineOpacity > 0.05 && fit.line.bottom > fit.vh) problems.push(`${view.name} ${p}%: the night line is cut off`);
        if (fit.fig && fit.line && fit.lineOpacity > 0.05 && fit.fig.bottom > fit.line.top) problems.push(`${view.name} ${p}%: the chart overlaps the night line (${Math.round(fit.fig.bottom - fit.line.top)}px)`);
        if (p === 0 && fit.copy && fit.copy.top < 0) problems.push(`${view.name}: the scene's text starts above the screen`);
      }
      await sheet(`${scene.id} · ${view.name} ${view.width}x${view.height} · every 10% of the pin`, frames, resolve(OUT, `strip-${scene.id}-${view.name}.jpg`), view.mobile ? 6 : 4);
    }

    // The scroll-linked night chapter and the return to day: 10 frames from Why entering to the shelf settled.
    const range = await page.evaluate(() => {
      const top = (s) => document.querySelector(s).getBoundingClientRect().top + scrollY;
      return { from: top("#why") - innerHeight * 0.6, to: top("#companions") + innerHeight * 0.2 };
    });
    const frames = [];
    for (let i = 0; i <= 10; i++) {
      await page.evaluate((y) => window.__nd.jump(y), range.from + ((range.to - range.from) * i) / 10);
      await sleep(i === 0 ? 300 : 700);
      const path = resolve(OUT, `${view.name}-night-${String(i * 10).padStart(3, "0")}.jpg`);
      await page.screenshot({ path, type: "jpeg", quality: 80 });
      frames.push({ path, label: `${i * 10}%` });
    }
    await sheet(`night chapter → return to day · ${view.name} ${view.width}x${view.height}`, frames, resolve(OUT, `strip-night-${view.name}.jpg`), view.mobile ? 6 : 4);
    await context.close();

    // Reduced motion: no pins, the stacked page. Shots at the Over weeks section and the night chapter.
    const reduced = await newPage(view, "reduce");
    const rmode = await reduced.page.evaluate(() => window.__nd.mode);
    if (rmode !== "reduced") problems.push(`${view.name} reduced: expected reduced mode, got ${rmode}`);
    const pinned = await reduced.page.evaluate(() => document.querySelectorAll(".pin-spacer").length);
    if (pinned) problems.push(`${view.name} reduced: ${pinned} pinned element(s) with reduced motion`);
    const rframes = [];
    for (const [id, label] of [["#weeks", "Over weeks (stacked)"], ["#weeks .weeks__night", "night line"], ["#why", "Why we're building it"], ["#companions", "companions"]]) {
      await reduced.page.evaluate((s) => {
        const el = document.querySelector(s);
        const h = document.querySelector(".site-header").getBoundingClientRect().height;
        window.scrollTo(0, el.getBoundingClientRect().top + scrollY - h);
      }, id);
      await sleep(250);
      const path = resolve(OUT, `${view.name}-reduced-${rframes.length}.jpg`);
      await reduced.page.screenshot({ path, type: "jpeg", quality: 80 });
      rframes.push({ path, label });
    }
    await sheet(`reduced motion · ${view.name} ${view.width}x${view.height} · stacked, no pins`, rframes, resolve(OUT, `strip-reduced-${view.name}.jpg`), 4);
    await reduced.context.close();
  }

  // A short laptop (under 700px tall) must fall back to the stacked page too.
  const short = await newPage({ name: "short", width: 1366, height: 650 });
  const smode = await short.page.evaluate(() => window.__nd.mode);
  const spins = await short.page.evaluate(() => document.querySelectorAll(".pin-spacer").length);
  if (smode !== "stacked" || spins) problems.push(`short 1366x650: expected stacked with no pins, got ${smode} with ${spins} pin(s)`);
  await short.context.close();
} finally {
  await browser.close();
  await server.stop();
}

console.log(`Scene frames: ${OUT}`);
console.log(problems.length ? `Problems (${problems.length}):\n- ${problems.join("\n- ")}` : "No problems seen.");
process.exit(problems.length ? 1 : 0);
