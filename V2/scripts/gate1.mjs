// Gate 1 screenshots: the site beside the approved reference page, at the same size and scroll point.
// Usage: npm run build && node scripts/gate1.mjs [--only=phone390]
// Writes shots/gate1/<view>[-reduced]/<name>.png (site | reference side by side) and prints problems.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { serveStatic } from "./lib/serve.mjs";

const VIEWS = [
  { name: "phone390", width: 390, height: 844, mobile: true },
  { name: "phone412", width: 412, height: 915, mobile: true },
  { name: "laptop1366", width: 1366, height: 768 },
  { name: "desktop1440", width: 1440, height: 900 },
];
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
// --out=<folder> writes somewhere other than shots/gate1 (for later gates).
const OUT = resolve("shots", process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "gate1");
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const problems = [];

const site = await serveStatic({ port: 4351 });
// The reference file is a page body without a document skeleton (no viewport tag), so phones would
// lay it out at 980px. Serve a copy with the skeleton the artifact host adds.
const refDir = resolve(OUT, "_ref");
await mkdir(refDir, { recursive: true });
await writeFile(resolve(refDir, "product-page.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${await readFile(resolve("docs/reference/product-page.html"), "utf8")}</body></html>`);
const ref = await serveStatic({ port: 4352, root: refDir });
const browser = await chromium.launch({ channel: "chrome" });

async function open(url, view, motion, tag) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: view.mobile ? 2 : 1, isMobile: !!view.mobile, hasTouch: !!view.mobile, reducedMotion: motion,
  });
  const page = await context.newPage();
  if (tag) {
    page.on("console", (m) => { if (m.type() === "error") problems.push(`${tag}: console: ${m.text()}`); });
    page.on("pageerror", (e) => problems.push(`${tag}: page error: ${e.message}`));
    page.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) problems.push(`${tag}: HTTP ${r.status()} ${r.url()}`); });
  }
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__nd?.ready);
  await sleep(1600); // hero entrance
  return { page, context };
}

const scrollTo = (page, y) => page.evaluate((y) => {
  if (window.__nd?.jump) window.__nd.jump(y); else window.scrollTo(0, y);
}, Math.max(0, Math.round(y)));

/** Scroll points shared by both pages, computed from each page's own layout. */
const points = {
  hero: () => 0,
  story: (p) => `(() => { const s = document.getElementById("story"), g = document.getElementById("stStage");
    const top = s.getBoundingClientRect().top + scrollY; return top + ${p} * (s.offsetHeight - g.offsetHeight); })()`,
  section: (id) => `(() => { const el = document.getElementById("${id}"); const nav = document.querySelector("header").offsetHeight;
    return el ? el.getBoundingClientRect().top + scrollY - nav : null; })()`,
  chapter: (i) => `(() => { const el = document.querySelectorAll(".st-ch")[${i}]; const nav = document.querySelector("header").offsetHeight;
    return el ? el.getBoundingClientRect().top + scrollY - nav - 24 : null; })()`,
  // Privacy's top at a given share of the screen height: inside the colour blend (88% → 52%).
  blend: (share) => `(() => { const el = document.getElementById("privacy"); return el.getBoundingClientRect().top + scrollY - innerHeight * ${share}; })()`,
};

async function capture(page, expr, file) {
  const y = typeof expr === "number" ? expr : await page.evaluate(expr);
  if (y === null || y === undefined) return false;
  await scrollTo(page, y);
  await sleep(1100);
  await page.screenshot({ path: file });
  return true;
}

async function sideBySide(a, b, out, view) {
  const [ia, ib] = await Promise.all([readFile(a), b ? readFile(b) : null]);
  const ctx = await browser.newContext({ viewport: { width: view.width * 2 + 24, height: view.height + 40 }, deviceScaleFactor: view.mobile ? 2 : 1 });
  const p = await ctx.newPage();
  const img = (buf) => buf ? `<img src="data:image/png;base64,${buf.toString("base64")}" style="width:${view.width}px;height:${view.height}px">` : `<div style="width:${view.width}px;height:${view.height}px;display:grid;place-items:center;font:16px sans-serif;background:#eee">Not in the reference page</div>`;
  await p.setContent(`<body style="margin:0;background:#ccc;font:600 14px sans-serif"><div style="display:flex;gap:24px"><div>${img(ia)}<p style="margin:8px">Site</p></div><div>${img(ib)}<p style="margin:8px">Reference</p></div></div></body>`);
  await p.screenshot({ path: out });
  await ctx.close();
}

try {
  for (const motion of ["no-preference", "reduce"]) {
    for (const view of VIEWS) {
      if (only && view.name !== only) continue;
      const tag = `${view.name}${motion === "reduce" ? "-reduced" : ""}`;
      const dir = resolve(OUT, tag), raw = resolve(OUT, "_raw", tag);
      await mkdir(dir, { recursive: true }); await mkdir(raw, { recursive: true });
      const s = await open(`${site.origin}/`, view, motion, tag);
      const r = await open(`${ref.origin}/product-page.html`, view, motion, null);

      const list = [["00-hero", points.hero()]];
      if (motion === "reduce") for (let i = 0; i < 4; i++) list.push([`0${i + 1}-story-chapter-${i + 1}`, points.chapter(i)]);
      else [5, 37, 62, 95].forEach((p, i) => list.push([`0${i + 1}-story-${p}pct`, points.story(p / 100)]));
      list.push(["10-demo", points.section("demo")], ["11-bento", points.section("inside")], ["12-privacy", points.section("privacy")],
        ["13-founders-faq", points.section("founders")], ["14-waitlist", points.section("join")],
        ["20-colour-change-a", points.blend(0.8)], ["21-colour-change-b", points.blend(0.62)]);

      for (const [name, expr] of list) {
        const fa = resolve(raw, `${name}-site.png`), fb = resolve(raw, `${name}-ref.png`);
        const okA = await capture(s.page, expr, fa);
        if (!okA) { if (name !== "10-demo") problems.push(`${tag}: no target for ${name}`); continue; } // demo is off until the film exists
        const okB = await capture(r.page, expr, fb);
        await sideBySide(fa, okB ? fb : null, resolve(dir, `${name}.png`), view);
      }

      // Checks on the site: sideways scroll, phone frame inside the screen during the story.
      const wide = await s.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (wide > 1) problems.push(`${tag}: page scrolls sideways by ${wide}px`);
      if (motion !== "reduce") {
        await scrollTo(s.page, await s.page.evaluate(points.story(0.5)));
        await sleep(800);
        const cut = await s.page.evaluate(() => {
          const ph = document.querySelector(".st-ch .phone").getBoundingClientRect();
          const nav = document.querySelector("header").getBoundingClientRect().bottom;
          const txt = [...document.querySelectorAll(".st-txt")].filter((t) => +getComputedStyle(t).opacity > 0.5).map((t) => t.getBoundingClientRect()).reduce((m, b) => Math.max(m, b.bottom), 0);
          return { top: ph.top - nav, bottom: innerHeight - ph.bottom, left: ph.left, right: innerWidth - ph.right, overlapText: innerWidth < 861 ? txt - ph.top : 0 };
        });
        for (const [k, v] of Object.entries(cut)) if (k !== "overlapText" && v < -1) problems.push(`${tag}: story phone cut off at ${k} by ${Math.round(-v)}px`);
        if (cut.overlapText > 1) problems.push(`${tag}: story text overlaps the phone by ${Math.round(cut.overlapText)}px`);
      }
      await s.context.close(); await r.context.close();
    }
  }
} finally {
  await browser.close(); await site.stop(); await ref.stop();
}
await writeFile(resolve(OUT, "problems.txt"), problems.join("\n") || "none");
console.log(problems.length ? `Problems (${problems.length}):\n- ${problems.join("\n- ")}` : "No problems found.");
