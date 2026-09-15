import { test, expect } from "@playwright/test";
import {
  canonicalUrl,
  includeInStaticSitemap,
  isIndexableDeployment,
} from "../src/lib/site";
import { isPublicSite } from "../src/lib/seo";

test("canonicals normalize public and preview paths without campaign parameters", () => {
  for (const path of [
    "/privacy-policy",
    "/privacy-policy/?utm_source=test",
    "/preview/view/privacy-policy/",
  ]) {
    expect(canonicalUrl(path).href).toBe(
      "https://www.gorancher.com/privacy-policy/",
    );
  }
  expect(canonicalUrl("/preview/view/").href).toBe(
    "https://www.gorancher.com/",
  );
  expect(isPublicSite(new URL("https://staging.gorancher.com"))).toBe(false);
  expect(isPublicSite(new URL("https://rancher-example.vercel.app"))).toBe(
    false,
  );
  expect(isPublicSite(new URL("https://www.gorancher.com"))).toBe(true);
});

test("static sitemap discovers page routes while excluding utilities and live glossary URLs", () => {
  for (const path of [
    "/",
    "/privacy-policy/",
    "/terms-of-use/",
    "/future-page/",
  ]) {
    expect(includeInStaticSitemap(`https://www.gorancher.com${path}`)).toBe(
      true,
    );
  }
  for (const path of [
    "/preview/",
    "/preview/view/",
    "/slice-simulator/",
    "/slice-simulator/render/",
    "/api/submit/",
    "/glossary/",
    "/glossary/new-term/",
  ]) {
    expect(includeInStaticSitemap(`https://www.gorancher.com${path}`)).toBe(
      false,
    );
  }
});

test("deployment indexing is resolved at build time independently of private runtime env", () => {
  const local = new URL("http://localhost:4321");
  const publicSite = new URL("https://www.gorancher.com");
  expect(isIndexableDeployment("production", local)).toBe(true);
  expect(isIndexableDeployment("preview", publicSite)).toBe(false);
  expect(isIndexableDeployment("development", publicSite)).toBe(false);
  expect(isIndexableDeployment(undefined, local)).toBe(false);
  expect(isIndexableDeployment(undefined, publicSite)).toBe(true);
});
