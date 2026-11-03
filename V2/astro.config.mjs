// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://neuroditto.ai",
  trailingSlash: "ignore",
  build: { inlineStylesheets: "auto" },
  devToolbar: { enabled: false },
});
