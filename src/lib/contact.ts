import { z } from "zod";
import type { Client } from "@prismicio/client";
import { parseNavigation, parseFooter } from "./content";
import { fetchSiteContent, getSiteContent } from "./prismic";
import contactSeed from "../../prismic/seed/contact.json" with { type: "json" };
import formSeed from "../../prismic/seed/contact-form.json" with { type: "json" };
const text = z.string().trim().min(1);
const relationship = (type: string) =>
  z.object({
    id: text,
    type: z.literal(type),
    link_type: z.literal("Document"),
    isBroken: z.literal(false).optional(),
  });
export const contactSchema = z.object({
  heading: text,
  introduction: text,
  meta_title: text,
  meta_description: text,
  form: relationship("form"),
  navigation: relationship("navigation"),
  footer: relationship("footer"),
});
export const contactFormSchema = z.object({
  title: text,
  description: text,
  name_label: text,
  name_placeholder: text,
  email_label: text,
  email_placeholder: text,
  message_label: text,
  message_placeholder: text,
  honeypot_label: text,
  submit_label: text,
  submitting_label: text,
  success: text,
  save_error: text,
  no_javascript: text,
  privacy_notice: text,
  privacy_link_label: text,
});
export type ContactFormContent = z.infer<typeof contactFormSchema>;
export async function fetchContact(client: Client, lang = "en-us") {
  const page = contactSchema.parse(
    (await client.getSingle("contact", { lang })).data,
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
    throw Error("Invalid Contact page relationship");
  return {
    page,
    form: contactFormSchema.parse(form.data),
    content: {
      ...site,
      navigation: parseNavigation(nav.data),
      footer: parseFooter(footer.data),
    },
  };
}
export async function contactSnapshot() {
  return {
    page: contactSchema.parse(contactSeed),
    form: contactFormSchema.parse(formSeed),
    content: await getSiteContent(),
  };
}
export type ContactContent = Awaited<ReturnType<typeof fetchContact>>;
