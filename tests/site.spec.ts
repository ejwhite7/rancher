import { test, expect } from "@playwright/test";
import handshakeCases from "./fixtures/handshake-calculator.json" with { type: "json" };

test("calculator updates reference scenarios and submits before redirecting", async ({
  page,
}) => {
  let submitted: Record<string, any> | undefined;
  const posthogCalls: unknown[][] = [];
  page.on("console", (message) => {
    if (!message.text().startsWith("__POSTHOG__")) return;
    posthogCalls.push(JSON.parse(message.text().slice("__POSTHOG__".length)));
  });
  await page.addInitScript(() => {
    const record = (...args: unknown[]) =>
      console.log(`__POSTHOG__${JSON.stringify(args)}`);
    (window as any).posthog = {
      identify: (...args: unknown[]) => record("identify", ...args),
      capture: (...args: unknown[]) => record("capture", ...args),
    };
  });
  await page.route("**/api/submissions/", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        redirectUrl: "https://cal.com/growthcast/discovery",
        referralBonusUsd: 75000,
        domain: "example.com",
      }),
    });
  });
  await page.route("https://cal.com/growthcast/discovery", (route) =>
    route.fulfill({ body: "<h1>Booking calendar</h1>" }),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => {
    const record = (...args: unknown[]) =>
      console.log(`__POSTHOG__${JSON.stringify(args)}`);
    (window as any).posthog = {
      identify: (...args: unknown[]) => record("identify", ...args),
      capture: (...args: unknown[]) => record("capture", ...args),
    };
  });
  await expect(page.locator("#intake button")).toBeEnabled();
  await expect(page.locator("#estimate-low")).toHaveText("$383,083");
  for (const row of handshakeCases) {
    await page.locator("#employees").fill(String(row.employees));
    await page.locator("#years").fill(String(row.years));
    await page
      .locator(".country-options label")
      .filter({ hasText: row.region })
      .click();
    await expect
      .poll(async () =>
        (await page.locator(".estimate").innerText()).replace(/[\s—–-]/g, ""),
      )
      .toBe(row.display.replace(/[\s—–-]/g, ""));
  }
  await page
    .locator(".country-options label")
    .filter({ hasText: "Canada" })
    .click();
  const range = await page.locator(".estimate").innerText();
  await page.locator("#estimate-cta").click();
  await expect(page.locator("#calc-context")).toContainText("Canada");
  await expect(page.locator('[name="size"]')).toHaveValue("");
  await expect(page.locator('[name="history"]')).toHaveValue("20+ years");
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page.getByLabel("Work email").fill("alex@example.com");
  await page.getByLabel("Job title").fill("VP of Operations");
  await page.getByLabel("Company", { exact: true }).fill("Example Company");
  await page.getByLabel("Documents & files", { exact: true }).check();
  await page
    .locator('[name="records"]')
    .fill("Project histories and internal documentation.");
  await page.locator('[name="size"]').selectOption("500–999");
  await page.locator(".consent input").check();
  await page.getByRole("button", { name: "Submit & book a call" }).click();
  await expect(page).toHaveURL("https://cal.com/growthcast/discovery");
  expect(submitted?.title).toBe("VP of Operations");
  expect(submitted?.company).toBe("Example Company");
  expect(submitted?.outreachConsent).toBe(true);
  expect(submitted?.scenario).toEqual({
    employees: 200,
    years: 20,
    country: "Canada",
  });
  expect(submitted?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  expect(posthogCalls).toContainEqual([
    "identify",
    "alex@example.com",
    {
      email: "alex@example.com",
      domain: "example.com",
      job_title: "VP of Operations",
    },
  ]);
  expect(posthogCalls).toContainEqual([
    "capture",
    "partnership_request_submitted",
    expect.objectContaining({
      submission_id: submitted?.idempotencyKey,
      name: "Alex Morgan",
      email: "alex@example.com",
      domain: "example.com",
      job_title: "VP of Operations",
      company: "Example Company",
      company_size: "500–999",
      data_history: "20+ years",
      record_types: ["Documents & files"],
      additional_context: "Project histories and internal documentation.",
      outreach_consent: true,
      referral_bonus_usd: 75000,
      calculator_scenario: {
        employees: 200,
        years: 20,
        country: "Canada",
      },
    }),
  ]);
  expect(range).toContain("$");
  expect(errors).toEqual([]);
});

test("tabs and site-information dialog retain keyboard interaction", async ({
  page,
}) => {
  await page.goto("/");
  const firstTab = page.getByRole("tab", { name: /Communication/ });
  await firstTab.scrollIntoViewIfNeeded();
  await expect(
    page
      .locator('astro-island[component-export="default"]')
      .filter({ has: firstTab }),
  ).not.toHaveAttribute("ssr");
  await firstTab.click();
  await firstTab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Knowledge/ })).toBeFocused();
  await expect(page.locator("#data-title")).toHaveText(
    "How ideas become finished work.",
  );
  await page.keyboard.press("End");
  await expect(page.locator("#data-title")).toHaveText(
    "How your business builds and runs.",
  );
  await page
    .getByRole("link", { name: "Site information", exact: true })
    .click();
  await expect(page.locator("#site-note")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#site-note")).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: "Site information", exact: true }),
  ).toBeFocused();
});

test("calculator is compact on desktop and layouts fit small screens", async ({
  page,
}) => {
  await page.goto("/");
  const ratio = await page.locator(".calculator").evaluate((element) => {
    const parent = element.closest(".wrap")! as HTMLElement;
    const style = getComputedStyle(parent);
    return (
      element.getBoundingClientRect().width /
      (parent.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight))
    );
  });
  expect(ratio).toBeCloseTo(0.6, 2);
  await expect(page.locator("#use-cases details")).toHaveCount(0);
  await expect(page.locator("#use-cases .use-card")).toHaveCount(9);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator("#employees").fill("200");
    await page.locator("#years").fill("20");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    expect(
      await page
        .locator(".calculator")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByText("Calculator", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("server-rendered metadata, schema, social image, sitemap, and robots agree", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canonical).toBeTruthy();
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    canonical!,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  const graph = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText(),
  )["@graph"];
  expect(
    graph.map((entity: Record<string, string>) => entity["@type"]),
  ).toEqual([
    "Organization",
    "WebSite",
    "WebPage",
    "ImageObject",
    "Service",
    "FAQPage",
  ]);
  const faqs = graph.find(
    (entity: Record<string, string>) => entity["@type"] === "FAQPage",
  ).mainEntity;
  expect(faqs).toHaveLength(await page.locator("#faq details").count());
  for (const faq of faqs)
    expect(await page.locator("#faq").textContent()).toContain(
      faq.acceptedAnswer.text,
    );
  await expect(page.locator(".h-card .p-name.u-url")).toHaveCount(1);
  const { readFile } = await import("node:fs/promises");
  const sitemap = await readFile("dist/client/sitemap-0.xml", "utf8");
  expect(sitemap).toContain(`<loc>${canonical}</loc>`);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain(
    `Sitemap: ${canonical}sitemap-index.xml`,
  );
  for (const asset of [
    "/images/og-rancher-work-hard.png",
    "/favicon-32.png",
    "/apple-touch-icon.png",
    "/site.webmanifest",
  ]) {
    expect((await request.get(asset)).ok()).toBeTruthy();
  }
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[id]"), (element) => element.id),
  );
  expect(new Set(ids).size).toBe(ids.length);
});

test("content and initial island markup are available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4322/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Make Your Business Data",
  );
  await expect(page.locator("#estimate-low")).toHaveText("$383,083");
  await expect(page.locator("#intake button")).toBeDisabled();
  await expect(page.locator("#faq details")).toHaveCount(6);
  await context.close();
});

test("legal pages are linked, crawlable, and have page-specific metadata", async ({
  page,
}) => {
  await page.goto("/");
  for (const [label, path] of [
    ["Privacy Policy", "/privacy-policy/"],
    ["Terms of Use", "/terms-of-use/"],
  ]) {
    await page
      .getByRole("navigation", { name: "Footer", exact: true })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(label);
    await expect(page).toHaveTitle(`${label} | Rancher`);
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical).toContain(path);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      canonical!,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      `${label} | Rancher`,
    );
    const graph = JSON.parse(
      await page.locator('script[type="application/ld+json"]').innerText(),
    )["@graph"];
    expect(
      graph.some(
        (entity: Record<string, string>) => entity["@type"] === "FAQPage",
      ),
    ).toBeFalsy();
    expect(
      graph.find(
        (entity: Record<string, string>) => entity["@type"] === "WebPage",
      ).name,
    ).toBe(`${label} | Rancher`);
    const { readFile } = await import("node:fs/promises");
    expect(await readFile("dist/client/sitemap-0.xml", "utf8")).toContain(
      `<loc>${canonical}</loc>`,
    );
    await expect(
      page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "Calculator", exact: true }),
    ).toHaveAttribute("href", "/#calculator");
    await page.setViewportSize({ width: 375, height: 812 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Calculator", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#calculator$/);
});
