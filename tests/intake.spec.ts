import { test, expect, type Page } from "@playwright/test";

async function installWizardAnalytics(page: Page) {
  await page.addInitScript(() => {
    window.posthog = {
      __SV: 1,
      init() {},
      capture(event: string, properties: Record<string, unknown>) {
        const events = JSON.parse(
          sessionStorage.getItem("wizard-events") || "[]",
        );
        events.push({ event, properties });
        sessionStorage.setItem("wizard-events", JSON.stringify(events));
      },
      identify() {},
    } as unknown as typeof window.posthog;
  });
}

async function exerciseWizardNavigation(page: Page) {
  const next = page.getByRole("button", { name: "Continue" });
  await next.click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page.getByLabel("Work email").fill("not-an-email");
  await page.getByLabel("Job title").fill("Operations");
  await page.getByLabel("Company", { exact: true }).fill("Example");
  await next.click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await page.getByLabel("Work email").fill("alex@example.com");
  await next.click();
  await expect(
    page.getByRole("heading", { name: "Business data" }),
  ).toBeFocused();
  await expect(page.getByLabel("Your name")).toBeHidden();
  await next.click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
  await page.locator('[name="size"]').selectOption("20–49");
  await page.locator('[name="history"]').selectOption("3–5 years");
  await next.click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
  await page.getByLabel("Documents & files", { exact: true }).check();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Your name")).toHaveValue("Alex Morgan");
  await page.getByLabel("Company", { exact: true }).press("Enter");
  await expect(page.locator('[name="size"]')).toHaveValue("20–49");
  await next.click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "3");
  await expect(
    page.getByRole("heading", { name: "Getting in Contact" }),
  ).toBeVisible();
  await expect(page.locator('[name="records"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Submit", exact: true }),
  ).toBeVisible();
  await page.locator('[name="communications_consent"]').check();
}

async function assertWizardRetry(
  page: Page,
  requests: Record<string, unknown>[],
) {
  const submit = page.locator('#intake button[type="submit"]');
  await submit.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Please retry." }),
  ).toBeVisible();
  await expect(submit).toBeEnabled();
  await page.evaluate(() => {
    window.posthog!.capture = () => {
      throw Error("Analytics unavailable");
    };
  });
  await submit.click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[0]).toMatchObject({
    name: "Alex Morgan",
    company: "Example",
    size: "20–49",
    history: "3–5 years",
    recordTypes: ["Documents & files"],
    records: "",
    communicationsConsent: true,
  });
}

async function assertWizardEvents(page: Page) {
  const events = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("wizard-events") || "[]"),
  );
  expect(
    events
      .filter(
        (entry: { event: string }) =>
          entry.event === "partnership_intake_step_viewed",
      )
      .map(
        (entry: { properties: { step_number: number } }) =>
          entry.properties.step_number,
      ),
  ).toEqual([1, 2, 1, 2, 3]);
  expect(
    events
      .filter(
        (entry: { event: string }) =>
          entry.event === "partnership_intake_step_completed",
      )
      .map(
        (entry: { properties: { step_number: number } }) =>
          entry.properties.step_number,
      ),
  ).toEqual([1, 2, 3]);
  for (const entry of events) {
    expect(Object.keys(entry.properties).sort()).toEqual([
      "form",
      "form_variant",
      "step_name",
      "step_number",
      "total_steps",
    ]);
  }
}

async function confirmSavedWizard(
  page: Page,
  requests: Record<string, unknown>[],
) {
  const next = page.getByRole("button", { name: "Continue" });
  const submit = page.locator('#intake button[type="submit"]');
  await page.getByRole("button", { name: "Back" }).click();
  await next.click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "3");
  await page.route("**/api/submissions/", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        redirectUrl: null,
        message: "Request saved.",
        qualifies: false,
        qualificationStatus: "does_not_qualify",
        referralBonusUsd: 0,
        domain: "example.com",
        phone: null,
        consentVersion: "communications-v1-2026-09-19",
        consentRecordedAt: null,
      }),
    });
  });
  await submit.click();
  await expect(page.locator("#form-status")).toHaveText("Request saved.");
  expect(requests[2]).toEqual(requests[0]);
  expect(
    await page.evaluate(
      () =>
        window.dataLayer?.filter(
          (entry) => entry.event === "partnership_request_submitted",
        ).length,
    ),
  ).toBe(1);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("intake validates each step, preserves answers and retries the existing payload", async ({
  page,
}) => {
  await installWizardAnalytics(page);
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/submissions/", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Please retry." }),
    });
  });
  await page.goto("/intake/");
  const next = page.getByRole("button", { name: "Continue" });
  await expect(next).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(sessionStorage.getItem("wizard-events") || "[]").length,
      ),
    )
    .toBe(1);
  await page.setViewportSize({ width: 375, height: 667 });
  expect(
    await page.getByLabel("Your name").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 72 && rect.bottom < window.innerHeight;
    }),
  ).toBe(true);
  await expect(
    page.locator(".intake-page .eyebrow, .intake-page .mini"),
  ).toHaveCount(0);
  await exerciseWizardNavigation(page);
  expect(requests).toHaveLength(0);
  await assertWizardRetry(page, requests);
  await assertWizardEvents(page);
  await confirmSavedWizard(page, requests);
});

test("intake restores header copy, prefills URL fields and keeps buttons on one line", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto(
    "/intake/?first_name=Alex&last_name=Morgan&company=Example&job_title=Operations&email=alex%40example.com&phone=2125550123&utm_source=newsletter",
  );
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  await expect(page.locator(".contact-copy > p")).toContainText(
    "Start with the basics.",
  );
  const headingTracking = await page
    .locator(".intake-page h1")
    .evaluate((heading) => {
      const style = getComputedStyle(heading);
      return parseFloat(style.letterSpacing) / parseFloat(style.fontSize);
    });
  expect(headingTracking).toBeCloseTo(-0.04, 3);
  await expect(
    page.getByRole("heading", { name: "Explore a data partnership" }),
  ).toHaveCount(0);
  for (const [name, value, autocomplete] of [
    ["name", "Alex Morgan", "name"],
    ["email", "alex@example.com", "email"],
    ["company", "Example", "organization"],
    ["title", "Operations", "organization-title"],
    ["phone", "2125550123", "tel-national"],
  ]) {
    const input = page.locator(`#intake [name="${name}"]`);
    await expect(input).toHaveValue(value);
    await expect(input).toHaveAttribute("autocomplete", autocomplete);
  }
  expect(
    await page
      .getByLabel("Your name")
      .evaluate((input) => input.getBoundingClientRect().bottom < innerHeight),
  ).toBe(true);
  await page.getByLabel("Your name").fill("Edited Name");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator('[name="size"]').selectOption("20–49");
  await page.locator('[name="history"]').selectOption("3–5 years");
  await page.getByLabel("Documents & files", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  const buttons = await page
    .locator(".wizard-actions button")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        top: element.getBoundingClientRect().top,
        whiteSpace: getComputedStyle(element).whiteSpace,
        text: element.textContent?.trim(),
      })),
    );
  expect(buttons.map((button) => button.text)).toEqual(["Back", "Submit"]);
  // Hover transitions can shift a button by up to 2px without changing its row.
  expect(Math.abs(buttons[0].top - buttons[1].top)).toBeLessThanOrEqual(2);
  expect(buttons.every((button) => button.whiteSpace === "nowrap")).toBe(true);
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Your name")).toHaveValue("Edited Name");
  await page.goto(
    "/intake/?utm_first_name=Sam&utm_last_name=Lee&utm_company=" +
      "x".repeat(200) +
      "&utm_job_title=Director",
  );
  await expect(page.getByLabel("Your name")).toHaveValue("Sam Lee");
  await expect(page.getByLabel("Company", { exact: true })).toHaveValue(
    "x".repeat(180),
  );
  await expect(page.getByLabel("Job title")).toHaveValue("Director");
});
