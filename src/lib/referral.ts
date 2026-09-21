import { z } from "zod";
import type { Client } from "@prismicio/client";
import { parseNavigation, parseFooter } from "./content";
import { fetchSiteContent, getSiteContent } from "./prismic";
import referralSeed from "../../prismic/seed/referral.json" with { type: "json" };
import formSeed from "../../prismic/seed/referral-form.json" with { type: "json" };
const text = z.string().trim().min(1);
const relationship = (type: string) =>
  z.object({
    id: text,
    type: z.literal(type),
    link_type: z.literal("Document"),
    isBroken: z.literal(false).optional(),
  });
export const referralSchema = z.object({
  heading: text,
  offer_heading: text,
  offer_introduction: text,
  requirements_heading: text,
  requirements: z.array(z.object({ text })).min(1),
  steps_heading: text,
  steps: z.array(z.object({ text })).min(1),
  meta_title: text,
  meta_description: text,
  form: relationship("form"),
  navigation: relationship("navigation"),
  footer: relationship("footer"),
});
const options = z
  .array(z.object({ label: text, value: text.max(120) }))
  .min(1)
  .refine(
    (items) => new Set(items.map((item) => item.value)).size === items.length,
    "Option values must be unique",
  );
export const referralFormSchema = z.object({
  title: text,
  description: text,
  referrer_first_name_label: text,
  referrer_last_name_label: text,
  referrer_email_label: text,
  referral_first_name_label: text,
  referral_last_name_label: text,
  referral_email_label: text,
  referral_company_size_label: text,
  referral_industry_label: text,
  company_size_options: options,
  industry_options: options,
  honeypot_label: text,
  submit_label: text,
  submitting_label: text,
  success: text,
  save_error: text,
  no_javascript: text,
});
export type ReferralFormContent = z.infer<typeof referralFormSchema>;
export function normalizeCompanySizeOptions(form: ReferralFormContent) {
  const firstSmallBand = form.company_size_options.findIndex((option) =>
    ["1–19", "1–10", "11–19"].includes(option.value),
  );
  const remaining = form.company_size_options.filter(
    (option) => !["1–19", "1–10", "11–19"].includes(option.value),
  );
  const insertionIndex = firstSmallBand < 0 ? 0 : firstSmallBand;
  remaining.splice(
    insertionIndex,
    0,
    { label: "1–10", value: "1–10" },
    { label: "11–19", value: "11–19" },
  );
  return { ...form, company_size_options: remaining };
}
export async function fetchReferral(client: Client, lang = "en-us") {
  const page = referralSchema.parse(
    (await client.getSingle("referral", { lang })).data,
  );
  const [form, nav, footer, site] = await Promise.all([
    client.getByID(page.form.id, { lang }),
    client.getByID(page.navigation.id, { lang }),
    client.getByID(page.footer.id, { lang }),
    fetchSiteContent(client, lang),
  ]);
  if (
    form.type !== "form" ||
    nav.type !== "navigation" ||
    footer.type !== "footer"
  )
    throw Error("Invalid Referral page relationship");
  return {
    page,
    form: normalizeCompanySizeOptions(referralFormSchema.parse(form.data)),
    content: {
      ...site,
      navigation: parseNavigation(nav.data),
      footer: parseFooter(footer.data),
    },
  };
}
export async function referralSnapshot() {
  return {
    page: referralSchema.parse(referralSeed),
    form: normalizeCompanySizeOptions(referralFormSchema.parse(formSeed)),
    content: await getSiteContent(),
  };
}
export type ReferralContent = Awaited<ReturnType<typeof fetchReferral>>;
