// Reduced-motion test (prompt: no pin, no Lenis, every chapter stacked in its final state), at 390x844
// and 1440x900, plus a short screen (1366x560) WITH motion, where the pin must also be off.
// Usage: npm run build && node scripts/reducedtest.mjs

import { chromium } from "playwright-core";
import { serveStatic } from "./lib/serve.mjs";

const server = await serveStatic({ port: 4481 });
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
const check = (ok, what) => results.push(`${ok ? "PASS" : "FAIL"}  ${what}`);
const CASES = [
  { tag: "phone-reduced", width: 390, height: 844, mobile: true, motion: "reduce" },
  { tag: "desktop-reduced", width: 1440, height: 900, motion: "reduce" },
  { tag: "short-screen (motion on)", width: 1366, height: 560, motion: "no-preference", shortOnly: true },
];

try {
  for (const c of CASES) {
    const ctx = await browser.newContext({ viewport: { width: c.width, height: c.height }, isMobile: !!c.mobile, hasTouch: !!c.mobile, reducedMotion: c.motion });
    const page = await ctx.newPage();
    await page.goto(`${server.origin}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.__nd?.ready);
    const m = await page.evaluate(() => {
      const st = document.getElementById("story"), stage = document.getElementById("stStage");
      const chapters = [...document.querySelectorAll(".st-ch")];
      return {
        lenis: !!window.__nd.lenis,
        sticky: getComputedStyle(stage).position,
        storyH: Math.round(st.offsetHeight / innerHeight * 100),
        stacked: chapters.every((ch, i) => i === 0 || ch.getBoundingClientRect().top > chapters[i - 1].getBoundingClientRect().bottom - 1),
        allShown: [...document.querySelectorAll(".st-txt, .scr, .peb, .map__node, .chain li")].every((el) => +getComputedStyle(el).opacity > 0.99),
        linesDrawn: [...document.querySelectorAll(".map__link")].every((p) => parseFloat(getComputedStyle(p).strokeDashoffset) < 0.01),
        stripFilled: [...document.querySelectorAll(".strip i")].every((i) => getComputedStyle(i).transform === "none" || /matrix\(1, 0, 0, 1/.test(getComputedStyle(i).transform)),
        running: document.getAnimations().filter((a) => a.playState === "running").map((a) => a.animationName || a.constructor.name),
        hidden: document.querySelectorAll(".rise.wait").length,
      };
    });
    check(!m.lenis === true || c.shortOnly && !m.lenis, `${c.tag}: no smooth scroll (Lenis off)`);
    check(m.sticky !== "sticky", `${c.tag}: story not pinned (stage ${m.sticky}; the stacked story is ${m.storyH}% of the screen height)`);
    check(m.stacked, `${c.tag}: the four chapters are stacked one after another`);
    check(m.allShown && m.linesDrawn && m.stripFilled, `${c.tag}: every chapter in its final state (pebbles, map, gold lines, chain, strip)`);
    if (!c.shortOnly) {
      check(!m.running.length, `${c.tag}: no animation running on the page${m.running.length ? ` (running: ${m.running.join(", ")})` : ""}`);
      check(m.hidden === 0, `${c.tag}: nothing waits hidden for a reveal`);
      // Page colour snaps (no lag): after a jump to Privacy the colour is final in the next frame.
      await page.evaluate(() => window.__nd.jump(document.getElementById("privacy").getBoundingClientRect().top + scrollY - document.getElementById("nav").offsetHeight));
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--pbg").trim());
      check(bg === "rgb(0,43,32)", `${c.tag}: page colour still follows the sections, without the lag (Privacy: ${bg})`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
console.log(results.join("\n"));
process.exit(results.some((l) => l.startsWith("FAIL")) ? 1 : 0);
