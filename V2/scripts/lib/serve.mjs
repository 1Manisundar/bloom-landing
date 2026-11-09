// A tiny static server for the prerendered site (dist/client), used by the screenshot and test scripts.
// The Vercel adapter does not support `astro preview`, so this stands in for it.
// Clean URLs like Vercel: /privacy and /privacy/ serve privacy/index.html. Like Vercel, text is sent
// compressed and hashed build files (/_astro/) are cached for a year, so local Lighthouse numbers match.

import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".woff2": "font/woff2", ".woff": "font/woff", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
};

export async function serveStatic({ port = 4329, root = resolve("dist/client") } = {}) {
  // BASE_URL=https://… runs the same checks against a deployed site instead of the local build.
  if (process.env.BASE_URL) return { port: null, origin: process.env.BASE_URL.replace(/\/$/, ""), stop: async () => {} };
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let file = normalize(join(root, path));
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      let info = await stat(file).catch(() => null);
      if (info?.isDirectory()) { file = join(file, "index.html"); info = await stat(file).catch(() => null); }
      if (!info && !extname(file)) { file = `${file}.html`; info = await stat(file).catch(() => null); }
      if (!info) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); return; }
      const type = TYPES[extname(file)] ?? "application/octet-stream";
      const headers = { "Content-Type": type, "Cache-Control": path.startsWith("/_astro/") ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate" };
      let body = await readFile(file);
      if (/^(text\/|application\/(json|xml|manifest)|image\/svg)/.test(type) && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
        body = gzipSync(body);
        headers["Content-Encoding"] = "gzip";
        headers["Vary"] = "Accept-Encoding";
      }
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(500); res.end();
    }
  });
  await new Promise((done) => server.listen(port, "127.0.0.1", done));
  return { port, origin: `http://127.0.0.1:${port}`, stop: () => new Promise((done) => server.close(done)) };
}
