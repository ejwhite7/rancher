import type { APIRoute } from "astro";
import { NotFoundError } from "@prismicio/client";
import { createBlogClient, fetchBlog, blogHeaders } from "../lib/blog";
import { PUBLIC_SITE } from "../lib/site";
export const prerender = false;
export const GET: APIRoute = async () => {
  const headers = {
    ...blogHeaders,
    "Content-Type": "application/xml; charset=utf-8",
  };
  try {
    const blog = await fetchBlog(createBlogClient());
    const entries = [
      `<url><loc>${PUBLIC_SITE}/blog/</loc></url>`,
      ...blog.articles.map(
        (d) =>
          `<url><loc>${PUBLIC_SITE}/blog/${d.uid}/</loc><lastmod>${new Date(d.data.updated_at || d.data.published_at).toISOString()}</lastmod></url>`,
      ),
    ];
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`,
      { headers },
    );
  } catch (e) {
    if (e instanceof NotFoundError)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        { headers },
      );
    return new Response("Blog sitemap temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
};
