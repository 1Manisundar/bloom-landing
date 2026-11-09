// Dead-gap audit: finds tall empty stretches between visible content (text, images, SVG, video,
// controls, and any box with a fill or shadow), at many widths. The page is measured stacked (reduced
// motion), so the pinned story is laid out flat; the pinned stage is checked by gate1.mjs.
// Usage: npm run build && node scripts/gaps.mjs [maxShareOfScreen=0.2]
// Reports every gap taller than that share of the screen height (default 20%).

import { chromium } from "playwright-core";
import { serveStatic } from "./lib/serve.mjs";

const SHARE = Number(process.argv[2] ?? 0.2);
const VIEWS = [[360, 780], [390, 844], [412, 915], [768, 1024], [1024, 768], [1366, 768], [1440, 900], [1920, 1080]];
const server = await serveStatic({ port: 4345 });
const browser = await chromium.launch({ channel: "chrome" });
const problems = [];

try {
  for (const [width, height] of VIEWS) {
    const mobile = width < 600;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    for (const path of ["/"]) { // "/privacy" is off for now (src/pages/_privacy.astro)
      await page.goto(`${server.origin}${path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
      const gaps = await page.evaluate((share) => {
        const spans = [];
        const add = (r, what) => { if (r.width > 0 && r.height > 0) spans.push([r.top + scrollY, r.bottom + scrollY, what]); };
        const visible = (el) => { const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05 && !el.closest(".visually-hidden, [hidden], .waitlist__trap, header, .skip-link"); };
        const label = (el) => (el.textContent || el.getAttribute("alt") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 36);
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim() || !n.parentElement || !visible(n.parentElement)) continue;
          const range = document.createRange(); range.selectNodeContents(n);
          add(range.getBoundingClientRect(), label(n.parentElement));
        }
        for (const el of document.querySelectorAll("body *")) {
          if (!visible(el)) continue;
          const cs = getComputedStyle(el);
          const filled = (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") || cs.backgroundImage !== "none" || cs.boxShadow !== "none";
          if (filled || /^(IMG|SVG|VIDEO|INPUT|BUTTON)$/i.test(el.tagName)) add(el.getBoundingClientRect(), label(el));
        }
        spans.sort((a, b) => a[0] - b[0]);
        const out = [];
        let end = spans[0]?.[1] ?? 0, endWhat = spans[0]?.[2] ?? "";
        for (const [top, bottom, what] of spans) {
          if (top - end > innerHeight * share) out.push(`${Math.round(top - end)}px empty at y=${Math.round(end)} between "${endWhat}" and "${what}"`);
          if (bottom > end) { end = bottom; endWhat = what; }
        }
        return out;
      }, SHARE);
      for (const g of gaps) problems.push(`${width}x${height} ${path}: ${g}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
console.log(problems.length ? `Gaps over ${SHARE * 100}% of the screen (${problems.length}):\n- ${problems.join("\n- ")}` : `No gaps over ${SHARE * 100}% of the screen.`);
process.exit(problems.length ? 1 : 0);
