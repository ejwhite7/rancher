import { test, expect } from "@playwright/test";
import { handleSubmission } from "../src/server/submission-handler";
import { SubmissionConflict } from "../src/server/submissions";
const valid = {
  idempotencyKey: "e6fb5cf8-f4c5-41aa-a3c8-34b3bb0789cb",
  name: "Alex Morgan",
  email: "alex@example.com",
  title: "VP of Operations",
  company: "Example Company",
  size: "20–49",
  history: "3–5 years",
  records: "Project histories",
  recordTypes: ["Documents & files", "Projects & knowledge"],
  phone: "(212) 555-0123",
  communicationsConsent: true,
  website: "",
  scenario: { employees: 100, years: 10, country: "Canada" },
};
const booking = "https://cal.com/rancher/discovery";
const request = (data: unknown, headers: Record<string, string> = {}) =>
  new Request("https://rancher.example/api/submissions/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://rancher.example",
      ...headers,
    },
    body: JSON.stringify(data),
  });

test("accepts valid submissions only after persistence resolves", async () => {
  let resolveSave!: () => void;
  let saved = false;
  let captured = false;
  const response = handleSubmission(request({ ...valid, records: undefined }), {
    bookingUrl: () => booking,
    save: async () => {
      await new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      saved = true;
    },
    capture: async () => {
      expect(saved).toBe(true);
      captured = true;
    },
  });
  await expect.poll(() => typeof resolveSave).toBe("function");
  expect(saved).toBe(false);
  resolveSave();
  const result = await response;
  expect(saved).toBe(true);
  expect(captured).toBe(true);
  expect(result.status).toBe(201);
  expect(await result.json()).toEqual({
    redirectUrl: booking,
    referralBonusUsd: 8000,
    domain: "example.com",
    phone: "+12125550123",
  });
});

test("rejects missing fields, invalid phones, tampered scenarios, and honeypots", async () => {
  let writes = 0;
  const dependencies = {
    bookingUrl: () => booking,
    save: async () => {
      writes++;
    },
  };
  for (const key of Object.keys(valid).filter(
    (key) => key !== "website" && key !== "records",
  )) {
    const data = { ...valid } as Record<string, unknown>;
    delete data[key];
    expect((await handleSubmission(request(data), dependencies)).status).toBe(
      400,
    );
  }
  for (const change of [
    { email: "invalid" },
    { email: "person@gmail.com" },
    { email: "person@yahoo.com" },
    { email: "person@aol.com" },
    { email: "person@icloud.com" },
    { email: "person@hey.com" },
    { email: "person@mailinator.com" },
    { size: "20–100" },
    { referralBonusUsd: 75000 },
    { name: "  " },
    { title: "  " },
    { recordTypes: [] },
    { recordTypes: ["Unknown"] },
    { history: "1–3 years" },
    { history: "5+ years" },
    { phone: "555-1234" },
    { phone: "", communicationsConsent: true },
    { website: "bot.example" },
    { scenario: { employees: 1000, years: 10, country: "USA" } },
  ]) {
    expect(
      (await handleSubmission(request({ ...valid, ...change }), dependencies))
        .status,
    ).toBe(400);
  }
  expect(writes).toBe(0);

  const optionalPhone = await handleSubmission(
    request({ ...valid, phone: "", communicationsConsent: false }),
    dependencies,
  );
  expect(optionalPhone.status).toBe(201);
  expect(writes).toBe(1);
});

test("rejects cross-origin and oversized requests without writing", async () => {
  let writes = 0;
  const dependencies = {
    bookingUrl: () => booking,
    save: async () => {
      writes++;
    },
  };
  expect(
    (
      await handleSubmission(
        request(valid, { Origin: "https://untrusted.example" }),
        dependencies,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handleSubmission(
        request({ ...valid, records: "x".repeat(20000) }),
        dependencies,
      )
    ).status,
  ).toBe(413);
  expect(
    (
      await handleSubmission(
        request(valid, { "Content-Type": "text/plain" }),
        dependencies,
      )
    ).status,
  ).toBe(415);
  expect(writes).toBe(0);
});

test("database failures, conflicting retries, and invalid booking configuration do not redirect", async () => {
  for (const error of [new Error("DB unavailable"), new SubmissionConflict()]) {
    const response = await handleSubmission(request(valid), {
      bookingUrl: () => booking,
      save: async () => {
        throw error;
      },
    });
    expect([503, 409]).toContain(response.status);
    expect(await response.json()).not.toHaveProperty("redirectUrl");
  }
  let writes = 0;
  for (const url of [
    undefined,
    "javascript:alert(1)",
    "https://user:password@example.com",
  ]) {
    expect(
      (
        await handleSubmission(request(valid), {
          bookingUrl: () => url,
          save: async () => {
            writes++;
          },
        })
      ).status,
    ).toBe(503);
  }
  expect(writes).toBe(0);
});

test("form preserves entries on failure and reuses its retry key", async ({
  page,
}) => {
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/submissions/", async (route) => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "We could not save your request. Please try again.",
      }),
    });
  });
  await page.goto("/");
  await expect(page.locator("#intake button")).toBeEnabled();
  await page.getByLabel("Your name").fill(valid.name);
  await page.getByLabel("Work email").fill(valid.email);
  await page.getByLabel("Job title").fill(valid.title);
  await page.getByLabel("Company", { exact: true }).fill(valid.company);
  await page.locator('[name="size"]').selectOption(valid.size);
  await page.locator('[name="history"]').selectOption(valid.history);
  await page.getByLabel("Documents & files", { exact: true }).check();
  await page.locator('[name="records"]').fill(valid.records);
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "Submit & book a call" }).click();
    await expect(page.locator("#form-status")).toContainText("could not save");
    await expect(page.getByLabel("Your name")).toHaveValue(valid.name);
  }
  expect(payloads).toHaveLength(2);
  expect(payloads[0].idempotencyKey).toBe(payloads[1].idempotencyKey);
  await expect(page).toHaveURL("http://127.0.0.1:4322/");
});
