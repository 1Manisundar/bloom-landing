// Measures the phone first screen and how many lines each h1/h2 takes at 390x844.
// Usage: npm run build && node scripts/measure.mjs
import { chromium } from "playwright-core";
import { serveStatic } from "./lib/serve.mjs";
const server = await serveStatic({ port: 4340 });
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto(`${server.origin}/`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const r = await page.evaluate(() => {
  const box = (s) => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom) }; };
  const lines = [...document.querySelectorAll("h1, h2")].map((h) => {
    const cs = getComputedStyle(h); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.1;
    return `${Math.round(h.getBoundingClientRect().height / lh)} lines @${cs.fontSize}  ${h.textContent.trim().slice(0, 50)}`;
  });
  return { panel: box(".demo__panel"), line: box(".demo__line"), title: box(".hero__title"), lines, sideways: document.documentElement.scrollWidth - innerWidth };
});
console.log(JSON.stringify(r, null, 1));
await browser.close(); await server.stop();
