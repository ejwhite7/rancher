import { test, expect } from "@playwright/test";
import {
  glossaryTermSchema,
  glossaryIndexSchema,
  isReviewed,
  resolveTerms,
  glossaryUID,
  fetchGlossary,
  glossaryCTA,
} from "../src/lib/glossary";
import { filterGlossary, normalizeSearch } from "../src/lib/glossary-search";
import {
  loadDrafts,
  validateDrafts,
  termData,
  indexData,
  manifest,
} from "../scripts/glossary-content.mjs";
import {
  assertUnchanged,
  auditTracked,
  normalizedContent,
} from "../scripts/glossary-audit.mjs";
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
function expectOrderedDraftErrors(draft: any) {
  const invalid = {
    ...draft,
    uid: "unknown",
    short: " ",
    definition: "",
    how: "",
    relevance: "",
    example: "",
    limitations: "",
    sources: ["missing"],
    related: [],
    questions: [],
    reviewer_name: " ",
    last_reviewed: "2999-01-01",
  };
  expect(() =>
    validateDrafts([invalid], { complete: true, reviewed: true }),
  ).toThrow(
    [
      "unknown: unknown or duplicate",
      "unknown: empty short",
      "unknown: empty definition",
      "unknown: empty how",
      "unknown: empty relevance",
      "unknown: empty example",
      "unknown: empty limitations",
      "unknown: label the fictional example",
      "unknown: invalid sources",
      "unknown: invalid related terms",
      "unknown: missing practical questions",
      "unknown: completed review required",
      "Expected 60 entries; found 1",
    ].join("\n"),
  );
}

function expectDraftRelationshipGuards(draft: any) {
  for (const related of [
    undefined,
    [],
    [draft.uid, ...draft.related.slice(0, 2)],
    [draft.related[0], draft.related[0], draft.related[1]],
    ["unknown", ...draft.related.slice(0, 2)],
    [...draft.related, ...draft.related],
  ]) {
    expect(() => validateDrafts([{ ...draft, related }])).toThrow(
      "invalid related terms",
    );
  }
}

function expectDraftReviewGuards(draft: any) {
  for (const review of [
    { reviewer_name: " " },
    { last_reviewed: null },
    { last_reviewed: "2999-01-01" },
  ]) {
    expect(() => validateDrafts([{ ...draft, ...review }])).not.toThrow();
    expect(() =>
      validateDrafts([{ ...draft, ...review }], { reviewed: true }),
    ).toThrow("completed review required");
  }
  expect(() => validateDrafts([draft, draft])).toThrow(
    `${draft.uid}: unknown or duplicate`,
  );
}

test("draft validation preserves ordered errors and related/review guard semantics", async () => {
  const [draft] = await loadDrafts();
  expectOrderedDraftErrors(draft);
  expectDraftRelationshipGuards(draft);
  expectDraftReviewGuards(draft);
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
test("glossary reads preserve validation order, preview warnings and sorted records", async () => {
  const drafts = (await loadDrafts()).slice(0, 2);
  const ids = Object.fromEntries(drafts.map((d: any) => [d.uid, d.uid]));
  const singleton = {
    lang: "en-us",
    type: "glossary-index",
    data: {
      ...indexData(shared, ids),
      featured_terms: [{ term: { link_type: "Document", id: "missing" } }],
    },
  };
  const docs = drafts.map((d: any) => ({
    id: d.uid,
    uid: d.uid,
    lang: "en-us",
    data: termData(d, shared, ids),
  }));
  const calls: unknown[] = [];
  const read = (entries = docs, index = singleton, preview = false) =>
    fetchGlossary(
      {
        getSingle: async (...args: unknown[]) => {
          calls.push(args);
          return index;
        },
        getAllByType: async (...args: unknown[]) => {
          calls.push(args);
          return entries;
        },
      } as any,
      { preview },
    );
  const content = await read();
  expect(calls).toEqual([
    ["glossary-index", { lang: "en-us" }],
    ["glossary", { lang: "en-us", pageSize: 20 }],
  ]);
  expect(content.records.map((r) => r.uid)).toEqual(
    content.documents.map((d) => d.uid),
  );
  const unreviewed = {
    ...docs[0],
    data: { ...docs[0].data, reviewer_name: " " },
  };
  await expect(read([unreviewed])).rejects.toThrow(
    `Published glossary entry has incomplete review: ${docs[0].uid}`,
  );
  const preview = await read([unreviewed], singleton, true);
  expect(preview.warnings).toEqual([
    `${docs[0].data.term}: editorial review is incomplete.`,
    `${docs[0].data.term}: check related terms (0 available).`,
    "Some featured terms are unavailable.",
  ]);
  for (const invalid of [
    { ...docs[0], lang: "fr-fr" },
    { ...docs[0], uid: null },
    { ...docs[0], uid: "Bad UID" },
  ]) {
    await expect(read([invalid] as any)).rejects.toThrow(
      "Invalid or duplicate glossary UID/locale",
    );
  }
  await expect(read([docs[0], docs[0]])).rejects.toThrow(
    "Invalid or duplicate glossary UID/locale",
  );
  await expect(
    read([unreviewed], { ...singleton, lang: "fr-fr" }),
  ).rejects.toThrow("Invalid glossary singleton locale or type");
});

test("glossary CTA requires every field without trimming returned copy", async () => {
  const index = glossaryIndexSchema.parse(indexData(shared));
  const complete = {
    ...index,
    cta_heading: " Heading ",
    cta_label: " Label ",
    cta_body: [{ type: "paragraph" as const, text: " Body ", spans: [] }],
    cta_link: { link_type: "Web" as const, url: "https://example.com" },
  };
  expect(glossaryCTA(complete)).toEqual({
    heading: " Heading ",
    label: " Label ",
    body: complete.cta_body,
    url: "https://example.com",
  });
  for (const missing of [
    { cta_heading: " " },
    { cta_label: null },
    { cta_body: [] },
    { cta_link: { link_type: "Any" as const } },
  ])
    expect(glossaryCTA({ ...complete, ...missing })).toBeNull();
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
function expectNormalizedAuditShape() {
  expect(
    normalizedContent({
      z: [{ kind: "web", url: "https://example.com", key: "ignored" }],
      a: { kind: "document", id: "nav" },
      empty: [],
      direction: "rtl",
      field_INTERNAL: "ignored",
      prose: { type: "paragraph", content: { text: "Text", spans: [] } },
    }),
  ).toEqual({
    a: { id: "nav" },
    prose: { text: "Text", type: "paragraph" },
    z: [{ url: "https://example.com" }],
  });
}

test("glossary audit preserves normalized shapes, ordered versions and refusal gates", async () => {
  expectNormalizedAuditShape();
  const checkpoint = {
    documents: {
      term: { id: "term-id", uid: "term", data: { term: "Original" } },
      index: { id: "index-id", data: { title: "Index" } },
    },
  };
  const docs = [
    {
      id: "term-id",
      locale: "en-us",
      custom_type_id: "glossary",
      versions: [
        { version_id: "v1", uid: "term" },
        { version_id: "v2", uid: "term" },
      ],
    },
    {
      id: "index-id",
      locale: "en-us",
      custom_type_id: "glossary-index",
      versions: [{ version_id: "v3" }],
    },
  ];
  const calls: string[] = [];
  const editor = async (path: string) => {
    calls.push(path);
    if (path === "core/documents/search") return { total: 2, results: docs };
    return path.endsWith("v3")
      ? { title: "Index" }
      : { term: "Original", uid: "term" };
  };
  const snapshots = await auditTracked(editor, checkpoint, "en-us");
  expect(
    snapshots.map((s: any) => [s.id, s.key, s.version.version_id]),
  ).toEqual([
    ["term-id", "term", "v1"],
    ["term-id", "term", "v2"],
    ["index-id", "index", "v3"],
  ]);
  expect(calls).toEqual([
    "core/documents/search",
    "core/documents/data/v1",
    "core/documents/data/v2",
    "core/documents/data/v3",
  ]);
  await expectAuditRefusals(checkpoint, docs);
});

async function expectAuditRefusals(checkpoint: any, docs: any[]) {
  for (const [response, message] of [
    [{ total: 3, results: docs }, "Unexpected audit pagination"],
    [
      { total: 1, results: [{ ...docs[0], locale: "fr-fr" }] },
      "Unexpected glossary locale",
    ],
    [
      { total: 1, results: [{ ...docs[0], id: "unknown" }] },
      "Untracked glossary document term",
    ],
    [{ total: 0, results: [] }, "Tracked document term-id is missing"],
  ] as const) {
    await expect(
      auditTracked(async () => response, checkpoint, "en-us"),
    ).rejects.toThrow(message);
  }
  await expect(
    auditTracked(
      async (path: string) =>
        path === "core/documents/search"
          ? { total: 2, results: docs }
          : { term: "Changed" },
      checkpoint,
      "en-us",
    ),
  ).rejects.toThrow("Refusing overwrite");
}

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
