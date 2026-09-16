import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  blogArticleSchema,
  blogSlice,
  parseBlogRecords,
} from "../src/lib/blog";
import { previewLinkResolver, supportedPreviewPath } from "../src/lib/preview";
import { includeInStaticSitemap } from "../src/lib/site";
import { assertCorralUnchanged } from "../scripts/corral/audit.mjs";
import {
  canonicalArticleHash,
  publicationPreflight,
  validateRancherContract,
} from "../scripts/corral/engine.mjs";
const img = {
  url: "https://images.prismic.io/rancher/example.png",
  alt: "Test image",
  dimensions: { width: 1200, height: 630 },
};
const rt = [{ type: "paragraph", text: "Fixture text.", spans: [] }];
const ref = { link_type: "Document", id: "shared", isBroken: false };
const data = {
  navigation: ref,
  footer: ref,
  meta_title: "Fixture title",
  meta_description: "Fixture description",
  meta_image: img,
  content_key: "fixture",
  title: [{ type: "heading1", text: "Fixture title", spans: [] }],
  excerpt: "Fixture summary",
  answer_summary: rt,
  topic: "Start here",
  published_at: "2026-09-16T13:00:00+0000",
  updated_at: null,
  author: {
    link_type: "Document",
    id: "author",
    type: "authors",
    isBroken: false,
  },
  slices: [
    {
      slice_type: "text_section",
      primary: { heading: "Section", body: rt },
      items: [],
    },
  ],
  sources: [
    {
      source_title: "NIST",
      source_url: { link_type: "Web", url: "https://www.nist.gov/" },
      accessed_on: "2026-09-15",
    },
  ],
  related_articles: [
    { article: { link_type: "Document", id: "future", isBroken: true } },
  ],
  cta_label: "Contact",
  cta_link: { link_type: "Web", url: "/contact/" },
};
test("Corral excludes drafts and future articles while retaining unpublished related references safely", () => {
  expect(blogArticleSchema.parse(data).related_articles).toHaveLength(1);
  const docs = [
    {
      id: "one",
      uid: "one",
      data,
      first_publication_date: "2026-09-16T13:00:00Z",
    },
    { id: "draft", uid: "draft", data, first_publication_date: null },
  ];
  expect(
    parseBlogRecords(docs, false, Date.parse("2026-09-15T00:00:00Z")),
  ).toHaveLength(0);
  expect(
    parseBlogRecords(docs, false, Date.parse("2026-09-17T00:00:00Z")).map(
      (d) => d.id,
    ),
  ).toEqual(["one"]);
  expect(parseBlogRecords(docs, true)).toHaveLength(2);
  expect(() =>
    blogArticleSchema.parse({
      ...data,
      navigation: { ...ref, isBroken: true },
    }),
  ).toThrow();
});
test("Corral rejects unsafe links, incomplete table cells and missing required social metadata", () => {
  expect(() => blogArticleSchema.parse({ ...data, meta_image: {} })).toThrow();
  expect(() =>
    blogArticleSchema.parse({
      ...data,
      cta_link: { link_type: "Web", url: "javascript:alert(1)" },
    }),
  ).toThrow();
  expect(() =>
    blogSlice.parse({
      slice_type: "comparison_table",
      primary: {
        caption: "Table",
        column_1: "A",
        column_2: "B",
        column_3: "C",
      },
      items: [{ cell_1: "A", cell_2: "B" }],
    }),
  ).toThrow();
  expect(supportedPreviewPath("/blog/")).toBe(true);
  expect(supportedPreviewPath("/blog/example/")).toBe(true);
  expect(previewLinkResolver({ type: "blog-index" } as any)).toBe("/blog/");
  expect(previewLinkResolver({ type: "blog", uid: "example" } as any)).toBe(
    "/blog/example/",
  );
  expect(
    includeInStaticSitemap("https://www.gorancher.com/blog/example/"),
  ).toBe(false);
});
test("Core editor normalization preserves content and refuses a changed table value", () => {
  const expected = {
    published_at: "2026-09-16T13:00:00+0000",
    slices: [
      {
        slice_type: "comparison_table",
        primary: { caption: "Table" },
        items: [{ cell_1: "Original" }],
      },
    ],
  };
  const actual = {
    published_at: "2026-09-16T13:00:00Z",
    slices: [
      {
        key: "comparison_table$uuid",
        value: {
          "non-repeat": { caption: "Table" },
          repeat: [{ cell_1: "Original" }],
        },
      },
    ],
  };
  expect(() =>
    assertCorralUnchanged(actual, expected, "fixture"),
  ).not.toThrow();
  actual.slices[0].value.repeat[0].cell_1 = "Changed";
  expect(() => assertCorralUnchanged(actual, expected, "fixture")).toThrow();
});
test("Content Engine accepts the explicit Rancher contract extension and blocks unapproved publication", async () => {
  const article = JSON.parse(
    await readFile("content/corral/articles/corral-01.json", "utf8"),
  );
  const profile = JSON.parse(
    await readFile("content/corral/rancher-profile.json", "utf8"),
  );
  const qa = JSON.parse(
    await readFile("content/corral/qa/corral-01.json", "utf8"),
  );
  await validateRancherContract("article", article);
  expect(canonicalArticleHash(article)).toBe(article.content_sha256);
  const result = await publicationPreflight({
    article,
    qaReport: qa,
    profile,
    execute: true,
    adapter: {
      id: "prismic-corral",
      canPublish: false,
      preflight: async () => [],
      publish: async () => {
        throw Error("Must never publish");
      },
    },
  });
  expect(result.ready).toBe(false);
  expect(result.errors).toContain(
    "exact-content-hash human approval is required",
  );
  expect(result.errors).toContain("adapter publish capability is disabled");
});

test("articles require an intact author relationship", () => {
  expect(blogArticleSchema.safeParse({...data, author:{...data.author,isBroken:true}}).success).toBe(false);
  expect(blogArticleSchema.safeParse({...data, author:{...data.author,type:'blog'}}).success).toBe(false);
});
