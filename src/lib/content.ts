import { z } from "zod";
import { asHTML, asText, type RichTextField } from "@prismicio/client";
import formSeed from "../../prismic/seed/form.json" with { type: "json" };
import { CONSENT_TEXT } from "./submission";
const text = z.string().min(1);
const safeUrl = z
  .string()
  .refine(
    (value) => /^(https?:\/\/|mailto:|#|\/(?!\/))/.test(value),
    "Unsupported link destination",
  );
const link = z
  .object({ link_type: z.literal("Web"), url: safeUrl })
  .transform((value) => value.url);
export const richTextSchema = z
  .array(
    z.object({
      type: z.enum([
        "heading1",
        "heading2",
        "heading3",
        "paragraph",
        "list-item",
        "o-list-item",
      ]),
      text: z.string(),
      spans: z.array(
        z.object({
          type: z.enum(["strong", "em", "hyperlink"]),
          start: z.number().int().nonnegative(),
          end: z.number().int().nonnegative(),
          data: z
            .object({ link_type: z.literal("Web"), url: safeUrl })
            .optional(),
        }),
      ),
    }),
  )
  .min(1);
export type RichText = z.infer<typeof richTextSchema>;
export const richHtml = (value: RichText) => asHTML(value as RichTextField);
export const richText = (value: RichText) => asText(value as RichTextField);
const imageSchema = z.object({
  url: safeUrl,
  alt: text,
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});
const relationship = z.object({
  id: text,
  type: z.literal("form"),
  link_type: z.literal("Document"),
  isBroken: z.literal(false).optional(),
});
const body = richTextSchema;
const title = richTextSchema;
const cta = { cta_label: text, cta_link: link };
export const navigationSchema = z.object({
  brand_name: text,
  brand_label: text,
  menu_label: text,
  nav_label: text,
  ...cta,
  items: z.array(z.object({ label: text, link })).min(1),
});
export type NavigationContent = z.infer<typeof navigationSchema>;
export const parseNavigation = (data: unknown): NavigationContent =>
  navigationSchema.parse(data);
const navigationRelationship = z.object({
  id: text,
  type: z.literal("navigation"),
  link_type: z.literal("Document"),
  isBroken: z.literal(false).optional(),
});
export const footerSchema = z.object({
  brand_name: text,
  brand_label: text,
  copyright: text,
  nav_label: text,
  faq_label: text,
  privacy_label: text,
  terms_label: text,
  information_label: text,
  ...cta,
  dialog_heading: text,
  dialog_body: body,
  close_label: text,
});
export type FooterContent = z.infer<typeof footerSchema>;
export const parseFooter = (data: unknown): FooterContent =>
  footerSchema.parse(data);
const footerRelationship = z.object({
  id: text,
  type: z.literal("footer"),
  link_type: z.literal("Document"),
  isBroken: z.literal(false).optional(),
});
const sectionSchemas = {
  hero: z.object({
    heading: title,
    description: body,
    ...cta,
    secondary_label: text,
    secondary_link: link,
    illustration_alt: text,
    source_label: text,
    source_caption: text,
    outcome_label: text,
    outcome_caption: text,
    trust_heading: text,
    items: z.array(z.object({ text })).min(1),
  }),
  opportunity: z.object({ eyebrow: text, heading: title, lead: body, body }),
  calculator: z.object({
    heading: title,
    estimate_label: text,
    below_floor_label: text,
    disclaimer: text,
    employees_label: text,
    years_label: text,
    years_min_label: text,
    years_max_label: text,
    region_label: text,
    usa_label: text,
    canada_label: text,
    europe_label: text,
    other_label: text,
    ...cta,
  }),
  data_categories: z.object({
    heading: title,
    note: body,
    tabs_label: text,
    signal_label: text,
    items: z
      .array(
        z.object({
          label: text,
          title: text,
          description: text,
          examples: body,
          signal: text,
        }),
      )
      .min(1),
  }),
  use_cases: z.object({
    heading: title,
    description: body,
    custom_eyebrow: text,
    custom_title: text,
    custom_description: body,
    ...cta,
    note: body,
    items: z
      .array(
        z.object({
          title: text,
          description: text,
          platforms: text,
          image: imageSchema,
        }),
      )
      .min(1),
  }),
  process: z.object({
    eyebrow: text,
    heading: title,
    description: body,
    ...cta,
    items: z.array(z.object({ title: text, description: text })).min(1),
  }),
  protection: z.object({
    eyebrow: text,
    heading: title,
    description: body,
    checks: z.array(z.object({ text })).min(1),
    demo_heading: text,
    source_label: text,
    source_record: body,
    prepared_label: text,
    prepared_record: body,
    items: z.array(z.object({ title: text, description: text })).min(1),
  }),
  faq: z.object({
    heading: title,
    description: body,
    items: z.array(z.object({ question: text, answer: body })).min(1),
  }),
  contact: z.object({
    eyebrow: text,
    heading: title,
    description: body,
    note: body,
    form: relationship,
  }),
};
export const SECTION_ORDER = [
  "hero",
  "opportunity",
  "calculator",
  "data_categories",
  "use_cases",
  "process",
  "protection",
  "faq",
  "contact",
] as const;
export type SectionName = (typeof SECTION_ORDER)[number];
const homepageSchema = z.object({
  title: text,
  meta_title: text,
  meta_description: text,
  social_image: imageSchema,
  section_order: z.array(z.enum(SECTION_ORDER)),
  navigation: navigationRelationship,
  footer: footerRelationship,
  ...sectionSchemas,
});
export type HomepageContent = z.infer<typeof homepageSchema>;
export type CalculatorContent = HomepageContent["calculator"];
export type DataTabsContent = HomepageContent["data_categories"];
export type FormContent = typeof formSeed;
export interface SiteContent {
  homepage: HomepageContent;
  form: FormContent;
  navigation: NavigationContent;
  footer: FooterContent;
}
const formSchema = z.object(
  Object.fromEntries(Object.keys(formSeed).map((key) => [key, text])),
);
export function parseHomepage(data: unknown): HomepageContent {
  const raw = z
    .object({
      navigation: navigationRelationship,
      footer: footerRelationship,
      title: text,
      meta_title: text,
      meta_description: text,
      social_image: imageSchema,
      slices: z.array(
        z.object({
          slice_type: z.enum(SECTION_ORDER),
          variation: z.literal("default"),
          primary: z.record(z.string(), z.unknown()),
          items: z.array(z.record(z.string(), z.unknown())),
        }),
      ),
    })
    .parse(data);
  const order = raw.slices.map((s) => s.slice_type);
  if (
    new Set(order).size !== SECTION_ORDER.length ||
    order.length !== SECTION_ORDER.length ||
    order[0] !== "hero" ||
    order.at(-1) !== "contact"
  )
    throw new Error(
      "Homepage requires all 9 unique page sections, with Hero first and Contact last.",
    );
  return homepageSchema.parse({
    ...raw,
    section_order: order,
    ...Object.fromEntries(
      raw.slices.map((s) => [s.slice_type, { ...s.primary, items: s.items }]),
    ),
  });
}
export function parseForm(data: unknown): FormContent {
  const form = formSchema.parse(data) as FormContent;
  if (form.consent !== CONSENT_TEXT)
    throw new Error(
      "Prismic form consent must match CONSENT_TEXT in src/lib/submission.ts.",
    );
  return form;
}
export function validateContent(
  homepage: unknown,
  form: unknown,
  navigation: unknown,
  footer: unknown,
): SiteContent {
  return {
    homepage: parseHomepage(homepage),
    form: parseForm(form),
    navigation: parseNavigation(navigation),
    footer: parseFooter(footer),
  };
}
const legalSchema = z.object({
  navigation: navigationRelationship,
  footer: footerRelationship,
  title: z.string().min(1),
  description: z.string().min(1),
  body: z
    .array(
      z.object({
        type: z.enum([
          "paragraph",
          "heading2",
          "heading3",
          "list-item",
          "o-list-item",
        ]),
        text: z.string(),
        spans: z.array(
          z.object({
            start: z.number().int().nonnegative(),
            end: z.number().int().nonnegative(),
            type: z.enum(["strong", "em", "hyperlink"]),
            data: z
              .object({
                link_type: z.literal("Web"),
                url: z
                  .string()
                  .refine(
                    (url) => /^https?:\/\//.test(url) || /^\/(?!\/)/.test(url),
                  ),
              })
              .optional(),
          }),
        ),
      }),
    )
    .min(1),
  operator: z.string().min(1),
  contact_email: z
    .union([z.literal(""), z.email()])
    .nullish()
    .transform((value) => value || ""),
  updated: z.iso.date(),
  updated_label: z.string().min(1),
});
export function validateLegalContent(data: unknown) {
  return legalSchema.parse(data);
}
export type LegalContent = ReturnType<typeof validateLegalContent>;
