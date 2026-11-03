// Screenshots of every section at phone, laptop and desktop size, for checking the page by eye.
// Usage: npm run shots -- <phase> [--reduced]   (builds first; writes to shots/<phase>/)
//
// Shots are what a visitor sees: the screen at the start of each section (and at its end when the
// section is taller than the screen), after its reveal has played. Then the interaction states
// (demo, pattern card, companion shelf, FAQ, waitlist). It serves the built site itself, drives the installed Chrome, and prints anything
// that looks wrong: console errors, failed requests, sideways scrolling, missing fonts, a waitlist that
// claims success without saving.

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
const SECTIONS = ["how", "patterns", "weeks", "why", "companions", "privacy", "founders", "join", "footer"];
const MOTION = args.includes("--reduced") ? ["no-preference", "reduce"] : ["no-preference"];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const problems = [];

await mkdir(OUT, { recursive: true });
const server = await preview({ root: process.cwd(), server: { port: 4329, host: "127.0.0.1" }, logLevel: "warn" });
const url = `http://127.0.0.1:${server.port}/`;
const browser = await chromium.launch({ channel: "chrome" });

async function open(view, motion) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: view.mobile ? 2 : 1,
    isMobile: Boolean(view.mobile),
    hasTouch: Boolean(view.mobile),
    reducedMotion: motion,
  });
  const page = await context.newPage();
  const tag = `${view.name}${motion === "reduce" ? "-reduced" : ""}`;
  page.on("console", (msg) => { if (msg.type() === "error" && !/favicon/.test(msg.location().url)) problems.push(`${tag}: console: ${msg.text()}`); });
  page.on("pageerror", (err) => problems.push(`${tag}: page error: ${err.message}`));
  page.on("requestfailed", (req) => problems.push(`${tag}: request failed: ${req.url()}`));
  page.on("response", (res) => { if (res.status() >= 400 && !/favicon/.test(res.url())) problems.push(`${tag}: HTTP ${res.status()}: ${res.url()}`); });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__nd?.ready);
  await sleep(300);
  return { page, context, tag };
}

// Scroll so the section's top sits under the header (pin-aware: uses the pin spacer when there is one).
async function goTo(page, id, at = "start") {
  await page.evaluate(([sel, where]) => {
    const el = document.getElementById(sel);
    const box = el.closest(".pin-spacer") ?? el;
    const header = document.querySelector(".site-header").getBoundingClientRect().height;
    const top = box.getBoundingClientRect().top + window.scrollY;
    const y = where === "end" ? top + box.offsetHeight - window.innerHeight : top - (sel === "weeks" ? 0 : header);
    window.__nd.jump(Math.max(0, y));
  }, [id, at]);
  await sleep(900);
}

const shot = (page, tag, name) => page.screenshot({ path: resolve(OUT, `${tag}-${name}.png`) });

try {
  for (const motion of MOTION) {
    for (const view of VIEWS) {
      const { page, context, tag } = await open(view, motion);

      // First screen exactly as a visitor lands on it: frame 0 must already be complete.
      await shot(page, tag, "00-first-screen");
      const frame0 = await page.evaluate(() => ({
        text: document.querySelector("[data-demo='text']")?.textContent,
        tag: getComputedStyle(document.querySelector("[data-demo='tag']")).opacity,
      }));
      if (!frame0.text || frame0.tag !== "1") problems.push(`${tag}: hero demo frame 0 is not complete on load`);

      let n = 1;
      for (const id of SECTIONS) {
        const exists = await page.locator(`#${id}`).count();
        if (!exists) { problems.push(`${tag}: section #${id} missing`); continue; }
        await goTo(page, id, "start");
        await shot(page, tag, `${String(n).padStart(2, "0")}-${id}`);
        const tall = await page.evaluate((sel) => {
          const el = document.getElementById(sel);
          return !el.closest(".pin-spacer") && el.offsetHeight > window.innerHeight * 1.3;
        }, id);
        if (tall) { await goTo(page, id, "end"); await shot(page, tag, `${String(n).padStart(2, "0")}-${id}-end`); }
        n++;
      }

      // Fonts actually used.
      const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`.replace(/"/g, "")));
      for (const need of ["DM Sans 400", "Fraunces 600", "Syne 600"]) if (!fonts.includes(need)) problems.push(`${tag}: font not loaded: ${need}`);

      // Interaction states.
      await page.evaluate(() => window.__nd.jump(0));
      await sleep(300);
      await page.click("[data-demo-go='1']");
      await sleep(300);
      await page.locator(".demo").screenshot({ path: resolve(OUT, `${tag}-40-demo-moment-2.png`) });
      await page.click("[data-demo-go='2']");
      await sleep(300);
      await page.locator(".demo").screenshot({ path: resolve(OUT, `${tag}-41-demo-moment-3.png`) });

      await goTo(page, "patterns", "start");
      await page.locator(".pcard__turn").first().click();
      await sleep(600);
      await page.locator(".patterns__grid").screenshot({ path: resolve(OUT, `${tag}-42-pattern-turned.png`) });
      await page.locator(".pcard").first().screenshot({ path: resolve(OUT, `${tag}-42b-pattern-turned-card.png`) });
      const fit = await page.evaluate(() => {
        const card = document.querySelector(".pcard");
        const back = card.querySelector(".pcard__back"), btn = card.querySelector(".pcard__turn");
        return Math.round(card.getBoundingClientRect().bottom - btn.getBoundingClientRect().bottom) - Math.round(parseFloat(getComputedStyle(card).paddingBottom));
      });
      if (view.mobile && fit > 4) problems.push(`${tag}: turned pattern card has ${fit}px of empty space under its button`);
      if ((await page.locator(".pcard__turn").first().getAttribute("aria-expanded")) !== "true") problems.push(`${tag}: pattern card did not report turned`);

      await goTo(page, "companions", "start");
      await page.locator(".shelf__summary").nth(1).click();
      await sleep(600);
      await page.locator(".shelf").screenshot({ path: resolve(OUT, `${tag}-43-shelf-open.png`) });
      await page.locator(".shelf__summary").nth(2).click();
      await sleep(300);
      const openCards = await page.locator(".shelf__item[open]").count();
      if (openCards !== 1) problems.push(`${tag}: ${openCards} shelf cards open at once (expected 1)`);

      await goTo(page, "founders", "start");
      await page.locator(".faq__q").last().click();
      await sleep(400);
      await page.locator(".founders__faq").screenshot({ path: resolve(OUT, `${tag}-44-faq-open.png`) });

      // The waitlist's honest states.
      await goTo(page, "join", "start");
      await page.fill("#waitlist-email", "not-an-email");
      await page.click("#waitlist-submit");
      await sleep(250);
      await page.locator("#join").screenshot({ path: resolve(OUT, `${tag}-50-waitlist-invalid.png`) });
      await page.fill("#waitlist-email", "someone@example.com");
      await page.click("#waitlist-submit");
      await sleep(250);
      await page.locator("#join").screenshot({ path: resolve(OUT, `${tag}-51-waitlist-not-open.png`) });
      const status = (await page.textContent("#waitlist-status")) ?? "";
      if (/on the list/i.test(status)) problems.push(`${tag}: the waitlist claimed success with no endpoint`);

      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (sideways > 1) problems.push(`${tag}: the page scrolls sideways by ${sideways}px`);
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
