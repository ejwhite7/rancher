import { expect, test } from "@playwright/test";

test("offers persistent US opt-out choices and honors GPC", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
      configurable: true,
      get: () => true,
    });
  });
  const page = await context.newPage();
  let posthogRequests = 0;
  await page.route("**/ingest/**", async (route) => {
    posthogRequests += 1;
    await route.fulfill({ status: 204, body: "" });
  });

  await page.goto("/?utm_source=test&utm_medium=paid");
  const banner = page.locator('[data-consent-tpl="banner"]');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("Your privacy choices");
  await expect(banner).toContainText("Global Privacy Control");
  await expect(page.locator('[data-consent-tpl="modal"]')).toHaveAttribute(
    "aria-modal",
    "true",
  );
  expect(posthogRequests).toBe(0);
  expect(await context.cookies()).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "attr_first" }),
      expect.objectContaining({ name: "attr_last" }),
    ]),
  );

  await page.getByRole("button", { name: "Opt out" }).click();
  await expect(banner).not.toBeVisible();
  const stored = JSON.parse(
    (await context.cookies()).find(
      (cookie) => cookie.name === "rancher_consent",
    )!.value,
  );
  expect(stored).toMatchObject({
    analytics_storage: false,
    advertising: false,
    _gpc: true,
  });

  await page.getByRole("button", { name: "Privacy choices" }).click();
  const modal = page.locator('[data-consent-tpl="modal"]');
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel("Analytics and performance")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await context.close();
});

test("saves granular choices and remains usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/ingest/**", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
  await page.goto("/");

  await page.getByRole("button", { name: "Manage choices" }).click();
  const modal = page.locator('[data-consent-tpl="modal"]');
  await expect(modal).toBeVisible();
  await modal.getByLabel("Advertising measurement and targeting").uncheck();
  await modal.getByRole("button", { name: "Save choices" }).click();
  await page.waitForLoadState("domcontentloaded");

  const stored = JSON.parse(
    (await page.context().cookies()).find(
      (cookie) => cookie.name === "rancher_consent",
    )!.value,
  );
  expect(stored).toMatchObject({
    analytics_storage: true,
    advertising: false,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Privacy choices" }),
  ).toBeVisible();
});
