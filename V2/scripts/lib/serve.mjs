// A tiny static server for the prerendered site (dist/client), used by the screenshot and test scripts.
// The Vercel adapter does not support `astro preview`, so this stands in for it.
// Clean URLs like Vercel: /privacy and /privacy/ serve privacy/index.html.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".woff2": "font/woff2", ".woff": "font/woff", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
};

export async function serveStatic({ port = 4329, root = resolve("dist/client") } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let file = normalize(join(root, path));
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      let info = await stat(file).catch(() => null);
      if (info?.isDirectory()) { file = join(file, "index.html"); info = await stat(file).catch(() => null); }
      if (!info && !extname(file)) { file = `${file}.html`; info = await stat(file).catch(() => null); }
      if (!info) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); return; }
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(500); res.end();
    }
  });
  await new Promise((done) => server.listen(port, "127.0.0.1", done));
  return { port, stop: () => new Promise((done) => server.close(done)) };
}
