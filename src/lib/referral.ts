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
    form: referralFormSchema.parse(form.data),
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
    form: referralFormSchema.parse(formSeed),
    content: await getSiteContent(),
  };
}
export type ReferralContent = Awaited<ReturnType<typeof fetchReferral>>;
