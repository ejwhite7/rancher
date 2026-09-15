import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "production", process.cwd(), "");
const site = process.env.SITE_URL || env.SITE_URL || "http://localhost:4321";
const url = new URL(site);
if (
  !["http:", "https:"].includes(url.protocol) ||
  url.pathname !== "/" ||
  url.search ||
  url.hash ||
  url.username ||
  url.password
) {
  throw new Error(
    "SITE_URL must be an HTTP(S) origin, for example https://your-domain.com",
  );
}

export default defineConfig({
  site: url.origin,
  devToolbar: { enabled: false },
  adapter: vercel(),
  build: { inlineStylesheets: "always" },
  trailingSlash: "always",
  integrations: [react(), sitemap()],
});
