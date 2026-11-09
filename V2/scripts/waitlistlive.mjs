// Live waitlist check against the REAL Supabase project in .env (never prints the key).
// Signs up one test address through the page's form twice, then asks Supabase how many rows that
// address has (must be exactly 1). The test row stays; the script prints the SQL to delete it.
// Usage: node scripts/waitlistlive.mjs [address]     (default: waitlist-test@example.com)

import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { dev } from "astro";

const email = (process.argv[2] ?? "waitlist-test@example.com").toLowerCase();
const env = Object.fromEntries((await readFile(".env", "utf8")).split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
  .map(([, k, v]) => [k, v.replace(/^['"]|['"]$/g, "")]));
for (const k of ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "PUBLIC_WAITLIST_URL"]) if (!env[k]) throw new Error(`.env is missing ${k}`);
const base = new URL(env.SUPABASE_URL).origin;

const results = [];
const check = (ok, what) => results.push(`${ok ? "PASS" : "FAIL"}  ${what}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await dev({ root: process.cwd(), server: { port: 4410, host: "127.0.0.1" }, logLevel: "error" });
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const round of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto("http://127.0.0.1:4410/", { waitUntil: "networkidle" });
    await page.evaluate(() => window.__nd?.ready);
    await page.evaluate(() => document.getElementById("join").scrollIntoView());
    await sleep(600);
    await page.fill("#waitlist-email", email);
    const answer = page.waitForResponse((r) => r.url().endsWith("/api/waitlist"), { timeout: 15000 });
    await page.click("#waitlist-submit");
    const res = await answer;
    await page.waitForFunction(() => ["joined", "error"].includes(document.getElementById("waitlist").dataset.state), null, { timeout: 15000 });
    const state = await page.getAttribute("#waitlist", "data-state");
    const said = (await page.textContent("#waitlist-status"))?.trim();
    check(res.status() === 200 && state === "joined", `${round === 1 ? "first sign-up" : "same address again"}: route ${res.status()}, page says "${said}"`);
    await page.close();
  }
  const r = await fetch(`${base}/rest/v1/waitlist?email=eq.${encodeURIComponent(email)}&select=email,created_at`, {
    headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` },
  });
  const rows = r.ok ? await r.json() : [];
  check(r.ok && rows.length === 1, `Supabase has exactly one row for ${email} (rows: ${rows.length}${rows[0] ? `, added ${rows[0].created_at}` : ""}${r.ok ? "" : `, read failed: HTTP ${r.status}`})`);
} finally {
  await browser.close();
  await server.stop();
}
console.log(results.join("\n"));
console.log(`\nTo remove the test row, run in Supabase SQL Editor:\n  delete from public.waitlist where email = '${email}';`);
process.exit(results.some((l) => l.startsWith("FAIL")) ? 1 : 0);
