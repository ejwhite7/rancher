import { test, expect } from "@playwright/test";

test("partnership success emits analytics before opening the returned calendar", async ({
  page,
}) => {
  await page.route("**/api/submissions/", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        redirectUrl: "/?booked=1",
        message: null,
        qualifies: true,
        qualificationStatus: "qualified",
        consentVersion: "communications-v1-2026-09-19",
        consentRecordedAt: null,
        referralBonusUsd: 75000,
        domain: "example.com",
        phone: null,
      }),
    }),
  );
  await page.goto("/");
  await expect(page.locator("#intake button")).toBeEnabled();
  await page.evaluate(() => {
    window.posthog = {
      identify: () => {},
      capture: () => {},
    } as typeof window.posthog;
    window.dataLayer ??= [];
    const push = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer!.push = (...items) => {
      sessionStorage.setItem("partnership-event", JSON.stringify(items[0]));
      return push(...items);
    };
  });
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page.getByLabel("Work email").fill("alex@example.com");
  await page.getByLabel("Job title").fill("Operations");
  await page.getByLabel("Company", { exact: true }).fill("Example");
  await page.locator('[name="size"]').selectOption("20–49");
  await page.locator('[name="history"]').selectOption("3–5 years");
  await page.getByLabel("Documents & files", { exact: true }).check();
  await page.locator("#intake button").click();
  await expect(page).toHaveURL(/booked=1/);
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("partnership-event")!),
    ),
  ).toMatchObject({
    event: "partnership_request_submitted",
    email: "alex@example.com",
    record_types: ["Documents & files"],
    referral_bonus_usd: 75000,
  });
});

test("partnership validation and retries preserve entries and submission identity", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/submissions/", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Please retry." }),
    });
  });
  await page.goto("/");
  const submit = page.locator("#intake button");
  await expect(submit).toBeEnabled();
  await submit.click();
  expect(requests).toHaveLength(0);
  await page.getByLabel("Your name").fill(" Alex Morgan ");
  await page.getByLabel("Work email").fill("alex@example.com");
  await page.getByLabel("Job title").fill("Operations");
  await page.getByLabel("Company", { exact: true }).fill("Example");
  await page.locator('[name="size"]').selectOption("20–49");
  await page.locator('[name="history"]').selectOption("3–5 years");
  await submit.click();
  expect(requests).toHaveLength(0);
  await page.getByLabel("Documents & files", { exact: true }).check();
  await page.getByLabel("Email & calendar", { exact: true }).check();
  await page.getByLabel("Documents & files", { exact: true }).uncheck();
  await submit.click();
  await expect(page.locator("#form-status")).toHaveText("Please retry.");
  await expect(submit).toBeEnabled();
  await expect(page.getByLabel("Your name")).toHaveValue(" Alex Morgan ");
  await submit.click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0]).toMatchObject({
    name: "Alex Morgan",
    recordTypes: ["Email & calendar"],
    scenario: null,
    communicationsConsent: false,
  });
  await expect(submit).toBeEnabled();
  await page.getByLabel("Company", { exact: true }).fill("Changed company");
  await submit.click();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2].idempotencyKey).not.toBe(requests[0].idempotencyKey);
});
