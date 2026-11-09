// Keyboard-only test, at 1440x900 and 390x844, with and without reduced motion.
// Tabs through the whole page and checks every stop: it is something you can use, its focus ring shows,
// and it is on screen and not hidden under the sticky header. Then uses the page with keys only:
// skip link, header links (menu on phones), Escape closes the menu, FAQ opens with Enter, companion rows
// pause with Enter, the waitlist form submits with Enter and its status line answers (the static test
// server has no /api/waitlist, so the answer is the error message; nothing is stored).
// Usage: npm run build && node scripts/keyboardtest.mjs

import { chromium } from "playwright-core";
import { serveStatic } from "./lib/serve.mjs";

const VIEWS = [{ name: "desktop", width: 1440, height: 900 }, { name: "phone", width: 390, height: 844, mobile: true }];
const server = await serveStatic({ port: 4471 });
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
const check = (ok, what) => results.push(`${ok ? "PASS" : "FAIL"}  ${what}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  for (const motion of ["no-preference", "reduce"]) {
    for (const v of VIEWS) {
      const tag = `${v.name}${motion === "reduce" ? "-reduced" : ""}`;
      const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: !!v.mobile, hasTouch: !!v.mobile, reducedMotion: motion });
      const page = await ctx.newPage();
      await page.goto(`${server.origin}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => window.__nd?.ready);

      // 1. Tab through everything.
      const stops = [];
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press("Tab");
        await sleep(v.mobile ? 60 : 30);
        const info = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
          // Covered = something else is drawn on top of the element's centre (e.g. the sticky header).
          const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), cy = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
          const top = document.elementFromPoint(cx, cy);
          const ring = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== "none";
          const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
          return { name, tag: el.tagName, ring, visible: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight,
            underHeader: !!top && !el.contains(top) && !top.contains(el) && !!top.closest("#nav") };
        });
        if (!info) break;
        if (stops.length && stops[0].name === info.name && stops.length > 3) break; // wrapped around
        stops.push(info);
      }
      const bad = stops.filter((s) => !s.ring || !s.visible || s.underHeader);
      check(stops.length >= 8 && !bad.length, `${tag}: ${stops.length} tab stops, all with a visible ring, on screen, not under the header${bad.length ? ` — problems: ${bad.map((s) => `"${s.name}"${!s.ring ? " no ring" : ""}${!s.visible ? " off screen" : ""}${s.underHeader ? " under header" : ""}`).join(", ")}` : ""}`);
      results.push(`      order: ${stops.map((s) => s.name).join(" → ")}`);

      // 2. Skip link goes to main.
      await page.evaluate(() => { window.__nd.jump(0); document.activeElement?.blur(); });
      await page.keyboard.press("Tab");
      const skip = await page.evaluate(() => document.activeElement?.classList.contains("skip-link"));
      await page.keyboard.press("Enter"); await sleep(400);
      check(skip && (await page.evaluate(() => location.hash === "#main")), `${tag}: first Tab is the skip link and Enter jumps to the content`);

      // 3. Header link to Privacy with keys only (menu on phones, Escape closes it).
      await page.evaluate(() => { window.__nd.jump(0); history.replaceState(null, "", "/"); document.activeElement?.blur(); });
      if (v.mobile) {
        await page.focus("#menuBtn"); await page.keyboard.press("Enter"); await sleep(150);
        const open = await page.evaluate(() => !document.getElementById("dropMenu").hidden);
        await page.keyboard.press("Escape"); await sleep(100);
        const closed = await page.evaluate(() => document.getElementById("dropMenu").hidden && document.activeElement?.id === "menuBtn");
        check(open && closed, `${tag}: Enter opens the menu, Escape closes it and focus returns to the menu button`);
        await page.keyboard.press("Enter"); await sleep(150);
        await page.focus('#dropMenu a[href$="#privacy"]');
      } else {
        await page.focus('.links a[href$="#privacy"]');
      }
      await page.keyboard.press("Enter"); await sleep(2200);
      const landed = await page.evaluate(() => {
        const nav = document.getElementById("nav").getBoundingClientRect().bottom;
        return { gap: Math.round(document.getElementById("privacy").getBoundingClientRect().top - nav), focus: document.activeElement?.id };
      });
      check(Math.abs(landed.gap) <= 2 && landed.focus === "pv-h", `${tag}: Enter on "Privacy" lands under the header (gap ${landed.gap}px) with focus on its heading`);

      // 4. FAQ opens with Enter.
      await page.focus(".faq__q"); await page.keyboard.press("Enter"); await sleep(100);
      check(await page.evaluate(() => document.querySelector(".faq__item").open), `${tag}: Enter opens the first FAQ answer`);

      // 5. Companion rows pause with Enter (only when they move).
      if (motion === "no-preference") {
        await page.focus("[data-faces-rows]"); await page.keyboard.press("Enter"); await sleep(50);
        const st = await page.$eval("#companions .row", (r) => getComputedStyle(r).animationPlayState);
        await page.keyboard.press("Enter");
        check(st === "paused", `${tag}: Enter pauses the moving companion rows`);
      } else {
        check(await page.evaluate(() => !document.querySelector("[data-faces-rows]").hasAttribute("tabindex")), `${tag}: still companion rows are not a tab stop`);
      }

      // 6. Waitlist with keys only: type, Enter submits, the status is announced.
      await page.focus("#waitlist-email"); await page.keyboard.type("keyboard@example.com"); await page.keyboard.press("Enter"); await sleep(400);
      const said = (await page.textContent("#waitlist-status"))?.trim();
      check(!!said, `${tag}: Enter submits the waitlist form and the status line answers ("${said}")`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await server.stop();
}
console.log(results.join("\n"));
process.exit(results.some((l) => l.startsWith("FAIL")) ? 1 : 0);
