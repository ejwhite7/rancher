import type { APIRoute } from "astro";
import { isPublicSite } from "../lib/seo";
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *\n${isPublicSite(site!) ? "Allow: /" : "Disallow: /"}\n\nSitemap: ${new URL("/sitemap-index.xml", site)}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
