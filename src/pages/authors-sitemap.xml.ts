import type { APIRoute } from "astro";
import { createBlogClient, authorSchema, blogHeaders } from "../lib/blog";
import { authorPath } from "../lib/authors";
import { PUBLIC_SITE } from "../lib/site";
export const prerender = false;
export const GET: APIRoute = async () => {
  try {
    const docs = await createBlogClient().getAllByType("authors");
    const entries = docs
      .filter((d) => d.first_publication_date)
      .map((d) => {
        authorSchema.parse(d.data);
        const path = authorPath(d.uid || "");
        return `<url><loc>${PUBLIC_SITE}${path}</loc><lastmod>${new Date(d.last_publication_date).toISOString()}</lastmod></url>`;
      });
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`,
      {
        headers: {
          ...blogHeaders,
          "Content-Type": "application/xml; charset=utf-8",
        },
      },
    );
  } catch {
    return new Response("Author sitemap temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
};
