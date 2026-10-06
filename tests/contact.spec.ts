import { test, expect } from "@playwright/test";
import { handleContactSubmission } from "../src/server/contact-handler";
import { SubmissionConflict } from "../src/server/submissions";
import { contactSchema, contactFormSchema } from "../src/lib/contact";
import { previewLinkResolver, supportedPreviewPath } from "../src/lib/preview";
import contact from "../prismic/seed/contact.json" with { type: "json" };
import form from "../prismic/seed/contact-form.json" with { type: "json" };
const input = {
  idempotencyKey: "53c5d917-09b6-459f-9c16-794972ec77eb",
  name: "Test Visitor",
  email: "visitor@gmail.com",
  message: "A question about Rancher.",
  website: "",
};
const request = (data: unknown, origin = "https://www.gorancher.com") =>
  new Request("https://www.gorancher.com/api/contact/", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(data),
  });
test("contact saves basic enquiries including personal emails, and reports persistence failure", async () => {
  let saved = 0;
  const response = await handleContactSubmission(request(input), {
    save: async (data) => {
      expect(data.message).toBe(input.message);
      saved++;
    },
  });
  expect(response.status).toBe(201);
  expect(saved).toBe(1);
  expect(
    (
      await handleContactSubmission(request(input), {
        save: async () => {
          throw Error("offline");
        },
      })
    ).status,
  ).toBe(503);
  expect(
    (
      await handleContactSubmission(request(input), {
        save: async () => {
          throw new SubmissionConflict();
        },
      })
    ).status,
  ).toBe(409);
});
test("contact rejects invalid data, spam, oversized and cross-origin requests", async () => {
  let saved = 0;
  const dependencies = {
    save: async () => {
      saved++;
    },
  };
  for (const data of [
    { ...input, name: " " },
    { ...input, email: "invalid" },
    { ...input, message: "" },
    { ...input, website: "bot" },
    { ...input, message: "x".repeat(17000) },
  ])
    expect(
      (await handleContactSubmission(request(data), dependencies)).status,
    ).toBeGreaterThanOrEqual(400);
  expect(
    (
      await handleContactSubmission(
        request(input, "https://other.example"),
        dependencies,
      )
    ).status,
  ).toBe(403);
  expect(saved).toBe(0);
});
test("contact stream boundaries, request guards and capture failure preserve responses", async () => {
  const calls: string[] = [];
  const dependencies = {
    save: async () => {
      calls.push("save");
    },
    capture: async () => {
      calls.push("capture");
    },
  };
  const streamed = (text: string, fail = false, cancel?: () => void) =>
    new Request("https://www.gorancher.com/api/contact/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: new ReadableStream({
        start(controller) {
          if (fail) return controller.error(Error("read failed"));
          const bytes = new TextEncoder().encode(text);
          controller.enqueue(bytes.slice(0, 100));
          controller.enqueue(bytes.slice(100));
          controller.close();
        },
        cancel,
      }),
      duplex: "half",
    } as RequestInit);
  const text = JSON.stringify(input);
  const response = await handleContactSubmission(
    streamed(text.padEnd(16_384)),
    dependencies,
  );
  expect(response.status).toBe(201);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(calls).toEqual(["save", "capture"]);
  calls.length = 0;
  let cancelled = false;
  const oversized = new Request("https://www.gorancher.com/api/contact/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(16_385));
      },
      cancel() {
        cancelled = true;
      },
    }),
    duplex: "half",
  } as RequestInit);
  expect((await handleContactSubmission(oversized, dependencies)).status).toBe(
    413,
  );
  expect(cancelled).toBe(true);
  for (const [req, status, error] of [
    [streamed(text.padEnd(16_385)), 413, "Submission is too large."],
    [streamed("{"), 400, "Submission could not be read."],
    [streamed("", true), 400, "Submission could not be read."],
    [
      new Request("https://www.gorancher.com/api/contact/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      400,
      "Submission is empty.",
    ],
    [
      new Request("https://www.gorancher.com/api/contact/", { method: "POST" }),
      415,
      "Send a JSON submission.",
    ],
  ] as const) {
    const result = await handleContactSubmission(req, dependencies);
    expect(result.status).toBe(status);
    expect(await result.json()).toEqual({ error });
  }
  const method = await handleContactSubmission(
    new Request("https://www.gorancher.com/api/contact/"),
    dependencies,
  );
  expect(method.status).toBe(405);
  expect(method.headers.get("Allow")).toBe("POST");
  expect(calls).toEqual([]);
  const failedCapture = await handleContactSubmission(request(input), {
    ...dependencies,
    capture: async () => {
      calls.push("capture");
      throw Error("capture failed");
    },
  });
  expect(failedCapture.status).toBe(503);
  expect(calls).toEqual(["save", "capture"]);
});

test("contact CMS relationships and preview routes are validated", () => {
  expect(contactSchema.parse(contact).form.type).toBe("form");
  expect(contactFormSchema.parse(form).message_label).toBe("How can we help?");
  expect(() =>
    contactSchema.parse({
      ...contact,
      form: { ...contact.form, isBroken: true },
    }),
  ).toThrow();
  expect(supportedPreviewPath("/contact/")).toBe(true);
  expect(previewLinkResolver({ type: "contact" } as any)).toBe("/contact/");
  expect(previewLinkResolver({ type: "form", uid: "contact" } as any)).toBe(
    "/contact/",
  );
});
test("contact form retains entries on error, retries safely, confirms success and fits mobile", async ({
  page,
}) => {
  const bodies: any[] = [];
  await page.route("**/api/contact/", async (route) => {
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
    "/contact/?utm_source=newsletter&utm_medium=email&utm_campaign=contact-test",
  );
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://www.gorancher.com/contact/",
  );
  await page.evaluate(() => {
    const events: unknown[] = [];
    Object.assign(window, {
      contactAnalytics: events,
      dataLayer: [],
      posthog: {
        identify: (id: string, properties: Record<string, unknown>) =>
          events.push({ method: "identify", id, properties }),
        capture: (event: string, properties: Record<string, unknown>) =>
          events.push({ method: "capture", event, properties }),
      },
    });
  });
  await page.getByLabel("Name", { exact: true }).fill(input.name);
  await page.getByLabel("Email", { exact: true }).fill(input.email);
  await page
    .getByLabel("How can we help?", { exact: true })
    .fill(input.message);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("try again");
  expect(await page.evaluate(() => (window as any).contactAnalytics)).toEqual(
    [],
  );
  await expect(
    page.getByLabel("How can we help?", { exact: true }),
  ).toHaveValue(input.message);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "message has been received",
  );
  expect(bodies[0].idempotencyKey).toBe(bodies[1].idempotencyKey);
  expect(await page.evaluate(() => (window as any).contactAnalytics)).toEqual([
    {
      method: "identify",
      id: input.email,
      properties: { email: input.email, name: input.name, domain: "gmail.com" },
    },
    {
      method: "capture",
      event: "contact_form_submitted",
      properties: {
        form: "contact",
        submission_id: bodies[1].idempotencyKey,
        event_id: bodies[1].idempotencyKey,
        $insert_id: bodies[1].idempotencyKey,
        name: input.name,
        email: input.email,
        message: input.message,
        attribution: {
          first: {
            source: "newsletter",
            medium: "email",
            campaign: "contact-test",
          },
          last: {
            source: "newsletter",
            medium: "email",
            campaign: "contact-test",
          },
        },
        $set: {
          attribution_last_source: "newsletter",
          attribution_last_medium: "email",
          attribution_last_campaign: "contact-test",
        },
        $set_once: {
          attribution_first_source: "newsletter",
          attribution_first_medium: "email",
          attribution_first_campaign: "contact-test",
        },
      },
    },
  ]);
  expect(await page.evaluate(() => (window as any).dataLayer)).toContainEqual(
    expect.objectContaining({
      event: "contact_form_submitted",
      event_id: bodies[1].idempotencyKey,
      attribution: bodies[1].attribution,
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/contact/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: test.info().outputPath("contact-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: test.info().outputPath("contact-desktop.png"),
    fullPage: true,
  });
});

test("analytics errors never turn a saved contact enquiry into a failed form", async ({
  page,
}) => {
  await page.route("**/api/contact/", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ saved: true }),
    }),
  );
  await page.goto("/contact/");
  await page.evaluate(() => {
    window.posthog = {
      identify: () => {
        throw Error("analytics unavailable");
      },
      capture: () => {
        throw Error("analytics unavailable");
      },
    };
  });
  await page.getByLabel("Name", { exact: true }).fill(input.name);
  await page.getByLabel("Email", { exact: true }).fill(input.email);
  await page
    .getByLabel("How can we help?", { exact: true })
    .fill(input.message);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "message has been received",
  );
});
