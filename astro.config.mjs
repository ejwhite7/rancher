import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";
import {
  PUBLIC_SITE,
  includeInStaticSitemap,
  isIndexableDeployment,
} from "./src/lib/site.ts";

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
  site: PUBLIC_SITE,
  vite: {
    define: {
      "import.meta.env.PUBLIC_SITE_INDEXABLE": JSON.stringify(
        isIndexableDeployment(process.env.VERCEL_ENV, url),
      ),
    },
  },
  devToolbar: { enabled: false },
  adapter: vercel(),
  build: { inlineStylesheets: "always" },
  trailingSlash: "always",
  integrations: [
    react(),
    sitemap({
      filter: includeInStaticSitemap,
      customSitemaps: [new URL("/glossary-sitemap.xml", PUBLIC_SITE).href],
    }),
  ],
});
