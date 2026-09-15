import { test, expect } from "@playwright/test";
import { createClient } from "@prismicio/client";
import homepageSeed from "../prismic/seed/homepage.json" with { type: "json" };
import navigationSeed from "../prismic/seed/navigation.json" with { type: "json" };
import footerSeed from "../prismic/seed/footer.json" with { type: "json" };
import formSeed from "../prismic/seed/form.json" with { type: "json" };
import homepageModel from "../customtypes/homepage/index.json" with { type: "json" };
import formModel from "../customtypes/form/index.json" with { type: "json" };
import {
  validateContent,
  validateLegalContent,
  parseNavigation,
  parseFooter,
  richText,
  SECTION_ORDER,
} from "../src/lib/content";
import { fetchSiteContent } from "../src/lib/prismic";
import { structuredData } from "../src/lib/seo";

const document = (id: string, type: string, data: unknown) => ({
  id,
  type,
  uid: type === "form" ? "partnership" : null,
  lang: "en-us",
  data,
  url: null,
  href: "",
  tags: [],
  alternate_languages: [],
  linked_documents: [],
  first_publication_date: "2026-09-15T00:00:00+0000",
  last_publication_date: "2026-09-15T00:00:00+0000",
});

function mockClient(
  homepage: unknown,
  form: unknown,
  navigation: unknown = navigationSeed,
  footer: unknown = footerSeed,
) {
  const queries: string[] = [];
  const client = createClient("rancher-test", {
    fetch: async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v2")
        return Response.json({
          refs: [
            {
              id: "master",
              ref: "published-ref",
              label: "Master",
              isMasterRef: true,
            },
          ],
          types: { homepage: "Homepage", form: "Form" },
          languages: [{ id: "en-us", name: "English" }],
          tags: [],
        });
      const query = url.searchParams.get("q") || "";
      queries.push(query);
      const result = query.includes('document.type, "homepage"')
        ? homepage
        : query.includes("snapshot-navigation")
          ? document("snapshot-navigation", "navigation", navigation)
          : query.includes("snapshot-footer")
            ? document("snapshot-footer", "footer", footer)
            : form;
      return Response.json({
        results: result ? [result] : [],
        results_size: result ? 1 : 0,
        results_per_page: 20,
        page: 1,
        total_results_size: result ? 1 : 0,
        total_pages: result ? 1 : 0,
        next_page: null,
        prev_page: null,
      });
    },
  });
  return { client, queries };
}

test("published Prismic content supplies the linked form, island props, and FAQ schema", async () => {
  const homepage = structuredClone(homepageSeed);
  homepage.meta_title = "Edited Prismic title";
  const faq = homepage.slices.find((s) => s.slice_type === "faq")!;
  faq.items = [
    {
      question: "An edited question?",
      answer: [{ type: "paragraph", text: "An edited answer.", spans: [] }],
    },
  ] as typeof faq.items;
  const categories = homepage.slices.find(
    (s) => s.slice_type === "data_categories",
  )!;
  (categories.items[0] as { title: string }).title = "Edited dataset title";
  homepage.slices.find((s) => s.slice_type === "contact")!.primary.form!.id =
    "linked-form-id";
  const form = { ...formSeed, title: "Talk to our team" };
  const { client, queries } = mockClient(
    document("home-id", "homepage", homepage),
    document("linked-form-id", "form", form),
  );
  const result = await fetchSiteContent(client);
  expect(queries[1]).toContain("linked-form-id");
  expect(queries[2]).toContain("snapshot-navigation");
  expect(result.navigation.items).toHaveLength(4);
  expect(result.homepage.meta_title).toBe("Edited Prismic title");
  expect(result.form.title).toBe("Talk to our team");
  expect(result.homepage.data_categories.items[0].title).toBe(
    "Edited dataset title",
  );
  const site = new URL("https://rancher.example/");
  const schema = structuredData(
    site,
    site,
    { title: homepage.meta_title, description: homepage.meta_description },
    result.homepage.faq.items.map((item) => ({
      question: item.question,
      answer: richText(item.answer),
    })),
  );
  expect(JSON.stringify(schema)).toContain("An edited answer.");
});

test("missing documents, broken relationships, and incomplete copy fail instead of falling back", async () => {
  const broken = structuredClone(homepageSeed);
  broken.slices.find(
    (s) => s.slice_type === "contact",
  )!.primary.form!.isBroken = true;
  await expect(
    fetchSiteContent(
      mockClient(document("home", "homepage", broken), null).client,
    ),
  ).rejects.toThrow();
  expect(() =>
    validateContent(
      { ...homepageSeed, slices: homepageSeed.slices.slice(1) },
      formSeed,
      navigationSeed,
      footerSeed,
    ),
  ).toThrow();
  expect(() =>
    validateContent(
      homepageSeed,
      {
        ...formSeed,
        consent: "Different consent",
      },
      navigationSeed,
      footerSeed,
    ),
  ).toThrow("CONSENT_TEXT");
});

test("every seed field is modeled and the homepage is a singleton linked to a repeatable form", () => {
  expect(homepageModel.repeatable).toBe(false);
  expect(formModel.repeatable).toBe(true);
  expect(Object.keys(homepageModel.json)).toEqual(["Main"]);
  expect(Object.keys(homepageModel.json.Main.slices.config.choices)).toEqual([
    ...SECTION_ORDER,
  ]);
  const content = validateContent(
    homepageSeed,
    formSeed,
    navigationSeed,
    footerSeed,
  ).homepage;
  expect(content.section_order).toEqual([...SECTION_ORDER]);
  expect(content.use_cases.items).toHaveLength(8);
  expect(content.data_categories.items).toHaveLength(4);
  expect(content.process.items).toHaveLength(4);
  expect(content.faq.items).toHaveLength(6);
  expect(content.hero.heading).toHaveLength(1);
  for (const [model, seed] of [
    [homepageModel, homepageSeed],
    [formModel, formSeed],
  ] as const) {
    const fields = Object.assign({}, ...Object.values(model.json));
    for (const key of Object.keys(seed))
      expect(fields[key], `${model.id}.${key}`).toBeDefined();
  }
  expect(() =>
    validateContent(homepageSeed, formSeed, navigationSeed, footerSeed),
  ).not.toThrow();
});

test("legal documents keep their own content and reject unsafe links", async () => {
  const { readFile } = await import("node:fs/promises");
  const model = JSON.parse(
    await readFile("customtypes/legal/index.json", "utf8"),
  );
  expect(model.repeatable).toBe(true);
  for (const uid of ["privacy-policy", "terms-of-use"]) {
    const seed = JSON.parse(await readFile(`prismic/seed/${uid}.json`, "utf8"));
    const legal = validateLegalContent(seed);
    expect(legal.body.length).toBeGreaterThan(10);
    expect(legal.updated).toBe("2026-09-14");
    expect(() =>
      validateLegalContent({
        ...seed,
        body: [
          {
            type: "paragraph",
            text: "Bad link",
            spans: [
              {
                start: 0,
                end: 8,
                type: "hyperlink",
                data: { link_type: "Web", url: "javascript:alert(1)" },
              },
            ],
          },
        ],
      }),
    ).toThrow();
  }
  expect(
    Object.keys(homepageSeed).some((key) =>
      /^(privacy_|terms_|legal_)/.test(key),
    ),
  ).toBe(false);
});

test("navigation is a reusable singleton referenced by page types", async () => {
  const { readFile } = await import("node:fs/promises");
  const model = JSON.parse(
    await readFile("customtypes/navigation/index.json", "utf8"),
  );
  expect(model.repeatable).toBe(false);
  for (const type of ["homepage", "legal"]) {
    const page = JSON.parse(
      await readFile(`customtypes/${type}/index.json`, "utf8"),
    );
    expect(page.json.Main.navigation.config.customtypes).toEqual([
      "navigation",
    ]);
  }
  expect(homepageSeed.slices.some((s) => s.slice_type === "navigation")).toBe(
    false,
  );
  const edited = { ...navigationSeed, cta_label: "Shared navigation edit" };
  const result = await fetchSiteContent(
    mockClient(
      document("home", "homepage", homepageSeed),
      document("snapshot-form", "form", formSeed),
      edited,
    ).client,
  );
  expect(result.navigation.cta_label).toBe("Shared navigation edit");
  expect(() => parseNavigation({ ...navigationSeed, items: [] })).toThrow();
  expect(() =>
    parseNavigation({
      ...navigationSeed,
      cta_link: { link_type: "Web", url: "javascript:alert(1)" },
    }),
  ).toThrow();
});

test("footer is a reusable singleton and supplies the shared dialog content", async () => {
  const { readFile } = await import("node:fs/promises");
  const model = JSON.parse(
    await readFile("customtypes/footer/index.json", "utf8"),
  );
  expect(model.repeatable).toBe(false);
  for (const type of ["homepage", "legal"]) {
    const page = JSON.parse(
      await readFile(`customtypes/${type}/index.json`, "utf8"),
    );
    expect(page.json.Main.footer.config.customtypes).toEqual(["footer"]);
  }
  expect(homepageSeed.slices.some((s) => s.slice_type === "footer")).toBe(
    false,
  );
  const edited = {
    ...footerSeed,
    dialog_heading: "Shared footer edit",
    items: [
      {
        label: "Editor added link",
        link: { link_type: "Web", url: "/glossary/" },
      },
    ],
  };
  const result = await fetchSiteContent(
    mockClient(
      document("home", "homepage", homepageSeed),
      document("snapshot-form", "form", formSeed),
      navigationSeed,
      edited,
    ).client,
  );
  expect(result.footer.dialog_heading).toBe("Shared footer edit");
  expect(result.footer.items).toEqual([
    { label: "Editor added link", link: "/glossary/" },
  ]);
  expect(model.json.Main.items.type).toBe("Group");
  expect(() => parseFooter({ ...footerSeed, dialog_body: [] })).toThrow();
  const broken = {
    ...homepageSeed,
    footer: { ...homepageSeed.footer, isBroken: true },
  };
  await expect(
    fetchSiteContent(
      mockClient(document("home", "homepage", broken), null).client,
    ),
  ).rejects.toThrow();
});
