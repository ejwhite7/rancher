import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Evaluate only private helpers with mocks: never execute CMS/authentication entrypoints.
test("schedule move preserves release preference, integrity checks and mutation order", async () => {
  const source = readFileSync("scripts/corral/activate-schedule.mjs", "utf8");
  const documents: Record<string, any> = {
    article: { id: "doc", uid: "article", data: { title: "Approved" } },
    "author-edward-white": { id: "author", data: { name: "Edward" } },
  };
  let versions: any[] = [];
  const calls: any[] = [];
  let rejectIntegrity = false;
  const vmMove = runInNewContext(
    `${source.slice(source.indexOf("function releaseVersion"), source.indexOf("for (let i = 0; i < items.length; i++)"))}; move`,
    {
      checkpoint: { documents },
      editor: async (...args: any[]) => {
        calls.push(args);
        return args[0].startsWith("documents/data/")
          ? { actual: true }
          : { versions };
      },
      assertUnchanged: (...args: any[]) => {
        calls.push(["assert", ...args]);
        if (rejectIntegrity) throw Error("integrity refused");
      },
    },
  );
  const move = async (key: string, releaseId: string) => vmMove(key, releaseId);
  await expect(move("missing", "target")).rejects.toThrow(
    "Missing launch document missing",
  );
  expect(calls).toEqual([]);
  await expect(move("article", "target")).rejects.toThrow(
    "No release draft for article",
  );
  versions = [
    { status: "release", release_id: "other", version_id: "fallback" },
    { status: "release", release_id: "target", version_id: "preferred" },
  ];
  calls.length = 0;
  expect(await move("article", "target")).toBe(1);
  expect(calls.map((c) => c[0])).toEqual([
    "documents/doc",
    "documents/data/preferred",
    "assert",
  ]);
  expect(calls[2].slice(2)).toEqual([
    { title: "Approved", uid: "article" },
    "article scheduled draft",
  ]);
  versions.pop();
  calls.length = 0;
  expect(await move("article", "target")).toBe(1);
  expect(calls[3]).toEqual([
    "documents/doc/release",
    { status: "release:target", release_id: "other" },
    "PATCH",
  ]);
  rejectIntegrity = true;
  calls.length = 0;
  await expect(move("article", "target")).rejects.toThrow("integrity refused");
  expect(calls).toHaveLength(3);
  rejectIntegrity = false;
  versions = [];
  await expect(move("author-edward-white", "target")).rejects.toThrow(
    "Author is neither published nor staged",
  );
  versions = [{ status: "published", version_id: "live" }];
  calls.length = 0;
  expect(await move("author-edward-white", "target")).toBe(0);
  expect(calls).toEqual([
    ["documents/author"],
    ["documents/data/live"],
    [
      "assert",
      { actual: true },
      { name: "Edward", uid: undefined },
      "Published author",
    ],
  ]);
});
function helpers(file: string, start: string, end: string, names: string[]) {
  const source = readFileSync(file, "utf8");
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return runInNewContext(`${source.slice(from, to)}; ({${names.join(",")}})`);
}

test("import source linking retains source order, first occurrence and existing links", () => {
  const { addInlineSources } = helpers(
    "scripts/corral/import.mjs",
    "function sourceLabel",
    "function sameData",
    ["addInlineSources"],
  );
  const block = (text: string, spans: any[] = []) => ({ text, spans });
  const blocks = [
    block("NIST and ICO and ICO"),
    block("Copyright Office"),
    block("ICO", [{ type: "hyperlink", start: 0, end: 3, data: {} }]),
    block("Unlinked"),
  ];
  const draft = {
    slices: [{ primary: { body: blocks } }, { primary: {} }],
    sources: [
      "https://ico.org/",
      "https://nist.gov/",
      "https://copyright.gov/",
      "https://other.test/",
    ].map((url) => ({ source_url: { url } })),
  };
  expect(addInlineSources(draft)).toBe(draft);
  expect(blocks[0].spans).toEqual([
    { type: "hyperlink", start: 9, end: 12, data: draft.sources[0].source_url },
  ]);
  expect(blocks[1].spans[0]).toEqual({
    type: "hyperlink",
    start: 0,
    end: 16,
    data: draft.sources[2].source_url,
  });
  expect(blocks[2].spans).toHaveLength(1);
  expect(blocks[3].spans).toEqual([]);
});

test("import published guard allows only unchanged shared documents", () => {
  const { assertPublishedUpdate } = helpers(
    "scripts/corral/import.mjs",
    "function sameData",
    "async function upsert",
    ["assertPublishedUpdate"],
  );
  const existing = { data: { title: "same" } };
  const published = {
    versions: [{ status: "release" }, { status: "published" }],
  };
  for (const type of ["authors", "blog-index"]) {
    expect(() =>
      assertPublishedUpdate(published, existing, type, { title: "same" }),
    ).not.toThrow();
    expect(() =>
      assertPublishedUpdate(published, existing, type, { title: "changed" }),
    ).toThrow("This draft importer never updates published articles");
  }
  expect(() =>
    assertPublishedUpdate(published, existing, "blog", existing.data),
  ).toThrow();
  expect(() =>
    assertPublishedUpdate(
      { versions: [{ status: "release" }] },
      existing,
      "blog",
      {},
    ),
  ).not.toThrow();
});

test("migration checkpoint retains old data on partial failures and saves only assigned IDs", async () => {
  const source = readFileSync("scripts/corral/import.mjs", "utf8");
  const checkpoint = { documents: {} as Record<string, any> };
  let saves = 0;
  const record = runInNewContext(
    `${source.slice(source.indexOf("async function recordMigrationResult"), source.indexOf("async function upsert"))}; recordMigrationResult`,
    {
      checkpoint,
      save: async () => {
        saves++;
      },
    },
  );
  const input = {
    key: "article",
    type: "blog",
    uid: "article",
    data: { title: "new" },
    complete: false,
    existing: { data: { title: "old" } },
  };
  await record({ document: {} }, input);
  expect(saves).toBe(0);
  await record({ document: { id: "one" } }, input);
  expect(checkpoint.documents.article.data).toEqual({ title: "old" });
  await record({ document: { id: "one" } }, { ...input, complete: true });
  expect(checkpoint.documents.article.data).toEqual({ title: "new" });
  await record({ document: { id: "two" } }, { ...input, existing: undefined });
  expect(checkpoint.documents.article.data).toEqual({});
  expect(saves).toBe(3);
});

test("enrichment excludes citations, linked blocks and claim text without excluding ordinary text", () => {
  const { canLinkBlock } = helpers(
    "scripts/corral/enrich-links.mjs",
    "function canLinkBlock",
    "const report",
    ["canLinkBlock"],
  );
  for (const text of [
    "The scikit-learn documentation says",
    "The ICO explains rights",
    "NIST describes risks",
    "The U.S. Copyright Office explains",
  ])
    expect(canLinkBlock({ text, spans: [] }, [])).toBe(false);
  expect(
    canLinkBlock({ text: "rights review", spans: [{ type: "hyperlink" }] }, []),
  ).toBe(false);
  expect(
    canLinkBlock({ text: "rights review", spans: [] }, [
      { statement: "rights" },
    ]),
  ).toBe(false);
  expect(
    canLinkBlock({ text: "rights review", spans: [] }, [
      { claim_text: "review" },
    ]),
  ).toBe(false);
  expect(canLinkBlock({ text: "___NONE___", spans: [] }, [{}])).toBe(false);
  expect(canLinkBlock({ text: "ordinary rights review", spans: [] }, [])).toBe(
    true,
  );
});
