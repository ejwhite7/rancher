import {
  createClient,
  type Client,
  type LinkResolverFunction,
} from "@prismicio/client";
export const PREVIEW_COOKIE = "io.prismic.preview";
export const previewHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};
export const previewLinkResolver: LinkResolverFunction = (doc) =>
  doc.type === "legal" &&
  ["privacy-policy", "terms-of-use"].includes(doc.uid || "")
    ? `/${doc.uid}/`
    : "/";
export function createPreviewClient(token?: string): Client {
  const repository = import.meta.env.PRISMIC_REPOSITORY_NAME;
  if (!repository)
    throw new Error("PRISMIC_REPOSITORY_NAME is required for previews.");
  const client = createClient(repository, {
    accessToken: import.meta.env.PRISMIC_ACCESS_TOKEN,
    fetchOptions: { cache: "no-store" },
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      if (!response.ok) throw new Error("Prismic preview request failed.");
      return response;
    },
  });
  // A fresh client per request keeps draft refs out of the published-content cache.
  if (token) client.queryContentFromRef(token);
  return client;
}
export function validPreviewToken(token: string): boolean {
  return (
    token.length > 0 && token.length < 4096 && !/[\s;\x00-\x1f]/.test(token)
  );
}
