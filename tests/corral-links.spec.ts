import { test, expect } from "@playwright/test";
import { asHTML, type RichTextField } from "@prismicio/client";
import { blogLink } from "../src/lib/blog";
import { availableBlogLinks } from "../src/lib/blog-links";
const text = "Read the guide and glossary.";
function rich(data: any): RichTextField {
  return [
    {
      type: "paragraph",
      text,
      spans: [{ type: "hyperlink", start: 9, end: 14, data }],
    },
  ];
}
test("unpublished article links preserve text until the target enters the current ref", () => {
  const content = rich({ link_type: "Web", url: "/blog/companion/" });
  expect(asHTML(availableBlogLinks(content, []))).toBe(`<p>${text}</p>`);
  expect(
    asHTML(availableBlogLinks(content, [{ id: "one", uid: "companion" }])),
  ).toContain('href="/blog/companion/"');
  expect(asHTML(content)).toContain("href="); // Original CMS content stays intact.
});
test("absolute article URLs and document references cannot bypass publication gating", () => {
  for (const data of [
    { link_type: "Web", url: "https://www.gorancher.com/blog/companion/?x=1" },
    {
      link_type: "Document",
      id: "future",
      type: "blog",
      uid: "companion",
      isBroken: true,
    },
  ])
    expect(
      asHTML(
        availableBlogLinks(rich(data), [{ id: "future", uid: "another" }]),
      ),
    ).not.toContain("<a");
});
test("glossary, contact, external and library links remain available", () => {
  for (const url of [
    "/glossary/data-licensing/",
    "/contact/",
    "https://www.nist.gov/",
    "/blog/",
  ])
    expect(
      asHTML(availableBlogLinks(rich({ link_type: "Web", url }), [])),
    ).toContain(`href="${url}"`);
});

test("publication gating preserves host, document and malformed-URL boundaries", () => {
  for (const host of ["gorancher.com", "staging.gorancher.com"]) {
    const content = rich({
      link_type: "Web",
      url: `https://${host}/blog/companion?x=1#part`,
    });
    expect(asHTML(availableBlogLinks(content, []))).not.toContain("<a");
    expect(
      asHTML(availableBlogLinks(content, [{ id: "one", uid: "companion" }])),
    ).toContain("<a");
  }
  for (const [type, id, isBroken, available] of [
    ["blog", "one", false, true],
    ["blog", "missing", false, false],
    ["authors", "one", true, false],
    ["unknown", "one", false, false],
    ["blog-index", "missing", false, true],
    ["glossary-index", "missing", false, true],
  ] as const) {
    const result = availableBlogLinks(
      rich({ link_type: "Document", type, id, isBroken }),
      [{ id: "one", uid: "companion" }],
    );
    expect((result[0] as { spans: unknown[] }).spans).toHaveLength(
      available ? 1 : 0,
    );
  }
  const content = [
    {
      type: "image",
      id: "image-one",
      copyright: null,
      edit: { x: 0, y: 0, zoom: 1, background: "transparent" },
      url: "https://example.com/image.png",
      alt: null,
      dimensions: { width: 1, height: 1 },
    },
    { type: "paragraph", text, spans: [{ type: "strong", start: 0, end: 4 }] },
  ] as RichTextField;
  const result = availableBlogLinks(content, []);
  expect(result).toEqual(content);
  expect(result[0]).toBe(content[0]);
  expect(() =>
    availableBlogLinks(rich({ link_type: "Web", url: "http://[" }), []),
  ).toThrow(TypeError);
});

test("document resolver preserves index routes and rejects unsafe or unknown UIDs", () => {
  for (const type of ["blog", "glossary", "authors"]) {
    expect(blogLink({ type, uid: "safe-entry" })).toBe(`/${type}/safe-entry/`);
    for (const uid of [
      undefined,
      null,
      "",
      "Uppercase",
      "../escape",
      "two--hyphens",
    ])
      expect(blogLink({ type, uid })).toBe("/");
  }
  expect(blogLink({ type: "blog-index", uid: "../ignored" })).toBe("/blog/");
  expect(blogLink({ type: "glossary-index", uid: null })).toBe("/glossary/");
  expect(blogLink({ type: "unknown", uid: "safe-entry" })).toBe("/");
  expect(blogLink({})).toBe("/");
});

test("Prismic glossary and author document links resolve to their own routes", () => {
  for (const [type, uid, path] of [
    ["glossary", "data-licensing", "/glossary/data-licensing/"],
    ["authors", "edward-white", "/authors/edward-white/"],
  ]) {
    const content = rich({
      link_type: "Document",
      id: "linked",
      type,
      uid,
      isBroken: false,
    });
    expect(
      asHTML(availableBlogLinks(content, []), { linkResolver: blogLink }),
    ).toContain(`href="${path}"`);
  }
});
