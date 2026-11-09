// Lighthouse, mobile (its default: slow 4G, 4x CPU), three runs against the built site; prints the median.
// Usage: npm run build && node scripts/lighthouse.mjs      (BASE_URL=https://… to test a deployed site)
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { serveStatic } from "./lib/serve.mjs";

const OUT = resolve("shots", "lighthouse");
await mkdir(OUT, { recursive: true });
const server = await serveStatic({ port: 4461 });
const runs = [];
try {
  for (let i = 1; i <= (Number(process.env.LH_RUNS) || 3); i++) {
    const file = resolve(OUT, `run${i}.json`);
    // Async on purpose: a blocking spawn would also block this script's own web server.
    const status = await new Promise((done) => {
      const child = spawn("npx", ["--yes", "lighthouse@12.8.2", `${server.origin}/`, "--quiet", "--chrome-flags=--headless=new",
        "--output=json", `--output-path=${file}`, "--only-categories=performance,accessibility,best-practices,seo"],
        { shell: true, stdio: process.env.LH_DEBUG ? "inherit" : "ignore" });
      const timer = setTimeout(() => child.kill(), 180000);
      child.on("exit", (code) => { clearTimeout(timer); done(code); });
    });
    if (status !== 0) { console.log(`run ${i} failed (${status})`); continue; }
    runs.push(JSON.parse(await readFile(file, "utf8")));
  }
} finally {
  await server.stop();
}
const pick = (r) => ({
  perf: Math.round(r.categories.performance.score * 100), a11y: Math.round(r.categories.accessibility.score * 100),
  bp: Math.round(r.categories["best-practices"].score * 100), seo: Math.round(r.categories.seo.score * 100),
  lcp: r.audits["largest-contentful-paint"].numericValue / 1000, cls: r.audits["cumulative-layout-shift"].numericValue,
  tbt: r.audits["total-blocking-time"].numericValue, fcp: r.audits["first-contentful-paint"].numericValue / 1000,
});
const rows = runs.map(pick);
rows.forEach((m, i) => console.log(`run ${i + 1}: perf ${m.perf} a11y ${m.a11y} best-practices ${m.bp} seo ${m.seo} | LCP ${m.lcp.toFixed(2)}s CLS ${m.cls.toFixed(3)} TBT ${Math.round(m.tbt)}ms FCP ${m.fcp.toFixed(2)}s`));
if (rows.length) {
  const med = rows.sort((a, b) => a.perf - b.perf)[Math.floor(rows.length / 2)];
  console.log(`median: LCP ${med.lcp.toFixed(2)}s (budget 2.5) · CLS ${med.cls.toFixed(3)} (budget 0.1)`);
  // Failed audits worth reading (score < 0.9), from the last run.
  const last = runs[runs.length - 1];
  const fails = Object.values(last.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative" && a.scoreDisplayMode !== "notApplicable");
  console.log("\nAudits below 90 (last run):\n" + (fails.map((a) => `- ${a.id}: ${a.title}${a.displayValue ? ` (${a.displayValue})` : ""}`).join("\n") || "none"));
}
