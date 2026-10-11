// Screenshots of every chapter at desktop and phone size, for checking the page by eye.
// Usage: npm run shots [-- <folder name>]   (builds first; writes to shots/<folder name>/)
//
// It serves the built site itself, drives the installed Chrome, and prints anything that looks wrong:
// console errors, failed requests, sideways scrolling.

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { preview } from "vite";

const OUT = resolve("shots", process.argv[2] ?? "latest");
const VIEWS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844, mobile: true },
  // Not asked for, but the commonest small laptop: it is where a tall chapter would run out of room.
  { name: "laptop", width: 1366, height: 768 },
];
const CHAPTERS = ["hero", "noise", "sense", "graph", "mirror", "reflect", "practice", "today", "private", "begin"];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const problems = [];

await mkdir(OUT, { recursive: true });
const server = await preview({ preview: { port: 4179, strictPort: false }, logLevel: "warn" });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ channel: "chrome" });

try {
  for (const view of VIEWS) {
    const context = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      deviceScaleFactor: view.mobile ? 2 : 1,
      isMobile: Boolean(view.mobile),
      hasTouch: Boolean(view.mobile),
    });
    const page = await context.newPage();
    page.on("console", (msg) => { if (msg.type() === "error") problems.push(`${view.name}: console: ${msg.text()}`); });
    page.on("pageerror", (err) => problems.push(`${view.name}: page error: ${err.message}`));
    page.on("requestfailed", (req) => problems.push(`${view.name}: request failed: ${req.url()}`));

    // Hold the fonts back a little, each a bit longer than the last, so the preloader can be caught mid-count.
    let held = 0;
    await page.route("**/*.woff2", async (route) => { await sleep(500 + 350 * held++); await route.continue(); });

    await page.goto(url, { waitUntil: "commit" });
    await page.waitForFunction(() => Number(document.getElementById("preloader-count")?.textContent) >= 35, null, { timeout: 15000 });
    await page.screenshot({ path: resolve(OUT, `${view.name}-00-preloader.png`) });
    await page.evaluate(() => window.__nd.ready);
    await sleep(1800);

    let n = 1;
    for (const id of CHAPTERS) {
      // A chapter taller than the screen (the phone layout does not pin its text) is shot at its start and its end.
      const tall = await page.evaluate((cid) => {
        const el = document.getElementById(cid);
        const pinned = getComputedStyle(el.querySelector(".chapter__stick")).position === "sticky";
        return !pinned && el.offsetHeight > window.innerHeight * 1.25;
      }, id);
      const stops = tall ? [["a", 0], ["b", 1]] : [["", id === "hero" ? 0 : 0.5]];
      for (const [suffix, t] of stops) {
        await page.evaluate(([cid, at]) => window.__nd.scroll.jump(cid, at), [id, t]);
        await sleep(1700);
        await page.screenshot({ path: resolve(OUT, `${view.name}-${String(n).padStart(2, "0")}-${id}${suffix}.png`) });
      }
      n++;
    }

    // The waitlist's honest states, and the sound toggle switched on.
    await page.fill("#waitlist-email", "not-an-email");
    await page.click("#waitlist-submit");
    await sleep(300);
    await page.screenshot({ path: resolve(OUT, `${view.name}-10-waitlist-invalid.png`) });
    await page.fill("#waitlist-email", "someone@example.com");
    await page.click("#waitlist-submit");
    await sleep(300);
    await page.screenshot({ path: resolve(OUT, `${view.name}-11-waitlist-not-open.png`) });
    const status = await page.textContent("#waitlist-status");
    if (/on the list\.$/.test(status ?? "")) problems.push(`${view.name}: the waitlist claimed success with no endpoint`);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await sleep(1200);
    await page.screenshot({ path: resolve(OUT, `${view.name}-12-footer.png`) });

    await page.evaluate(() => window.__nd.scroll.jump("hero", 0));
    await page.click("#sound");
    await sleep(500);
    await page.screenshot({ path: resolve(OUT, `${view.name}-13-sound-on.png`) });
    if ((await page.getAttribute("#sound", "aria-pressed")) !== "true") problems.push(`${view.name}: the sound toggle did not report "on"`);

    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (sideways > 1) problems.push(`${view.name}: the page scrolls sideways by ${sideways}px`);

    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((done) => server.httpServer.close(done));
}

console.log(`Screenshots: ${OUT}`);
console.log(problems.length ? `Problems (${problems.length}):\n- ${problems.join("\n- ")}` : "No problems seen.");
process.exit(problems.length ? 1 : 0);
