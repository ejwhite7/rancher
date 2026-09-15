import { test, expect } from "@playwright/test";
test.skip(
  !process.env.GLOSSARY_FIXTURE_TESTS,
  "Run with npm run test:glossary (isolated local API).",
);
test.beforeEach(async ({ request, page }) => {
  await request.post("http://127.0.0.1:4334/__test/state", { data: {} });
  await page.route("https://posthog.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    }),
  );
});
test("all 60 terms are server-rendered across three API pages, with canonical SEO", async ({
  page,
  request,
}) => {
  const r = await page.goto("/glossary/");
  expect(r?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(".glossary-card")).toHaveCount(60);
  expect((await r!.text()).match(/class="glossary-card"/g)).toHaveLength(60);
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://www.gorancher.com/glossary/",
  );
  const queries = await (
    await request.get("http://127.0.0.1:4334/__test/requests")
  ).json();
  expect(
    queries
      .filter((q: any) => q.query.includes('"glossary"'))
      .map((q: any) => q.page),
  ).toEqual(expect.arrayContaining([1, 2, 3]));
  const sitemap = await request.get("/glossary-sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect((await sitemap.text()).match(/<loc>/g)).toHaveLength(61);
  expect(await sitemap.text()).not.toContain("/preview/");
});
test("aliases, ranking, category AND query, clear, zero state, and privacy", async ({
  page,
}) => {
  await page.goto("/glossary/");
  const search = page.getByLabel("Search glossary terms", { exact: true });
  await search.fill("  PÍI  ");
  await expect(page.locator(".glossary-card")).toHaveCount(1);
  await expect(page.locator(".glossary-card dt")).toHaveText(
    "Personally identifiable information (PII)",
  );
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("licensing-economics");
  await expect(page.getByRole("status")).toContainText("0 terms");
  await expect(
    page.getByRole("heading", { name: "No matching terms" }),
  ).toBeVisible();
  await expect(page.locator(".glossary-az a")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".glossary-card")).toHaveCount(60);
  await search.fill("fine-tuning");
  await expect(page.locator(".glossary-card dt").first()).toHaveText(
    "Fine-tuning",
  );
  await search.fill("sensitive customer query 93827");
  await page.waitForTimeout(650);
  const events = await page.evaluate(() =>
    JSON.stringify((window as any).posthog),
  );
  expect(events).toContain("glossary_filter_used");
  expect(events).not.toContain("sensitive customer query");
  await expect(search).toHaveClass(/ph-no-capture/);
  await expect(search).toHaveAttribute("data-ph-mask", "true");
});
test("draft session is isolated, related navigation stays in preview, expired refs fail closed", async ({
  page,
  context,
  request,
}) => {
  await context.addCookies([
    {
      name: "io.prismic.preview",
      value: "draft-ref",
      url: "http://127.0.0.1:4333",
    },
  ]);
  let response = await page.goto("/preview/view/glossary/");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    page
      .locator(".glossary-card dt")
      .filter({ hasText: "Draft data licensing" }),
  ).toHaveCount(1);
  await page
    .locator(".glossary-card")
    .getByRole("link", { name: "Draft data licensing", exact: true })
    .click();
  await expect(page).toHaveURL(/\/preview\/view\/glossary\/data-licensing\/$/);
  await expect(page.locator("h1")).toHaveText("Draft data licensing");
  const publicResponse = await request.get("/glossary/data-licensing/");
  expect(publicResponse.status()).toBe(200);
  expect(await publicResponse.text()).not.toContain("Draft data licensing");
  await context.addCookies([
    {
      name: "io.prismic.preview",
      value: "expired-ref",
      url: "http://127.0.0.1:4333",
    },
  ]);
  response = await page.goto("/preview/view/glossary/");
  expect(response?.status()).toBe(400);
});
test("unpublish removes the term, its links, and sitemap immediately; unknown UIDs are 404", async ({
  request,
}) => {
  expect((await request.get("/glossary/data-licensing/")).status()).toBe(200);
  await request.post("http://127.0.0.1:4334/__test/state", {
    data: { unpublished: "data-licensing" },
  });
  expect((await request.get("/glossary/data-licensing/")).status()).toBe(404);
  expect((await request.get("/glossary/unknown-term/")).status()).toBe(404);
  const index = await (await request.get("/glossary/")).text();
  expect(index).not.toContain('href="/glossary/data-licensing/"');
  expect(index.match(/class="glossary-card"/g) || []).toHaveLength(59);
  expect(
    await (await request.get("/glossary-sitemap.xml")).text(),
  ).not.toContain("/glossary/data-licensing/");
  const related = await (await request.get("/glossary/data-ownership/")).text();
  expect(related).not.toContain('href="/glossary/data-licensing/"');
});
test("missing singleton and malformed content fail clearly; empty repository remains usable", async ({
  request,
}) => {
  await request.post("http://127.0.0.1:4334/__test/state", {
    data: { missingIndex: true },
  });
  expect((await request.get("/glossary/")).status()).toBe(503);
  const missingSitemap = await request.get("/glossary-sitemap.xml");
  expect(missingSitemap.status()).toBe(200);
  expect(await missingSitemap.text()).not.toContain("<loc>");
  await request.post("http://127.0.0.1:4334/__test/state", {
    data: { malformed: true },
  });
  expect((await request.get("/glossary/")).status()).toBe(503);
  await request.post("http://127.0.0.1:4334/__test/state", {
    data: { empty: true },
  });
  const r = await request.get("/glossary/");
  expect(r.status()).toBe(200);
  expect(await r.text()).toContain("No matching terms");
});
test("term structure, escaped JSON-LD, mobile, keyboard, and no-JS links", async ({
  page,
  request,
  browser,
}) => {
  await request.post("http://127.0.0.1:4334/__test/state", {
    data: { special: true },
  });
  await page.goto("/glossary/data-licensing/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "How it works", exact: true }),
  ).toBeVisible();
  const schemas = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  schemas.forEach((s) => expect(() => JSON.parse(s)).not.toThrow());
  expect(schemas.join("")).toContain("\\u003c");
  await request.post("http://127.0.0.1:4334/__test/state", { data: {} });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/glossary/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(
    page.getByLabel("Search glossary terms", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search glossary terms", { exact: true }).focus();
  await page.keyboard.type("PII");
  await expect(page.locator(".glossary-card")).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Category", { exact: true })).toBeFocused();
  const c = await browser.newContext({ javaScriptEnabled: false });
  const noJS = await c.newPage();
  await noJS.goto("http://127.0.0.1:4333/glossary/");
  await expect(noJS.locator(".glossary-card")).toHaveCount(60);
  await expect(noJS.locator(".glossary-controls")).toBeHidden();
  await noJS
    .locator(".glossary-card")
    .getByRole("link", { name: "Data licensing", exact: true })
    .click();
  await expect(noJS.locator("h1")).toHaveText("Data licensing");
  await c.close();
});
