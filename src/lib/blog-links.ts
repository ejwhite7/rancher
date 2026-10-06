import type { RichTextField } from "@prismicio/client";
type Span = Extract<RichTextField[number], { spans: unknown }>["spans"][number];

function availableDocument(
  link: Extract<
    Extract<Span, { type: "hyperlink" }>["data"],
    { link_type: "Document" }
  >,
  ids: Set<string>,
) {
  if (link.isBroken) return false;
  if (link.type === "blog") return ids.has(link.id);
  return ["glossary", "glossary-index", "authors", "blog-index"].includes(
    link.type || "",
  );
}

function availableSpan(span: Span, ids: Set<string>, paths: Set<string>) {
  if (span.type !== "hyperlink") return true;
  const link = span.data;
  if (link.link_type === "Document") return availableDocument(link, ids);
  if (link.link_type !== "Web") return true;
  const url = new URL(link.url, "https://www.gorancher.com");
  if (
    !["www.gorancher.com", "gorancher.com", "staging.gorancher.com"].includes(
      url.hostname,
    )
  )
    return true;
  if (!/^\/blog\/[^/]+\/?$/.test(url.pathname)) return true;
  return paths.has(url.pathname.replace(/\/?$/, "/"));
}

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
      spans: block.spans.filter((span) => availableSpan(span, ids, paths)),
    };
  }) as RichTextField;
}
