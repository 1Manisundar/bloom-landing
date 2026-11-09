// Tests every header nav link at 1440x900, 1366x768 and 390x844, with and without reduced motion.
// Each link is clicked from the top of the page and again from the bottom (so jumps cross the pinned
// story both ways). On phones the links are in the menu, which is opened first. After the scroll
// settles it checks:
//   - the section's top sits flush under the header (within 2px), no strip of the previous section;
//   - keyboard focus is on the section's heading.
// Usage: npm run build && node scripts/navtest.mjs <folder>   (screenshots to shots/<folder>/)

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { serveStatic } from "./lib/serve.mjs";

const folder = process.argv[2] ?? "navtest";
const OUT = resolve("shots", folder);
const VIEWS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "phone", width: 390, height: 844, mobile: true },
];
// Every link in the header menu, read from the page (the Demo link is off until the film exists).
const SHOOT = new Set(["story", "privacy"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const rows = [];

await mkdir(OUT, { recursive: true });
const server = await serveStatic({ port: 4343 });
const browser = await chromium.launch({ channel: "chrome" });

async function settle(page) {
  let last = -1, still = 0;
  for (let i = 0; i < 80; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    still = y === last ? still + 1 : 0;
    last = y;
    if (still >= 4) break;
    await sleep(80);
  }
  await sleep(150);
}

try {
  for (const motion of ["no-preference", "reduce"]) {
    for (const view of VIEWS) {
      const context = await browser.newContext({
        viewport: { width: view.width, height: view.height },
        deviceScaleFactor: 1, isMobile: Boolean(view.mobile), hasTouch: Boolean(view.mobile), reducedMotion: motion,
      });
      const page = await context.newPage();
      await page.goto(`${server.origin}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.__nd?.ready);
      await sleep(400);
      const tag = `${view.name}${motion === "reduce" ? "-reduced" : ""}`;
      const LINKS = await page.$$eval("#dropMenu a", (as) => as.map((a) => a.hash.slice(1)));

      for (const from of ["top", "bottom"]) {
        for (const id of LINKS) {
          await page.evaluate((where) => {
            const y = where === "top" ? 0 : document.documentElement.scrollHeight;
            window.__nd?.jump ? window.__nd.jump(y) : window.scrollTo(0, y);
          }, from);
          await sleep(300);
          if (view.mobile) { await page.click("#menuBtn"); await page.click(`#dropMenu a[href$="#${id}"]`); }
          else await page.click(`.links a[href$="#${id}"]`);
          await settle(page);

          const m = await page.evaluate((sid) => {
            const header = document.getElementById("nav");
            const hb = header.getBoundingClientRect().bottom;
            const section = document.getElementById(sid);
            const st = section.getBoundingClientRect().top;
            const under = document.elementsFromPoint(innerWidth / 2, hb + 2).find((el) => !header.contains(el));
            const underSection = under?.closest("section, footer")?.id ?? "(none)";
            const heading = section.querySelector("h2, h1");
            return {
              delta: Math.round(st - hb),
              underSection,
              focusOnHeading: document.activeElement === heading,
              focused: document.activeElement?.tagName + (document.activeElement?.id ? `#${document.activeElement.id}` : ""),
            };
          }, id);
          const ok = Math.abs(m.delta) <= 2 && m.underSection === id && m.focusOnHeading;
          rows.push(`${ok ? "PASS" : "FAIL"}  ${tag.padEnd(16)} from ${from.padEnd(6)} → ${id.padEnd(10)} gap ${String(m.delta).padStart(4)}px  under-header: ${m.underSection.padEnd(10)} focus: ${m.focusOnHeading ? "heading" : m.focused}`);
          if (!ok) failures.push(`${tag} ${from}→${id}`);
          if (from === "top" && SHOOT.has(id)) await page.screenshot({ path: resolve(OUT, `${tag}-${id}.png`) });
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  await server.stop();
}

console.log(rows.join("\n"));
console.log(`\nScreenshots: ${OUT}`);
console.log(failures.length ? `FAILED (${failures.length} of ${rows.length})` : `All ${rows.length} jumps passed.`);
process.exit(failures.length ? 1 : 0);
