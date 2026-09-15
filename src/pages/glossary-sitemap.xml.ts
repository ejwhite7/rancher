import type { APIRoute } from "astro";
import { NotFoundError } from "@prismicio/client";
import {
  createGlossaryClient,
  fetchGlossary,
  glossaryHeaders,
} from "../lib/glossary";
export const prerender = false;
export const GET: APIRoute = async () => {
  const headers = {
    ...glossaryHeaders,
    "Content-Type": "application/xml; charset=utf-8",
  };
  try {
    const glossary = await fetchGlossary(createGlossaryClient(), {
      lang: import.meta.env.PRISMIC_LOCALE || "en-us",
    });
    const urls = ["/glossary/", ...glossary.records.map((r) => r.url)];
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>https://www.gorancher.com${path}</loc></url>`).join("")}</urlset>`,
      { headers },
    );
  } catch (error) {
    // Before the first release there are no glossary routes to advertise.
    if (error instanceof NotFoundError)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        { headers },
      );
    return new Response("Glossary sitemap is temporarily unavailable.", {
      status: 503,
      headers: { ...glossaryHeaders, "Retry-After": "300" },
    });
  }
};
