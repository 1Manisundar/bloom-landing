// Screenshots of every section at phone, laptop and desktop size, for checking the page by eye.
// Usage: npm run shots -- <phase>   (builds first; writes to shots/<phase>/)
//        add --reduced to also shoot with prefers-reduced-motion: reduce
//
// It serves the built site itself, drives the installed Chrome, and prints anything that looks wrong:
// console errors, failed requests, sideways scrolling, missing fonts, a waitlist that claims success.

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { preview } from "astro";

const args = process.argv.slice(2);
const phase = args.find((a) => !a.startsWith("--")) ?? "latest";
const OUT = resolve("shots", phase);
const VIEWS = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "laptop", width: 1366, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
];
const SECTIONS = ["top", "how", "patterns", "weeks", "why", "companions", "privacy", "founders", "join", "footer"];
const MOTION = args.includes("--reduced") ? ["no-preference", "reduce"] : ["no-preference"];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const problems = [];

await mkdir(OUT, { recursive: true });
const server = await preview({ root: process.cwd(), server: { port: 4329, host: "127.0.0.1" }, logLevel: "warn" });
const url = `http://127.0.0.1:${server.port}/`;
const browser = await chromium.launch({ channel: "chrome" });

try {
  for (const motion of MOTION) {
    for (const view of VIEWS) {
      const tag = motion === "reduce" ? `${view.name}-reduced` : view.name;
      const context = await browser.newContext({
        viewport: { width: view.width, height: view.height },
        deviceScaleFactor: view.mobile ? 2 : 1,
        isMobile: Boolean(view.mobile),
        hasTouch: Boolean(view.mobile),
        reducedMotion: motion,
      });
      const page = await context.newPage();
      page.on("console", (msg) => { if (msg.type() === "error") problems.push(`${tag}: console: ${msg.text()}`); });
      page.on("pageerror", (err) => problems.push(`${tag}: page error: ${err.message}`));
      page.on("requestfailed", (req) => problems.push(`${tag}: request failed: ${req.url()}`));
      page.on("response", (res) => { if (res.status() >= 400) problems.push(`${tag}: HTTP ${res.status()}: ${res.url()}`); });

      await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await sleep(400);

      // First screen exactly as a visitor lands on it.
      await page.screenshot({ path: resolve(OUT, `${tag}-00-first-screen.png`) });

      // Each section whole, with the sticky header hidden so it does not cover the top edge.
      await page.addStyleTag({ content: ".site-header{visibility:hidden!important}" });
      let n = 1;
      for (const id of SECTIONS) {
        const el = page.locator(`#${id}`);
        if ((await el.count()) === 0) { problems.push(`${tag}: section #${id} missing`); continue; }
        await el.scrollIntoViewIfNeeded();
        await sleep(250);
        await el.screenshot({ path: resolve(OUT, `${tag}-${String(n).padStart(2, "0")}-${id}.png`) });
        n++;
      }
      await page.addStyleTag({ content: ".site-header{visibility:visible!important}" });
      await page.screenshot({ path: resolve(OUT, `${tag}-full.png`), fullPage: true });

      // Fonts actually used.
      const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`));
      for (const need of ["DM Sans 400", "Fraunces 600", "Syne 600"]) {
        if (!fonts.some((f) => f.replace(/"/g, "") === need)) problems.push(`${tag}: font not loaded: ${need}`);
      }

      // The waitlist's honest states.
      await page.locator("#join").scrollIntoViewIfNeeded();
      await page.fill("#waitlist-email", "not-an-email");
      await page.click("#waitlist-submit");
      await sleep(250);
      await page.locator("#join").screenshot({ path: resolve(OUT, `${tag}-20-waitlist-invalid.png`) });
      await page.fill("#waitlist-email", "someone@example.com");
      await page.click("#waitlist-submit");
      await sleep(250);
      await page.locator("#join").screenshot({ path: resolve(OUT, `${tag}-21-waitlist-not-open.png`) });
      const status = (await page.textContent("#waitlist-status")) ?? "";
      if (/on the list/i.test(status)) problems.push(`${tag}: the waitlist claimed success with no endpoint`);

      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (sideways > 1) problems.push(`${tag}: the page scrolls sideways by ${sideways}px`);

      // /privacy placeholder page.
      await page.goto(`${url}privacy`, { waitUntil: "networkidle" });
      await page.screenshot({ path: resolve(OUT, `${tag}-30-privacy-page.png`), fullPage: true });

      await context.close();
    }
  }
} finally {
  await browser.close();
  await server.stop();
}

console.log(`Screenshots: ${OUT}`);
console.log(problems.length ? `Problems (${problems.length}):\n- ${problems.join("\n- ")}` : "No problems seen.");
process.exit(problems.length ? 1 : 0);
