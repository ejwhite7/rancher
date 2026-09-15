import type { APIRoute } from "astro";
import { isPublicSite } from "../lib/seo";
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *\n${isPublicSite(new URL(import.meta.env.SITE_URL || "http://localhost")) && (!import.meta.env.VERCEL_ENV || import.meta.env.VERCEL_ENV === "production") ? "Allow: /\nDisallow: /preview/\nDisallow: /slice-simulator/" : "Disallow: /"}\n\nSitemap: ${new URL("/sitemap-index.xml", site)}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
