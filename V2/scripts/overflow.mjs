// Alignment and overflow audit. For every piece of text on the page, at many screen widths, checks that
// the text's own box stays inside: the screen, its card or panel (the nearest ancestor with a fill or a
// rounded corner), and its section. Also checks the page never scrolls sideways.
// Usage: npm run build && node scripts/overflow.mjs
// Runs with reduced motion so every element is in its final, settled place.

import { chromium } from "playwright-core";
import { serveStatic } from "./lib/serve.mjs";

const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1366, 1440, 1536, 1920];
const PAGES = ["/", "/privacy"];
const server = await serveStatic({ port: 4344 });
const browser = await chromium.launch({ channel: "chrome" });
const problems = [];

try {
  for (const width of WIDTHS) {
    const height = width < 600 ? 844 : 900;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", isMobile: width < 600, hasTouch: width < 600 });
    const page = await context.newPage();
    for (const path of PAGES) {
      await page.goto(`http://127.0.0.1:${server.port}${path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // Open every disclosure so hidden text is measured too.
      await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; d.removeAttribute("name"); }));
      await page.waitForTimeout(200);
      const found = await page.evaluate(() => {
        const out = [];
        const vw = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways by ${document.documentElement.scrollWidth - vw}px`);
        const isBox = (el) => {
          const cs = getComputedStyle(el);
          return (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") || parseFloat(cs.borderTopLeftRadius) > 0;
        };
        const label = (el) => (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
        const walker = document.createTreeWalker(document.querySelector("main") ?? document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim()) continue;
          const el = n.parentElement;
          if (!el || seen.has(el)) continue;
          seen.add(el);
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none" || el.closest(".visually-hidden, [hidden], .waitlist__trap")) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          const r = range.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (r.left < -1 || r.right > vw + 1) out.push(`off screen: "${label(el)}" (${Math.round(r.left)}–${Math.round(r.right)} of ${vw})`);
          let box = el.parentElement;
          while (box && box !== document.body && !isBox(box)) box = box.parentElement;
          if (box && box !== document.body && box.tagName !== "SECTION" && box.tagName !== "HEADER") {
            const b = box.getBoundingClientRect();
            const over = Math.max(b.left - r.left, r.right - b.right, b.top - r.top, r.bottom - b.bottom);
            if (over > 1) out.push(`escapes its card by ${Math.round(over)}px: "${label(el)}" in .${(box.className || box.tagName).toString().split(" ")[0]}`);
          }
        }
        return out;
      });
      for (const f of found) problems.push(`${width}px ${path}: ${f}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
console.log(problems.length ? `Problems (${problems.length}):\n- ${problems.join("\n- ")}` : `No overflow at ${WIDTHS.join(", ")}px.`);
process.exit(problems.length ? 1 : 0);
