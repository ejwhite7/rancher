import {
  createClient,
  type Client,
  type RichTextField,
} from "@prismicio/client";
import { z } from "zod";
import { fetchSiteContent } from "./prismic";
import { parseNavigation, parseFooter, type SiteContent } from "./content";

export { glossaryCategories } from "./glossary-search";
import {
  glossaryCategories,
  compareTerms,
  type GlossaryCategory,
  type GlossaryRecord,
} from "./glossary-search";
export type { GlossaryRecord } from "./glossary-search";
export const glossaryUID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const required = z.string().trim().min(1);
const webURL = z.url().refine((value) => {
  const u = new URL(value);
  return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password;
});
const hyperlink = z.object({
  type: z.literal("hyperlink"),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  data: z.union([
    z.object({
      link_type: z.literal("Web"),
      url: webURL,
      target: z.enum(["_blank", "_self"]).optional(),
    }),
    z.object({
      link_type: z.literal("Document"),
      id: required,
      type: z.enum(["homepage", "legal", "glossary-index", "glossary"]),
      uid: z.string().regex(glossaryUID).nullable().optional(),
      isBroken: z.boolean().optional(),
    }),
  ]),
});
const emphasis = z.object({
  type: z.enum(["strong", "em"]),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export const glossaryRichText = z.array(
  z.object({
    type: z.enum([
      "paragraph",
      "heading3",
      "heading4",
      "list-item",
      "o-list-item",
    ]),
    text: z.string(),
    spans: z.array(z.union([emphasis, hyperlink])).default([]),
  }),
);
const body = glossaryRichText.refine(
  (blocks) => blocks.some((b) => b.text.trim()),
  "Required section is empty",
);
const relation = z.object({
  link_type: z.literal("Document"),
  id: required,
  type: z.string().optional(),
  isBroken: z.boolean().optional(),
});
const image = z
  .object({
    url: webURL,
    alt: z.string().nullable().optional(),
    dimensions: z.object({
      width: z.number().positive(),
      height: z.number().positive(),
    }),
  })
  .nullable()
  .optional()
  .or(z.object({}).strict());
const shared = {
  navigation: relation,
  footer: relation,
  social_image: image,
  meta_title: required,
  meta_description: required,
};
export const glossaryIndexSchema = z.object({
  ...shared,
  title: z
    .array(
      z.object({
        type: z.literal("heading1"),
        text: required,
        spans: z.array(z.unknown()).length(0),
      }),
    )
    .length(1),
  intro: body,
  search_placeholder: z.string().nullable().optional(),
  empty_state_title: z.string().nullable().optional(),
  empty_state_body: glossaryRichText.default([]),
  featured_terms: z
    .array(z.object({ term: relation }))
    .max(6)
    .default([]),
  cta_heading: z.string().nullable().optional(),
  cta_body: glossaryRichText.default([]),
  cta_label: z.string().nullable().optional(),
  cta_link: z
    .object({ link_type: z.literal("Web"), url: webURL })
    .or(z.object({ link_type: z.literal("Any") }))
    .optional(),
});
export const glossaryTermSchema = z.object({
  ...shared,
  term: required,
  short_definition: required,
  definition: body,
  category: z.enum(
    Object.keys(glossaryCategories) as [
      GlossaryCategory,
      ...GlossaryCategory[],
    ],
  ),
  aliases: z.preprocess(
    // Prismic can save an untouched optional Group as [{ alias: null }].
    // Treat that editor placeholder as no alias, while validating entered values.
    (value) =>
      Array.isArray(value)
        ? value.filter(
            (row) =>
              !(
                row &&
                typeof row === "object" &&
                "alias" in row &&
                (row.alias === null ||
                  (typeof row.alias === "string" && !row.alias.trim()))
              ),
          )
        : value,
    z.array(z.object({ alias: required })).default([]),
  ),
  how_it_works: body,
  licensing_relevance: body,
  example: body,
  limitations: body,
  review_questions: z.array(z.object({ question: required })).default([]),
  related_terms: z.array(z.object({ term: relation })).default([]),
  sources: z
    .array(
      z.object({
        label: required,
        url: z.object({ link_type: z.literal("Web"), url: webURL }),
        accessed_on: z.iso.date().nullable().optional(),
      }),
    )
    .min(1),
  reviewer_name: z.string().nullable().optional(),
  reviewer_role: z.string().nullable().optional(),
  last_reviewed: z.iso.date().nullable().optional(),
  show_cta: z.boolean().nullable().default(false),
});
export type GlossaryIndex = z.infer<typeof glossaryIndexSchema>;
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;
export type GlossaryDocument = { id: string; uid: string; data: GlossaryTerm };
export type GlossaryContent = {
  index: GlossaryIndex;
  documents: GlossaryDocument[];
  records: GlossaryRecord[];
  warnings: string[];
};
export function isReviewed(
  data: GlossaryTerm,
  today = new Date().toISOString().slice(0, 10),
) {
  return Boolean(
    data.reviewer_name?.trim() &&
    data.last_reviewed &&
    data.last_reviewed <= today,
  );
}
export function resolveTerms(
  links: { term: z.infer<typeof relation> }[],
  records: GlossaryRecord[],
  self?: string,
) {
  const byID = new Map(records.map((r) => [r.id, r]));
  const seen = new Set<string>();
  return links.flatMap(({ term }) => {
    const record = byID.get(term.id);
    if (term.isBroken || !record || record.id === self || seen.has(record.id))
      return [];
    seen.add(record.id);
    return [record];
  });
}
export async function fetchGlossary(
  client: Client,
  { preview = false, lang = "en-us" } = {},
): Promise<GlossaryContent> {
  const [singleton, docs] = await Promise.all([
    client.getSingle("glossary-index", { lang }),
    // The SDK follows every page; a fresh client keeps a consistent ref for this request.
    client.getAllByType("glossary", { lang, pageSize: 20 }),
  ]);
  if (singleton.lang !== lang || singleton.type !== "glossary-index")
    throw new Error("Invalid glossary singleton locale or type");
  const index = glossaryIndexSchema.parse(singleton.data);
  const warnings: string[] = [];
  const uids = new Set<string>();
  const documents = docs
    .flatMap((doc) => {
      if (
        doc.lang !== lang ||
        !doc.uid ||
        !glossaryUID.test(doc.uid) ||
        uids.has(doc.uid)
      )
        throw new Error("Invalid or duplicate glossary UID/locale");
      uids.add(doc.uid);
      const data = glossaryTermSchema.parse(doc.data);
      if (!isReviewed(data)) {
        if (!preview)
          throw new Error(
            `Published glossary entry has incomplete review: ${doc.uid}`,
          );
        warnings.push(`${data.term}: editorial review is incomplete.`);
      }
      return [{ id: doc.id, uid: doc.uid, data }];
    })
    .sort((a, b) => compareTerms(a.data, b.data));
  const records = documents.map(({ id, uid, data }) => ({
    id,
    uid,
    term: data.term,
    short_definition: data.short_definition,
    category: data.category,
    aliases: [...new Set(data.aliases.map((a) => a.alias))],
    url: `/glossary/${uid}/`,
  }));
  for (const doc of documents) {
    const resolved = resolveTerms(doc.data.related_terms, records, doc.id);
    if (
      resolved.length !== doc.data.related_terms.length ||
      resolved.length < 3 ||
      resolved.length > 5
    )
      warnings.push(
        `${doc.data.term}: check related terms (${resolved.length} available).`,
      );
  }
  if (
    resolveTerms(index.featured_terms, records).length !==
    index.featured_terms.length
  )
    warnings.push("Some featured terms are unavailable.");
  return { index, documents, records, warnings };
}
// Glossary routes are rendered on demand. No process cache, preview cookie, or draft ref
// participates in public reads. Publish/unpublish is reflected on the next Content API read.
export function createGlossaryClient(): Client {
  const repository = import.meta.env.PRISMIC_REPOSITORY_NAME;
  if (!repository) throw new Error("PRISMIC_REPOSITORY_NAME is required");
  return createClient(repository, {
    accessToken: import.meta.env.PRISMIC_ACCESS_TOKEN,
    fetchOptions: { cache: "no-store" },
  });
}
export async function glossarySiteContent(
  client: Client,
  page: Pick<GlossaryTerm, "navigation" | "footer">,
  lang = "en-us",
): Promise<SiteContent> {
  const [site, nav, footer] = await Promise.all([
    fetchSiteContent(client, lang),
    client.getByID(page.navigation.id, { lang }),
    client.getByID(page.footer.id, { lang }),
  ]);
  if (nav.type !== "navigation" || footer.type !== "footer")
    throw new Error("Invalid shared navigation/footer");
  return {
    ...site,
    navigation: parseNavigation(nav.data),
    footer: parseFooter(footer.data),
  };
}
export const glossaryHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};
export function glossaryCTA(index: GlossaryIndex) {
  return index.cta_heading?.trim() &&
    index.cta_label?.trim() &&
    index.cta_body.some((b) => b.text.trim()) &&
    index.cta_link?.link_type === "Web"
    ? {
        heading: index.cta_heading,
        label: index.cta_label,
        body: index.cta_body,
        url: index.cta_link.url,
      }
    : null;
}
export function glossaryRich(value: GlossaryIndex["intro"]): RichTextField {
  return value as RichTextField;
}
