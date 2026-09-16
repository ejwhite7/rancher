import { createClient, type Client } from "@prismicio/client";
import { z } from "zod";
import { fetchSiteContent } from "./prismic";
import { parseNavigation, parseFooter } from "./content";
export const blogUID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const blogTopics = [
  "Start here",
  "Rights & control",
  "Data use cases",
  "Preparation & quality",
] as const;
const text = z.string().trim().min(1);
const url = z.url().refine((v) => {
  const u = new URL(v);
  return u.protocol === "https:" && !u.username && !u.password;
});
const web = z.object({
  link_type: z.literal("Web"),
  url: z
    .string()
    .refine((v) => /^\/(?!\/)/.test(v) || url.safeParse(v).success),
});
const relation = z.object({
  link_type: z.literal("Document"),
  id: text,
  isBroken: z.boolean().optional(),
  type: z.string().optional(),
  uid: z.string().nullable().optional(),
});
const image = z.object({
  url,
  alt: text,
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});
const span = z.union([
  z.object({
    type: z.enum(["strong", "em"]),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("hyperlink"),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    data: z.union([web, relation]),
  }),
]);
export const blogRichText = z.array(
  z.object({
    type: z.enum([
      "paragraph",
      "heading1",
      "heading3",
      "heading4",
      "list-item",
      "o-list-item",
    ]),
    text: z.string(),
    spans: z.array(span),
  }),
);
const body = blogRichText.refine((v) => v.some((b) => b.text.trim()));
const timestamp = z.preprocess(
  (v) =>
    typeof v === "string" ? v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2") : v,
  z.iso.datetime({ offset: true }),
);
const heading = z.string().nullable().optional();
export const blogSlice = z.discriminatedUnion("slice_type", [
  z.object({
    slice_type: z.literal("text_section"),
    primary: z.object({ heading, body }),
    items: z.array(z.unknown()).optional(),
  }),
  z.object({
    slice_type: z.literal("callout"),
    primary: z.object({ heading, body }),
  }),
  z.object({
    slice_type: z.literal("comparison_table"),
    primary: z.object({
      caption: text,
      column_1: text,
      column_2: text,
      column_3: text,
    }),
    items: z
      .array(z.object({ cell_1: text, cell_2: text, cell_3: text }))
      .min(1),
  }),
  z.object({
    slice_type: z.literal("checklist"),
    primary: z.object({ heading: text }),
    items: z.array(z.object({ text })).min(1),
  }),
  z.object({
    slice_type: z.literal("image_caption"),
    primary: z.object({ image, caption: text }),
  }),
  z.object({
    slice_type: z.literal("downloadable_asset"),
    primary: z.object({
      heading: text,
      description: body,
      asset: z.object({ link_type: z.literal("Media"), url, name: text }),
      link_label: text,
    }),
  }),
  z.object({
    slice_type: z.literal("faq"),
    primary: z.object({ heading: text }),
    items: z.array(z.object({ question: text, answer: body })).min(1),
  }),
  z.object({
    slice_type: z.literal("article_cta"),
    primary: z.object({ heading: text, body, label: text, link: web }),
  }),
]);
const shared = {
  navigation: relation.refine((r) => !r.isBroken),
  footer: relation.refine((r) => !r.isBroken),
  meta_title: text,
  meta_description: text,
  meta_image: image,
};
export const blogIndexSchema = z.object({
  ...shared,
  title: text,
  introduction: body,
  featured_heading: text,
  library_heading: text,
  empty_state: text,
  featured_articles: z.array(z.object({ article: relation })).default([]),
});
export const authorSchema = z.object({
  name: text,
  title: text,
  bio: body,
  socials: z
    .array(
      z.object({
        label: text,
        url: z.object({ link_type: z.literal("Web"), url }),
      }),
    )
    .default([]),
});
export const blogArticleSchema = z.object({
  ...shared,
  content_key: text,
  title: blogRichText.refine(
    (v) => v.length === 1 && v[0]?.type === "heading1" && v[0].text.trim(),
  ),
  excerpt: text,
  answer_summary: body,
  topic: z.enum(blogTopics),
  published_at: timestamp,
  updated_at: timestamp.nullable().optional(),
  author: relation.refine((r) => !r.isBroken && r.type === "authors"),
  reviewer_name: heading,
  reviewer_role: heading,
  slices: z.array(blogSlice).min(1),
  sources: z
    .array(
      z.object({
        source_title: text,
        source_url: web,
        accessed_on: z.iso.date(),
      }),
    )
    .min(1),
  related_articles: z.array(z.object({ article: relation })).default([]),
  cta_label: text,
  cta_link: web,
});
export type BlogArticle = z.infer<typeof blogArticleSchema>;
export type BlogRecord = {
  id: string;
  uid: string;
  data: BlogArticle;
  author?: z.infer<typeof authorSchema> & { uid: string };
};
export const blogHeaders = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
};
export function createBlogClient() {
  return createClient(import.meta.env.PRISMIC_REPOSITORY_NAME || "rancher", {
    fetchOptions: { cache: "no-store" },
  });
}
export function parseBlogRecords(
  documents: {
    id: string;
    uid: string | null;
    data: unknown;
    first_publication_date?: string | null;
  }[],
  preview = false,
): BlogRecord[] {
  return documents
    .filter((doc) => preview || !!doc.first_publication_date)
    .map((doc) => {
      if (!doc.uid || !blogUID.test(doc.uid)) throw Error("Invalid blog UID");
      // Native Prismic publication controls visibility and live dates.
      // Provisional dates only describe draft previews, never a second schedule.
      const data = blogArticleSchema.parse(
        !preview && doc.data && typeof doc.data === "object"
          ? { ...doc.data, published_at: doc.first_publication_date }
          : doc.data,
      );
      return { id: doc.id, uid: doc.uid, data };
    })
    .sort(
      (a, b) =>
        Date.parse(b.data.published_at) - Date.parse(a.data.published_at) ||
        a.uid.localeCompare(b.uid),
    );
}
export async function fetchBlog(client: Client, preview = false) {
  const [index, docs] = await Promise.all([
    client.getSingle("blog-index"),
    client.getAllByType("blog"),
  ]);
  const articles = parseBlogRecords(docs, preview);
  const authorIDs = [
    ...new Set(articles.map((article) => article.data.author.id)),
  ];
  const authors = new Map(
    await Promise.all(
      authorIDs.map(async (id) => {
        const doc = await client.getByID(id);
        if (doc.type !== "authors")
          throw Error("Invalid article author relationship");
        if (!doc.uid || !blogUID.test(doc.uid))
          throw Error("Invalid author UID");
        return [id, { ...authorSchema.parse(doc.data), uid: doc.uid }] as const;
      }),
    ),
  );
  return {
    index: blogIndexSchema.parse(index.data),
    articles: articles.map((article) => ({
      ...article,
      author: authors.get(article.data.author.id)!,
    })),
  };
}
export async function blogSiteContent(
  client: Client,
  refs: { navigation: { id: string }; footer: { id: string } },
) {
  const [site, nav, footer] = await Promise.all([
    fetchSiteContent(client),
    client.getByID(refs.navigation.id),
    client.getByID(refs.footer.id),
  ]);
  if (nav.type !== "navigation" || footer.type !== "footer")
    throw Error("Invalid blog layout relationship");
  return {
    ...site,
    navigation: parseNavigation(nav.data),
    footer: parseFooter(footer.data),
  };
}
export function blogLink(doc: { type?: string; uid?: string | null }) {
  return doc.type === "blog" && doc.uid && blogUID.test(doc.uid)
    ? `/blog/${doc.uid}/`
    : doc.type === "blog-index"
      ? "/blog/"
      : doc.type === "glossary" && doc.uid && blogUID.test(doc.uid)
        ? `/glossary/${doc.uid}/`
        : doc.type === "glossary-index"
          ? "/glossary/"
          : doc.type === "authors" && doc.uid && blogUID.test(doc.uid)
            ? `/authors/${doc.uid}/`
            : "/";
}
export function readingMinutes(data: BlogArticle) {
  return Math.max(
    1,
    Math.ceil(JSON.stringify(data.slices).split(/\s+/).length / 220),
  );
}
