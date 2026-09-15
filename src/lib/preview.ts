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
export function supportedPreviewPath(path: string): boolean {
  return (
    [
      "/",
      "/privacy-policy/",
      "/terms-of-use/",
      "/contact/",
      "/referral/",
    ].includes(path) ||
    /^\/(?:glossary|blog)\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?$/.test(path)
  );
}
export const previewLinkResolver: LinkResolverFunction = (doc) => {
  if (
    doc.type === "referral" ||
    (doc.type === "form" && doc.uid === "referral")
  )
    return "/referral/";
  if (doc.type === "contact" || (doc.type === "form" && doc.uid === "contact"))
    return "/contact/";
  if (doc.type === "blog-index") return "/blog/";
  if (
    doc.type === "blog" &&
    doc.uid &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.uid)
  )
    return `/blog/${doc.uid}/`;
  if (doc.type === "glossary-index") return "/glossary/";
  if (
    doc.type === "glossary" &&
    doc.uid &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.uid)
  )
    return `/glossary/${doc.uid}/`;
  if (
    doc.type === "legal" &&
    ["privacy-policy", "terms-of-use"].includes(doc.uid || "")
  )
    return `/${doc.uid}/`;
  return "/";
};
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
