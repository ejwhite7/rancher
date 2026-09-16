import type { RichTextField } from "@prismicio/client";
/** Keep the words, but suppress links to articles absent from this Prismic ref. */
export function availableBlogLinks(
  value: RichTextField,
  articles: { id: string; uid: string }[],
): RichTextField {
  const ids = new Set(articles.map((a) => a.id));
  const paths = new Set(articles.map((a) => `/blog/${a.uid}/`));
  return value.map((block) => {
    if (!("spans" in block)) return block;
    return {
      ...block,
      spans: block.spans.filter((span) => {
        if (span.type !== "hyperlink") return true;
        const link = span.data;
        if (link.link_type === "Document")
          return !link.isBroken && ids.has(link.id);
        if (link.link_type !== "Web") return true;
        const url = new URL(link.url, "https://www.gorancher.com");
        if (
          ![
            "www.gorancher.com",
            "gorancher.com",
            "staging.gorancher.com",
          ].includes(url.hostname)
        )
          return true;
        if (!/^\/blog\/[^/]+\/?$/.test(url.pathname)) return true;
        return paths.has(url.pathname.replace(/\/?$/, "/"));
      }),
    };
  }) as RichTextField;
}
