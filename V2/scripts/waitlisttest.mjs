// Tests every waitlist state against a local stand-in endpoint, and checks that with no endpoint
// nothing is ever sent.
// Usage: node scripts/waitlisttest.mjs <folder>    (builds two test copies into dist-test-*/, removes them after)
//
//   closed   no PUBLIC_WAITLIST_URL: "The list isn't open yet. Nothing was sent." and zero POSTs
//   invalid  bad address: inline message, focus back on the field, nothing sent
//   sending  slow endpoint: button disabled, "Sending…"
//   joined   endpoint answers 200: "You're on the list." (the only success message)
//   error    endpoint answers 500, or never answers (10s timeout): says it was NOT saved

import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { preview } from "astro";

const OUT = resolve("shots", process.argv[2] ?? "waitlist");
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (ok, what) => results.push(`${ok ? "PASS" : "FAIL"}  ${what}`);

// Stand-in endpoint. `mode` decides the next answer.
let mode = "ok";
const received = [];
const api = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    received.push(body);
    if (mode === "hang") return; // never answers
    setTimeout(() => {
      res.writeHead(mode === "ok" ? 200 : 500, { "Content-Type": "application/json" });
      res.end(mode === "ok" ? '{"ok":true}' : '{"error":"server"}');
    }, mode === "ok" ? 900 : 300);
  });
});
await new Promise((r) => api.listen(4350, "127.0.0.1", r));

const build = (dir, env) => execSync(`npx astro build --outDir ${dir}`, { stdio: "ignore", env: { ...process.env, ...env } });
build("dist-test-open", { PUBLIC_WAITLIST_URL: "http://127.0.0.1:4350/waitlist" });
build("dist-test-closed", { PUBLIC_WAITLIST_URL: "" });

const browser = await chromium.launch({ channel: "chrome" });
async function open(outDir, port) {
  const server = await preview({ root: process.cwd(), outDir: `./${outDir}`, server: { port, host: "127.0.0.1" }, logLevel: "error" });
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
  return { server, page, posts };
}
const status = (page) => page.textContent("#waitlist-status");
const state = (page) => page.getAttribute("#waitlist", "data-state");
const shoot = (page, name) => page.locator("#join").screenshot({ path: resolve(OUT, `waitlist-${name}.png`) });

try {
  // ---- No endpoint ----
  {
    const { server, page, posts } = await open("dist-test-closed", 4351);
    await shoot(page, "0-idle");
    await page.fill("#waitlist-email", "someone@example.com");
    await page.click("#waitlist-submit");
    await sleep(400);
    await shoot(page, "1-not-open");
    check((await status(page)) === "The list isn’t open yet. Nothing was sent.", "no endpoint: says the list isn't open and nothing was sent");
    check(posts.length === 0, `no endpoint: zero requests sent (saw ${posts.length})`);
    await page.close(); await server.stop();
  }
  // ---- With endpoint ----
  {
    const { server, page, posts } = await open("dist-test-open", 4352);
    await page.fill("#waitlist-email", "not-an-email");
    await page.click("#waitlist-submit");
    await sleep(300);
    await shoot(page, "2-invalid");
    check(/full email address/.test(await status(page)), "invalid: inline message");
    check(await page.evaluate(() => document.activeElement?.id === "waitlist-email"), "invalid: focus back on the field");
    check(posts.length === 0, "invalid: nothing sent");

    mode = "ok";
    await page.fill("#waitlist-email", "someone@example.com");
    await page.click("#waitlist-submit");
    await sleep(250);
    await shoot(page, "3-sending");
    check((await state(page)) === "sending" && (await page.isDisabled("#waitlist-submit")), "sending: state set and button disabled");
    check(!/on the list/i.test(await status(page)), "sending: no success claimed before the answer");
    await sleep(1200);
    await shoot(page, "4-joined");
    check((await status(page)) === "You’re on the list. We’ll be in touch.", "joined: shown after a 200");
    check(received.at(-1) === JSON.stringify({ email: "someone@example.com" }), `joined: body was ${received.at(-1)}`);

    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => window.__nd?.ready);
    await page.evaluate(() => { const el = document.getElementById("join"); window.__nd.jump(el.getBoundingClientRect().top + scrollY - 80); });
    await sleep(700);
    mode = "fail";
    await page.fill("#waitlist-email", "someone@example.com");
    await page.click("#waitlist-submit");
    await sleep(900);
    await shoot(page, "5-error");
    check((await state(page)) === "error" && /not on the list/.test(await status(page)), "error: a 500 says the address was not saved");

    mode = "hang";
    await page.click("#waitlist-submit");
    await sleep(10800);
    check((await state(page)) === "error", "error: no answer in 10s ends in the error state, not success");
    await page.close(); await server.stop();
  }
} finally {
  await browser.close();
  api.close();
  await rm("dist-test-open", { recursive: true, force: true });
  await rm("dist-test-closed", { recursive: true, force: true });
}
console.log(results.join("\n"));
console.log(`\nScreenshots: ${OUT}`);
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
