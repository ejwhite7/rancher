import { createClient, type Client } from "@prismicio/client";
import footerSeed from "../../prismic/seed/footer.json" with { type: "json" };
import navigationSeed from "../../prismic/seed/navigation.json" with { type: "json" };
import homepageSeed from "../../prismic/seed/homepage.json" with { type: "json" };
import formSeed from "../../prismic/seed/form.json" with { type: "json" };
import privacySeed from "../../prismic/seed/privacy-policy.json" with { type: "json" };
import termsSeed from "../../prismic/seed/terms-of-use.json" with { type: "json" };
import {
  validateContent,
  parseHomepage,
  parseForm,
  parseNavigation,
  parseFooter,
  validateLegalContent,
  type SiteContent,
} from "./content";

export async function fetchSiteContent(
  client: Client,
  lang = "en-us",
): Promise<SiteContent> {
  const homepage = await client.getSingle("homepage", { lang });
  const content = parseHomepage(homepage.data);
  const [form, navigation, footer] = await Promise.all([
    client.getByID(content.contact.form.id, { lang }),
    client.getByID(content.navigation.id, { lang }),
    client.getByID(content.footer.id, { lang }),
  ]);
  if (footer.type !== "footer") throw new Error("Invalid footer relationship.");
  if (navigation.type !== "navigation")
    throw new Error("Invalid navigation relationship.");
  if (form.type !== "form")
    throw new Error("Homepage relationship must reference a form document.");
  return {
    homepage: content,
    form: parseForm(form.data),
    navigation: parseNavigation(navigation.data),
    footer: parseFooter(footer.data),
  };
}

let content: Promise<SiteContent> | undefined;
let loadedAt = 0;
export function getSiteContent(): Promise<SiteContent> {
  // Share requests across the components in a production build. In development,
  // read fresh content so a publish is visible on the next page request.
  if (!content || (import.meta.env.DEV && Date.now() - loadedAt > 1000)) {
    loadedAt = Date.now();
    content = loadContent();
  }
  return content;
}

async function loadContent(): Promise<SiteContent> {
  const mode = import.meta.env.PRISMIC_CONTENT_MODE || "prismic";
  if (mode === "snapshot") {
    return validateContent(homepageSeed, formSeed, navigationSeed, footerSeed);
  }
  if (mode !== "prismic")
    throw new Error("PRISMIC_CONTENT_MODE must be prismic or snapshot.");
  const repository = import.meta.env.PRISMIC_REPOSITORY_NAME;
  if (!repository)
    throw new Error(
      "Set PRISMIC_REPOSITORY_NAME. For offline development only, explicitly set PRISMIC_CONTENT_MODE=snapshot.",
    );
  const client = createClient(repository, {
    accessToken: import.meta.env.PRISMIC_ACCESS_TOKEN,
    fetchOptions: { cache: "no-store" },
  });
  return fetchSiteContent(client, import.meta.env.PRISMIC_LOCALE || "en-us");
}

export async function getLegalContent(uid: "privacy-policy" | "terms-of-use") {
  if (import.meta.env.PRISMIC_CONTENT_MODE === "snapshot") {
    return validateLegalContent(
      uid === "privacy-policy" ? privacySeed : termsSeed,
    );
  }
  const repository = import.meta.env.PRISMIC_REPOSITORY_NAME;
  if (!repository)
    throw new Error(
      "Set PRISMIC_REPOSITORY_NAME before fetching legal content.",
    );
  const client = createClient(repository, {
    accessToken: import.meta.env.PRISMIC_ACCESS_TOKEN,
    fetchOptions: { cache: "no-store" },
  });
  const document = await client.getByUID("legal", uid, {
    lang: import.meta.env.PRISMIC_LOCALE || "en-us",
  });
  return validateLegalContent(document.data);
}

export async function getNavigationContent(id: string) {
  if (import.meta.env.PRISMIC_CONTENT_MODE === "snapshot")
    return parseNavigation(navigationSeed);
  const client = createClient(import.meta.env.PRISMIC_REPOSITORY_NAME, {
    accessToken: import.meta.env.PRISMIC_ACCESS_TOKEN,
  });
  const document = await client.getByID(id, {
    lang: import.meta.env.PRISMIC_LOCALE || "en-us",
  });
  if (document.type !== "navigation")
    throw new Error("Invalid navigation relationship.");
  return parseNavigation(document.data);
}

export async function getFooterContent(id: string) {
  if (import.meta.env.PRISMIC_CONTENT_MODE === "snapshot")
    return parseFooter(footerSeed);
  const client = createClient(import.meta.env.PRISMIC_REPOSITORY_NAME, {
    accessToken: import.meta.env.PRISMIC_ACCESS_TOKEN,
  });
  const document = await client.getByID(id, {
    lang: import.meta.env.PRISMIC_LOCALE || "en-us",
  });
  if (document.type !== "footer")
    throw new Error("Invalid footer relationship.");
  return parseFooter(document.data);
}
