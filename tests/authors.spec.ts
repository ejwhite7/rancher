import { test, expect } from "@playwright/test";
import { authorPath, fetchAuthor, AuthorNotFoundError } from "../src/lib/authors";
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

test('an unpublished author returns not found without querying an unavailable UID field',async()=>{
 const client={getAllByType:async()=>[]};
 await expect(fetchAuthor(client as never,'edward-white')).rejects.toBeInstanceOf(AuthorNotFoundError);
});
