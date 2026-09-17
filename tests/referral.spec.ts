import { test, expect } from "@playwright/test";
import { handleReferralSubmission } from "../src/server/referral-handler";
import { SubmissionConflict } from "../src/server/submissions";
import { referralSchema, referralFormSchema } from "../src/lib/referral";
import { previewLinkResolver, supportedPreviewPath } from "../src/lib/preview";
import referral from "../prismic/seed/referral.json" with { type: "json" };
import form from "../prismic/seed/referral-form.json" with { type: "json" };
const input = {
  idempotencyKey: "53c5d917-09b6-459f-9c16-794972ec77eb",
  referrer_first_name: "Test",
  referrer_last_name: "Referrer",
  referrer_email: "REFERRER@gmail.com",
  referral_first_name: "Test",
  referral_last_name: "Referral",
  referral_email: "REFERRED@example.org",
  company_size: "50–199",
  industry: "Technology",
  website: "",
};
const request = (data: unknown, origin = "https://www.gorancher.com") =>
  new Request("https://www.gorancher.com/api/referral/", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(data),
  });
test("referral normalizes both emails, waits for storage, and reports failure or conflict", async () => {
  let saved = false;
  const response = await handleReferralSubmission(request(input), {
    save: async (data) => {
      expect(data.referrer_email).toBe("referrer@gmail.com");
      expect(data.referral_email).toBe("referred@example.org");
      saved = true;
    },
  });
  expect(saved).toBe(true);
  expect(response.status).toBe(201);
  for (const [error, status] of [
    [Error("offline"), 503],
    [new SubmissionConflict(), 409],
  ] as const) {
    expect(
      (
        await handleReferralSubmission(request(input), {
          save: async () => {
            throw error;
          },
        })
      ).status,
    ).toBe(status);
  }
});
test("referral rejects missing fields, invalid emails, spam, oversized and cross-origin requests", async () => {
  let saved = 0;
  const deps = {
    save: async () => {
      saved++;
    },
  };
  for (const key of Object.keys(input).filter((k) => k !== "website")) {
    expect(
      (await handleReferralSubmission(request({ ...input, [key]: "" }), deps))
        .status,
    ).toBe(400);
  }
  for (const data of [
    { ...input, referral_email: "invalid" },
    { ...input, referrer_email: "invalid" },
    { ...input, website: "bot" },
    { ...input, industry: "x".repeat(17000) },
    { ...input, unexpected: true },
  ]) {
    expect(
      (await handleReferralSubmission(request(data), deps)).status,
    ).toBeGreaterThanOrEqual(400);
  }
  expect(
    (
      await handleReferralSubmission(
        request(input, "https://other.example"),
        deps,
      )
    ).status,
  ).toBe(403);
  expect(saved).toBe(0);
});
test("referral CMS relationships, editable options and both preview entry points are validated", () => {
  expect(referralSchema.parse(referral).form.type).toBe("form");
  expect(
    referralFormSchema.parse(form).industry_options.length,
  ).toBeGreaterThan(1);
  expect(() =>
    referralSchema.parse({
      ...referral,
      form: { ...referral.form, isBroken: true },
    }),
  ).toThrow();
  expect(() =>
    referralFormSchema.parse({
      ...form,
      industry_options: [
        { label: "A", value: "a" },
        { label: "B", value: "a" },
      ],
    }),
  ).toThrow();
  expect(supportedPreviewPath("/referral/")).toBe(true);
  expect(previewLinkResolver({ type: "referral" } as any)).toBe("/referral/");
  expect(previewLinkResolver({ type: "form", uid: "referral" } as any)).toBe(
    "/referral/",
  );
});
async function fill(page: import("@playwright/test").Page) {
  for (const [key, value] of Object.entries(input).filter(
    ([key]) =>
      !["idempotencyKey", "company_size", "industry", "website"].includes(key),
  ))
    await page.locator(`[name="${key}"]`).fill(value);
  await page
    .getByLabel("Company size", { exact: true })
    .selectOption(input.company_size);
  await page
    .getByLabel("Industry", { exact: true })
    .selectOption(input.industry);
}
test("referral retries safely, identifies only the referrer, tracks once after save, and fits mobile", async ({
  page,
}) => {
  const bodies: any[] = [];
  await page.route("**/api/referral/", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({
      status: bodies.length === 1 ? 503 : 201,
      contentType: "application/json",
      body: JSON.stringify(
        bodies.length === 1 ? { error: "offline" } : { saved: true },
      ),
    });
  });
  await page.goto(
    "/referral/?utm_source=partner&utm_medium=referral&utm_campaign=referral-test",
  );
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://www.gorancher.com/referral/",
  );
  await expect(
    page.locator("footer").getByRole("link", { name: "Referral", exact: true }),
  ).toHaveAttribute("href", "/referral/");
  await page.evaluate(() => {
    const events: unknown[] = [];
    Object.assign(window, {
      referralAnalytics: events,
      dataLayer: [],
      posthog: {
        identify: (id: string, properties: unknown) =>
          events.push({ method: "identify", id, properties }),
        capture: (event: string, properties: unknown) =>
          events.push({ method: "capture", event, properties }),
      },
    });
  });
  await fill(page);
  await page
    .getByRole("button", { name: "Submit referral", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("try again");
  expect(await page.evaluate(() => (window as any).referralAnalytics)).toEqual(
    [],
  );
  await expect(page.getByLabel("Referral email", { exact: true })).toHaveValue(
    input.referral_email,
  );
  await page
    .getByRole("button", { name: "Submit referral", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "referral has been received",
  );
  expect(bodies[0].idempotencyKey).toBe(bodies[1].idempotencyKey);
  expect(await page.evaluate(() => (window as any).referralAnalytics)).toEqual([
    {
      method: "identify",
      id: "referrer@gmail.com",
      properties: {
        email: "referrer@gmail.com",
        name: "Test Referrer",
        domain: "gmail.com",
      },
    },
    {
      method: "capture",
      event: "referral_form_submitted",
      properties: {
        form: "referral",
        submission_id: bodies[1].idempotencyKey,
        event_id: bodies[1].idempotencyKey,
        $insert_id: bodies[1].idempotencyKey,
        referrer_first_name: input.referrer_first_name,
        referrer_last_name: input.referrer_last_name,
        referrer_email: input.referrer_email,
        referral_first_name: input.referral_first_name,
        referral_last_name: input.referral_last_name,
        referral_email: input.referral_email,
        company_size: input.company_size,
        industry: input.industry,
        attribution: {
          first: {
            source: "partner",
            medium: "referral",
            campaign: "referral-test",
          },
          last: {
            source: "partner",
            medium: "referral",
            campaign: "referral-test",
          },
        },
        $set: {
          attribution_last_source: "partner",
          attribution_last_medium: "referral",
          attribution_last_campaign: "referral-test",
        },
        $set_once: {
          attribution_first_source: "partner",
          attribution_first_medium: "referral",
          attribution_first_campaign: "referral-test",
        },
      },
    },
  ]);
  expect(await page.evaluate(() => (window as any).dataLayer)).toContainEqual(
    expect.objectContaining({
      event: "referral_form_submitted",
      event_id: bodies[1].idempotencyKey,
      attribution: bodies[1].attribution,
    }),
  );
  await page.goto("/referral/");
  await expect(
    page.getByRole("button", { name: "Submit referral", exact: true }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: test.info().outputPath("referral-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: test.info().outputPath("referral-mobile.png"),
    fullPage: true,
  });
});
test("analytics failures do not hide a successful referral", async ({
  page,
}) => {
  await page.route("**/api/referral/", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ saved: true }),
    }),
  );
  await page.goto("/referral/");
  await page.evaluate(() => {
    window.posthog = {
      identify: () => {
        throw Error("offline");
      },
      capture: () => {
        throw Error("offline");
      },
    };
  });
  await fill(page);
  await page
    .getByRole("button", { name: "Submit referral", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "referral has been received",
  );
});
