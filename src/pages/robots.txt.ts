import type { APIRoute } from "astro";
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *\n${import.meta.env.PUBLIC_SITE_INDEXABLE ? "Allow: /\nDisallow: /preview/\nDisallow: /slice-simulator/" : "Disallow: /"}\n\nSitemap: ${new URL("/sitemap-index.xml", site)}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
