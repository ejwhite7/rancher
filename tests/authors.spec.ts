import { test, expect } from "@playwright/test";
import { authorPath } from "../src/lib/authors";
import { previewLinkResolver, supportedPreviewPath } from "../src/lib/preview";
import { includeInStaticSitemap } from "../src/lib/site";
test("authors use dedicated routes and preview resolution", () => {
  expect(authorPath("edward-white")).toBe("/authors/edward-white/");
  expect(
    previewLinkResolver({ type: "authors", uid: "edward-white" } as never),
  ).toBe("/authors/edward-white/");
  expect(supportedPreviewPath("/authors/edward-white/")).toBe(true);
  expect(supportedPreviewPath("/authors/")).toBe(false);
  expect(supportedPreviewPath("/authors/../contact/")).toBe(false);
  expect(() => authorPath("../contact")).toThrow();
  expect(
    includeInStaticSitemap("https://www.gorancher.com/authors/edward-white/"),
  ).toBe(false);
});
