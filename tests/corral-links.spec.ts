import { test, expect } from "@playwright/test";
import { asHTML, type RichTextField } from "@prismicio/client";
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
