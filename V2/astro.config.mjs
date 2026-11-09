// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

// Every page is prerendered (static output). The one on-demand route is src/pages/api/waitlist.ts,
// which runs as a Vercel serverless function.
export default defineConfig({
  site: "https://neuroditto.ai",
  output: "static",
  adapter: vercel(),
  trailingSlash: "ignore",
  // All CSS goes into the page itself: no stylesheet request blocks the first paint (Lighthouse, Gate 3).
  build: { inlineStylesheets: "always" },
  devToolbar: { enabled: false },
  integrations: [sitemap()],
});
