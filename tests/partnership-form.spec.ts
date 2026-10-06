import { test, expect, type Page } from "@playwright/test";

async function fillRequiredPartnership(page: Page) {
  await expect(page.locator("#intake button")).toBeEnabled();
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page.getByLabel("Work email").fill("alex@example.com");
  await page.getByLabel("Job title").fill("Operations");
  await page.getByLabel("Company", { exact: true }).fill("Example");
  await page.locator('[name="size"]').selectOption("20–49");
  await page.locator('[name="history"]').selectOption("3–5 years");
  await page.getByLabel("Documents & files", { exact: true }).check();
}

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

test("analytics failure does not discard the calculator scenario", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#intake button")).toBeEnabled();
  await page.evaluate(() => {
    window.posthog = {
      identify: () => {},
      capture: () => {
        throw Error("Analytics unavailable");
      },
    };
  });
  await page.locator("#estimate-cta").click();
  await expect(page.locator("#calc-context")).toContainText(
    "100 employees, 10 years",
  );
  await expect(page.locator('[name="size"]')).toHaveValue("50–199");
  await expect(page.locator('[name="history"]')).toHaveValue("6–10 years");
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

test("invalid successful responses preserve entries and retry identity without emitting submission analytics", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  const bodies = ['{"qualifies":"yes"}', "null", "not JSON"];
  await page.route("**/api/submissions/", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: bodies[requests.length - 1],
    });
  });
  await page.goto("/");
  await fillRequiredPartnership(page);
  for (let attempt = 0; attempt < bodies.length; attempt++) {
    await page.locator("#intake button").click();
    await expect.poll(() => requests.length).toBe(attempt + 1);
    await expect(page.locator("#intake button")).toBeEnabled();
    await expect(page.locator("#form-status")).not.toBeEmpty();
    await expect(page.getByLabel("Your name")).toHaveValue("Alex Morgan");
    await expect(page).toHaveURL("http://127.0.0.1:4322/");
  }
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[2]).toEqual(requests[0]);
  expect(
    await page.evaluate(
      () =>
        window.dataLayer?.filter(
          (entry) => entry.event === "partnership_request_submitted",
        ) ?? [],
    ),
  ).toEqual([]);
});

type AnalyticsFailure = "identify" | "dataLayer" | "session";

async function failPartnershipAnalytics(page: Page, failure: AnalyticsFailure) {
  await page.evaluate((failure) => {
    window.posthog = {
      capture: () => {},
      identify: () => {
        if (failure === "identify") throw Error("Analytics unavailable");
      },
      get_session_id: () => {
        if (failure === "session") throw Error("Session unavailable");
        return "test-session";
      },
    };
    window.dataLayer = [];
    if (failure === "dataLayer")
      window.dataLayer.push = () => {
        throw Error("dataLayer unavailable");
      };
  }, failure);
}

async function expectSavedPartnership(
  page: Page,
  qualifies: boolean,
  failure: AnalyticsFailure,
) {
  if (qualifies) {
    await expect(page).toHaveURL(/booked=1/);
    return;
  }
  await expect(page.locator("#form-status")).toHaveText(
    "Your organization does not meet minimum requirements.",
  );
  await expect(page.getByLabel("Your name")).toBeHidden();
  await expect(page).toHaveURL("http://127.0.0.1:4322/");
  if (failure !== "dataLayer")
    expect(await page.evaluate(() => window.dataLayer?.at(-1)?.event)).toBe(
      "partnership_request_submitted",
    );
}

test("analytics failures cannot block saving, confirmation, or the booking redirect", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/submissions/", (route) => {
    const payload = route.request().postDataJSON();
    requests.push(payload);
    const qualifies = payload.size === "20–49";
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        redirectUrl: qualifies ? "/?booked=1" : null,
        message: qualifies
          ? null
          : "Your organization does not meet minimum requirements.",
        qualifies,
        qualificationStatus: qualifies ? "qualified" : "does_not_qualify",
        referralBonusUsd: qualifies ? 8000 : 0,
        domain: "example.com",
        phone: null,
        consentVersion: "communications-v1-2026-09-19",
        consentRecordedAt: null,
      }),
    });
  });
  for (const failure of ["identify", "dataLayer", "session"] as const) {
    for (const qualifies of [false, true]) {
      await page.goto("/");
      await fillRequiredPartnership(page);
      await page
        .locator('[name="size"]')
        .selectOption(qualifies ? "20–49" : "1–10");
      await failPartnershipAnalytics(page, failure);
      const before = requests.length;
      await page.locator("#intake button").click();
      await expect.poll(() => requests.length).toBe(before + 1);
      await expectSavedPartnership(page, qualifies, failure);
    }
  }
});

test("a nonqualifying response records its event and hides fields without navigating", async ({
  page,
}) => {
  await page.route("**/api/submissions/", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        redirectUrl: null,
        message: "Your organization does not meet minimum requirements.",
        qualifies: false,
        qualificationStatus: "does_not_qualify",
        referralBonusUsd: 0,
        domain: "example.com",
        phone: null,
        consentVersion: "communications-v1-2026-09-19",
        consentRecordedAt: null,
      }),
    }),
  );
  await page.goto("/");
  await fillRequiredPartnership(page);
  await page.locator('[name="size"]').selectOption("1–10");
  await page.locator("#intake button").click();
  await expect(page.locator("#form-status")).toHaveText(
    "Your organization does not meet minimum requirements.",
  );
  await expect(page.getByLabel("Your name")).toBeHidden();
  await expect(page).toHaveURL("http://127.0.0.1:4322/");
  expect(
    await page.evaluate(() =>
      window.dataLayer?.find(
        (entry) => entry.event === "partnership_request_submitted",
      ),
    ),
  ).toMatchObject({
    qualifies: false,
    referral_bonus_usd: 0,
    qualification_status: "does_not_qualify",
  });
});
