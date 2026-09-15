import { test, expect } from "@playwright/test";
import {
  glossaryTermSchema,
  glossaryIndexSchema,
  isReviewed,
  resolveTerms,
  glossaryUID,
} from "../src/lib/glossary";
import { filterGlossary, normalizeSearch } from "../src/lib/glossary-search";
import {
  loadDrafts,
  validateDrafts,
  termData,
  indexData,
  manifest,
} from "../scripts/glossary-content.mjs";
import { assertUnchanged } from "../scripts/glossary-audit.mjs";
import { supportedPreviewPath, previewLinkResolver } from "../src/lib/preview";
const shared = {
  navigation: { link_type: "Document", id: "nav" },
  footer: { link_type: "Document", id: "footer" },
};
test("60 original drafts match the model, categories, aliases, source contract, and related manifest", async () => {
  const drafts = await loadDrafts();
  validateDrafts(drafts, { complete: true });
  expect(drafts).toHaveLength(60);
  expect(manifest.filter((m: any) => m.source === "B")).toHaveLength(28);
  const ids = Object.fromEntries(drafts.map((d: any) => [d.uid, d.uid]));
  const titles = new Set();
  const descriptions = new Set();
  for (const d of drafts) {
    const data = glossaryTermSchema.parse(termData(d, shared, ids));
    expect(isReviewed(data)).toBe(true);
    expect(data.related_terms.length).toBeGreaterThanOrEqual(3);
    expect(data.related_terms.length).toBeLessThanOrEqual(5);
    titles.add(data.meta_title);
    descriptions.add(data.meta_description);
  }
  expect(titles.size).toBe(60);
  expect(descriptions.size).toBe(60);
  expect(() =>
    validateDrafts(drafts, { complete: true, reviewed: true }),
  ).not.toThrow();
  expect(
    glossaryIndexSchema.parse(indexData(shared, ids)).featured_terms,
  ).toHaveLength(6);
});
test("publication metadata, invalid categories, malicious source links, and duplicate relationships are checked", async () => {
  const [draft] = await loadDrafts();
  const data = termData(draft, shared);
  expect(
    glossaryTermSchema.parse({
      ...data,
      aliases: [{ alias: null }, { alias: " " }, { alias: "Valid alias" }],
    }).aliases,
  ).toEqual([{ alias: "Valid alias" }]);
  expect(
    glossaryTermSchema.safeParse({ ...data, category: "invented" }).success,
  ).toBe(false);
  expect(
    glossaryTermSchema.safeParse({
      ...data,
      sources: [
        {
          label: "unsafe",
          url: { link_type: "Web", url: "javascript:alert(1)" },
        },
      ],
    }).success,
  ).toBe(false);
  expect(
    isReviewed({
      ...glossaryTermSchema.parse(data),
      reviewer_name: "Reviewer",
      last_reviewed: "2999-01-01",
    }),
  ).toBe(false);
  const records = [
    {
      id: "a",
      uid: "a",
      url: "/glossary/a/",
      term: "A",
      short_definition: "A definition",
      category: "licensing-economics" as const,
      aliases: [],
    },
    {
      id: "b",
      uid: "b",
      url: "/glossary/b/",
      term: "B",
      short_definition: "B definition",
      category: "licensing-economics" as const,
      aliases: [],
    },
  ];
  const links = ["a", "b", "b", "missing"].map((id) => ({
    term: { link_type: "Document" as const, id },
  }));
  expect(resolveTerms(links, records, "a").map((r) => r.id)).toEqual(["b"]);
});
test("search normalization and exact alias ranking remain deterministic", () => {
  expect(normalizeSearch("  DÉTAILED   Data ")).toBe("detailed data");
  const records = [
    {
      id: "a",
      uid: "a",
      url: "/glossary/a/",
      term: "A reference",
      short_definition: "mentions PII",
      category: "licensing-economics" as const,
      aliases: [],
    },
    {
      id: "b",
      uid: "b",
      url: "/glossary/b/",
      term: "Personal information",
      short_definition: "A definition",
      category: "rights-privacy-control" as const,
      aliases: ["PII", "PII"],
    },
  ];
  expect(filterGlossary(records, "PII", "").map((r) => r.id)).toEqual([
    "b",
    "a",
  ]);
  expect(filterGlossary(records, "PII", "rights-privacy-control")).toHaveLength(
    1,
  );
  expect(filterGlossary(records, "absent", "")).toHaveLength(0);
});
test("route whitelist rejects invalid UIDs and external redirects", () => {
  for (const path of ["/glossary/", "/glossary/data-licensing/"])
    expect(supportedPreviewPath(path)).toBe(true);
  for (const path of [
    "//evil.example/",
    "/glossary/../../",
    "/glossary/a/b/",
    "/glossary/a%2fb/",
  ])
    expect(supportedPreviewPath(path)).toBe(false);
  expect(glossaryUID.test("Data Licensing")).toBe(false);
  expect(glossaryUID.test("data-licensing")).toBe(true);
  expect(previewLinkResolver({ type: "glossary-index" } as any)).toBe(
    "/glossary/",
  );
  expect(
    previewLinkResolver({ type: "glossary", uid: "data-licensing" } as any),
  ).toBe("/glossary/data-licensing/");
});
test("repeat imports tolerate editor encoding but refuse content changes", () => {
  const expected = {
    term: "Data licensing",
    definition: [{ type: "paragraph", text: "Original text", spans: [] }],
    navigation: { link_type: "Document", id: "nav" },
    reviewer_name: "",
    social_image: {},
  };
  const encoded = {
    term: "Data licensing",
    definition: [
      { type: "paragraph", content: { text: "Original text", spans: [] } },
    ],
    navigation: { kind: "document", id: "nav", key: "generated" },
    term_TYPE: "Text",
    term_POSITION: 1,
  };
  expect(() =>
    assertUnchanged(encoded, expected, "data-licensing"),
  ).not.toThrow();
  expect(() =>
    assertUnchanged(
      { ...encoded, term: "Editor revision" },
      expected,
      "data-licensing",
    ),
  ).toThrow(/Refusing overwrite/);
});
