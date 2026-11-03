// End-to-end test of the waitlist: the page, the real /api/waitlist route, and a local stand-in for
// Supabase's REST API that checks exactly what would be stored.
// Usage: node scripts/waitlisttest.mjs <folder>     (screenshots to shots/<folder>/)
//
// Runs Astro's dev server twice: once with no waitlist URL (the list is closed) and once with
// PUBLIC_WAITLIST_URL=/api/waitlist and Supabase pointed at the stand-in.

import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { dev } from "astro";

const OUT = resolve("shots", process.argv[2] ?? "waitlist");
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (ok, what) => results.push(`${ok ? "PASS" : "FAIL"}  ${what}`);

// ---- Stand-in for Supabase (PostgREST) ----
let mode = "ok";
const stored = [];
const seen = [];
const supa = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    seen.push({ url: req.url, prefer: req.headers.prefer, apikey: req.headers.apikey, auth: req.headers.authorization, body });
    if (mode === "hang") return;
    if (mode === "fail") { res.writeHead(500, { "Content-Type": "application/json" }); res.end('{"message":"down"}'); return; }
    const row = JSON.parse(body);
    if (!stored.some((r) => r.email === row.email)) stored.push(row); // unique email, ON CONFLICT DO NOTHING
    setTimeout(() => { res.writeHead(201); res.end(); }, 900);
  });
});
await new Promise((r) => supa.listen(4350, "127.0.0.1", r));

async function startDev(env, port) {
  for (const k of ["PUBLIC_WAITLIST_URL", "SUPABASE_URL", "SUPABASE_SECRET_KEY"]) delete process.env[k];
  Object.assign(process.env, env);
  return dev({ root: process.cwd(), server: { port, host: "127.0.0.1" }, logLevel: "error" });
}
const browser = await chromium.launch({ channel: "chrome" });
async function openPage(port) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const posts = [];
  page.on("request", (r) => { if (r.method() === "POST") posts.push(r.url()); });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => window.__nd?.ready);
  await page.evaluate(() => {
    const el = document.getElementById("join");
    window.__nd.jump(el.getBoundingClientRect().top + scrollY - document.querySelector(".site-header").offsetHeight);
  });
  await sleep(900);
  return { page, posts };
}
const status = (page) => page.textContent("#waitlist-status");
const state = (page) => page.getAttribute("#waitlist", "data-state");
const shoot = (page, name) => page.locator("#join").screenshot({ path: resolve(OUT, `waitlist-${name}.png`) });
const api = (port, body, headers = {}) => fetch(`http://127.0.0.1:${port}/api/waitlist`, {
  method: "POST", headers: { "Content-Type": "application/json", Origin: `http://127.0.0.1:${port}`, ...headers }, body: JSON.stringify(body),
});

try {
  // ---- Closed: no PUBLIC_WAITLIST_URL, no Supabase keys ----
  {
    const server = await startDev({}, 4361);
    const { page, posts } = await openPage(4361);
    await shoot(page, "0-idle");
    await page.fill("#waitlist-email", "someone@example.com");
    await page.click("#waitlist-submit");
    await sleep(400);
    await shoot(page, "1-not-open");
    check((await status(page)) === "The list isn’t open yet. Nothing was sent.", "closed: says the list isn't open and nothing was sent");
    check(posts.length === 0, `closed: zero requests from the page (saw ${posts.length})`);
    const r = await api(4361, { email: "someone@example.com" });
    check(r.status === 503, `closed: the route answers 503 without keys (got ${r.status})`);
    check(stored.length === 0, "closed: nothing stored");
    await page.close();
    await server.stop();
  }

  // ---- Open: PUBLIC_WAITLIST_URL=/api/waitlist, Supabase = stand-in ----
  {
    const server = await startDev({ PUBLIC_WAITLIST_URL: "/api/waitlist", SUPABASE_URL: "http://127.0.0.1:4350", SUPABASE_SECRET_KEY: "test-secret" }, 4362);
    const { page, posts } = await openPage(4362);

    await page.fill("#waitlist-email", "not-an-email");
    await page.click("#waitlist-submit");
    await sleep(300);
    await shoot(page, "2-invalid");
    check(/full email address/.test(await status(page)), "invalid: inline message");
    check(await page.evaluate(() => document.activeElement?.id === "waitlist-email"), "invalid: focus back on the field");
    check(posts.length === 0, "invalid: nothing sent");

    mode = "ok";
    await page.fill("#waitlist-email", "  Someone@Example.com ");
    await page.click("#waitlist-submit");
    await sleep(350);
    await shoot(page, "3-sending");
    check((await state(page)) === "sending" && (await page.isDisabled("#waitlist-submit")), "sending: state set and button disabled");
    check(!/on the list/i.test(await status(page)), "sending: no success claimed before the answer");
    await sleep(1500);
    await shoot(page, "4-joined");
    check((await status(page)) === "You’re on the list. We’ll be in touch.", "joined: shown after the save");
    check(await page.isHidden("#waitlist-email"), "joined: field removed after the save");
    const last = seen.at(-1);
    check(last?.url === "/rest/v1/waitlist?on_conflict=email", `storage: table and conflict key (${last?.url})`);
    check(/resolution=ignore-duplicates/.test(last?.prefer ?? ""), "storage: duplicates ignored, not overwritten");
    check(last?.apikey === "test-secret" && last?.auth === "Bearer test-secret", "storage: secret key sent server-side only");
    check(last?.body === JSON.stringify({ email: "someone@example.com" }), `storage: only the email, trimmed and lower-cased (${last?.body})`);
    const html = await page.content();
    check(!html.includes("test-secret"), "storage: the secret never reaches the page");

    // Same address again: still on the list, stored once.
    let r = await api(4362, { email: "someone@example.com" });
    check(r.status === 200 && stored.length === 1, `duplicate: answers 200 and stores one row (rows: ${stored.length})`);

    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => window.__nd?.ready);
    await page.evaluate(() => { const el = document.getElementById("join"); window.__nd.jump(el.getBoundingClientRect().top + scrollY - 80); });
    await sleep(700);
    mode = "fail";
    await page.fill("#waitlist-email", "other@example.com");
    await page.click("#waitlist-submit");
    await sleep(1200);
    await shoot(page, "5-error");
    check((await state(page)) === "error" && /not on the list/.test(await status(page)), "error: storage failure says the address was not saved");

    mode = "hang";
    await page.click("#waitlist-submit");
    await sleep(10500);
    check((await state(page)) === "error", "error: no answer from storage ends in the error state, not success");
    mode = "ok";

    await page.close();
    await server.stop();
  }

  // ---- Route-level checks, on a fresh server so the rate-limit count starts at zero ----
  {
    const server = await startDev({ PUBLIC_WAITLIST_URL: "/api/waitlist", SUPABASE_URL: "http://127.0.0.1:4350", SUPABASE_SECRET_KEY: "test-secret" }, 4363);
    let r = await api(4363, { email: "bot@example.com", company: "Acme" });
    check(r.status === 400 && !stored.some((s) => s.email === "bot@example.com"), `honeypot: filled field is refused and nothing stored (${r.status})`);
    r = await api(4363, { email: "nope" });
    check(r.status === 400, `bad address: 400 (${r.status})`);
    r = await api(4363, { email: "x@example.com" }, { Origin: "https://elsewhere.example" });
    check(r.status === 403, `other site: 403 (${r.status})`);
    r = await fetch("http://127.0.0.1:4363/api/waitlist");
    check(r.status === 405, `GET: 405 (${r.status})`);
    // 5 attempts per address per 10 minutes; 2 used above (the 403 and GET are refused before counting).
    let first429 = 0;
    for (let n = 3; n <= 8; n++) {
      r = await api(4363, { email: `limit${n}@example.com` });
      if (r.status === 429) { first429 = n; break; }
    }
    check(first429 === 6, `rate limit: attempt 6 refused with 429 (first 429 at attempt ${first429 || "none"})`);
    check(stored.every((row) => Object.keys(row).join() === "email"), "storage: no field other than email was ever sent");
    await server.stop();
  }
} finally {
  await browser.close();
  supa.close();
}
console.log(results.join("\n"));
console.log(`\nScreenshots: ${OUT}`);
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
