// Checks the 3D world: screenshots along the scroll, and frames per second at each stop.
// Usage: npm run world [-- <folder name>] [--headed] [--all]
//
//   --headed  open a real Chrome window (use it when headless Chrome falls back to software drawing)
//   --all     stop at every chapter instead of the five standard positions
//
// The phone profile is a 390x844 screen at 3x with the processor slowed four times, the usual stand-in for
// a mid-range phone. It measures this machine's graphics card, so read it as a guide, not as a phone.
// Frames are counted in step with the screen, so no number can be higher than the screen's refresh rate.

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { preview } from "vite";

const args = process.argv.slice(2);
const headed = args.includes("--headed");
const all = args.includes("--all");
const OUT = resolve("shots", args.find((a) => !a.startsWith("--")) ?? "world");

const FIVE = [["hero", 0], ["sense", 0.3], ["graph", 0.3], ["mirror", 0.3], ["begin", 0.5]];
const EVERY = [["hero", 0], ["noise", 0.3], ["sense", 0.3], ["sense", 1, "sense-to-graph"], ["graph", 0.3], ["mirror", 0.3], ["reflect", 0.3], ["practice", 0.3], ["today", 0.3], ["private", 0.3], ["begin", 0.5]];
const STOPS = all ? EVERY : FIVE;
const VIEWS = [
  { name: "desktop", width: 1440, height: 900, scale: 1 },
  { name: "phone", width: 390, height: 844, scale: 3, mobile: true, cpu: 4 },
];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
await mkdir(OUT, { recursive: true });
const server = await preview({ preview: { port: 4187, strictPort: false }, logLevel: "warn" });
const browser = await chromium.launch({
  channel: "chrome",
  headless: !headed,
  args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"],
});

const report = [];
const problems = [];
try {
  for (const view of VIEWS) {
    const context = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      deviceScaleFactor: view.scale,
      isMobile: Boolean(view.mobile),
      hasTouch: Boolean(view.mobile),
    });
    const page = await context.newPage();
    page.on("console", (msg) => { if (msg.type() === "error" || msg.type() === "warning") problems.push(`${view.name}: ${msg.type()}: ${msg.text()}`); });
    page.on("pageerror", (err) => problems.push(`${view.name}: page error: ${err.message}`));

    await page.goto(server.resolvedUrls.local[0]);
    await page.evaluate(() => window.__nd.ready);
    const started = await page.evaluate(async () => Boolean(await window.__nd.world));
    if (!started) { problems.push(`${view.name}: the world did not start`); await context.close(); continue; }
    if (view.cpu) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: view.cpu });
    }
    await sleep(2500);

    let n = 1;
    for (const [id, t, label = id] of STOPS) {
      await page.evaluate(([cid, at]) => window.__nd.scroll.jump(cid, at), [id, t]);
      await sleep(3200);
      await page.screenshot({ path: resolve(OUT, `${view.name}-${String(n).padStart(2, "0")}-${label}.png`) });
      // Count frames over three seconds with the page's own clock, while still.
      const still = await page.evaluate(() => new Promise((done) => {
        let frames = 0; const t0 = performance.now();
        const tick = (now) => { frames++; if (now - t0 < 3000) requestAnimationFrame(tick); else done((frames * 1000) / (now - t0)); };
        requestAnimationFrame(tick);
      }));
      report.push({ view: view.name, stop: label, fps: Math.round(still * 10) / 10, ...(await page.evaluate(async () => (await window.__nd.world).stats())) });
      n++;
    }

    // And while moving: a steady scroll from the top to the bottom of the story.
    await page.evaluate(() => window.__nd.scroll.jump("hero", 0));
    await sleep(1200);
    const moving = await page.evaluate(() => new Promise((done) => {
      const end = document.documentElement.scrollHeight - window.innerHeight, t0 = performance.now(), length = 14000;
      let frames = 0, worst = 0, prev = t0;
      const tick = (now) => {
        frames++; worst = Math.max(worst, now - prev); prev = now;
        const k = Math.min(1, (now - t0) / length);
        window.scrollTo(0, end * k);
        if (k < 1) requestAnimationFrame(tick); else done({ fps: (frames * 1000) / (now - t0), worst });
      };
      requestAnimationFrame(tick);
    }));
    report.push({ view: view.name, stop: "scrolling the whole story", fps: Math.round(moving.fps * 10) / 10, worstFrameMs: Math.round(moving.worst), ...(await page.evaluate(async () => (await window.__nd.world).stats())) });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((done) => server.httpServer.close(done));
}

await writeFile(resolve(OUT, "fps.json"), JSON.stringify(report, null, 2));
console.log(`Screenshots and fps.json: ${OUT}  (${headed ? "headed" : "headless"} Chrome)`);
for (const row of report) {
  console.log(`${row.view.padEnd(8)} ${String(row.stop).padEnd(26)} ${String(row.fps).padStart(5)} fps${row.worstFrameMs ? `  worst frame ${row.worstFrameMs} ms` : ""}  |  ratio ${row.pixelRatio}  bloom ${row.bloom ? "on" : "off"}  ${row.particles} particles  ${row.running ? "" : "STOPPED"}`);
}
if (report[0]) console.log(`Drawn by: ${report[0].gpu}`);
console.log(problems.length ? `Problems (${problems.length}):\n- ${[...new Set(problems)].join("\n- ")}` : "No problems seen.");
