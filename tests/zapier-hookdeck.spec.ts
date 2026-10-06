import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

async function transformation(kind: string, token = "phc_test") {
  let transform: (request: any) => any;
  runInNewContext(
    await readFile(`hookdeck/zapier-partnership-${kind}.js`, "utf8"),
    {
      process: { env: { POSTHOG_PROJECT_TOKEN: token } },
      addHandler: (_event: string, handler: typeof transform) => {
        transform = handler;
      },
    },
  );
  return (request: any) => transform(request);
}

const lead = {
  lead_id: " 123 ",
  email: " A@EXAMPLE.COM ",
  name: " Alex ",
  company_size: "11-19",
  created_at: "2026-09-19T15:30:00Z",
  data_history: "0-3 years",
  coversion_utm_content: " fallback ",
};

function expectAttioRequest(output: any, properties: any) {
  expect(output.headers).toEqual({
    original: "retained",
    "content-type": "application/json",
  });
  expect(output.query).toBe("matching_attribute=email_addresses");
  expect(properties.email_addresses).toEqual(["a@example.com"]);
  expect(properties.name).toEqual([{ full_name: "Alex" }]);
  expect(properties.company_size).toBe("11-50");
  expect(properties.rancher_submission_id).toBe("zapier:123");
  expect(properties.rancher_communications_consent).toBe(false);
  expect(properties.phone_numbers).toBeUndefined();
  expect(properties.company_name).toBeUndefined();
}

function expectPostHogRequest(output: any, properties: any) {
  expect(output.headers).toEqual({ "content-type": "application/json" });
  expect([output.path, output.query, output.parsed_query]).toEqual([
    "",
    "",
    {},
  ]);
  expect(output.body).toEqual(
    expect.objectContaining({
      api_key: "phc_test",
      distinct_id: "a@example.com",
      timestamp: "2026-09-19T15:30:00.000Z",
      event: "partnership_request_submitted",
    }),
  );
  expect(properties.communications_consent).toBe(false);
  expect(properties.$insert_id).toBe("zapier-partnership:123");
  expect(properties.$set).toEqual({
    email: "a@example.com",
    name: "Alex",
    company: "",
    job_title: "",
  });
}

function expectInvalidLeadsUnmutated(transform: (request: any) => any) {
  for (const [body, message] of [
    [null, "Invalid Zapier lead"],
    [[], "Invalid Zapier lead"],
    [{ ...lead, email: "" }, "lead_id, email, and name are required"],
    [{ ...lead, company_size: "unknown" }, "Unsupported Rancher company size"],
  ] as const) {
    const request = {
      headers: { original: "retained" },
      query: "original",
      body,
    };
    expect(() => transform(request)).toThrow(message);
    expect(request).toEqual({
      headers: { original: "retained" },
      query: "original",
      body,
    });
  }
}

test("Zapier transformations preserve qualification, attribution fallback, consent and request shapes", async () => {
  for (const kind of ["attio", "posthog"]) {
    const transform = await transformation(kind);
    for (const body of [lead, JSON.stringify(lead)]) {
      const request = {
        headers: { original: "retained" },
        path: "/original",
        query: "original",
        body,
      };
      const output = JSON.parse(JSON.stringify(transform(request)));
      const properties =
        kind === "attio" ? output.body.data.values : output.body.properties;
      expect(properties.rancher_company_size).toBe("11–19");
      expect(properties.qualifies).toBe(false);
      expect(properties.qualification_status).toBe("does_not_qualify");
      expect(properties.referral_bonus_usd).toBe(0);
      expect(properties.conversion_utm_content).toBe("fallback");
      expect(properties.data_history).toBe("0–3 years");
      if (kind === "attio") {
        expectAttioRequest(output, properties);
      } else {
        expectPostHogRequest(output, properties);
        expect(request.body).toBe(body);
      }
    }
    expectInvalidLeadsUnmutated(transform);
  }
});

test("Zapier PostHog keeps token and timestamp validation order", async () => {
  const invalidToken = await transformation("posthog", "phx_invalid");
  expect(() => invalidToken({ body: null })).toThrow("Invalid Zapier lead");
  expect(() => invalidToken({ body: {} })).toThrow(
    "Invalid POSTHOG_PROJECT_TOKEN",
  );
  const transform = await transformation("posthog");
  expect(() => transform({ body: { ...lead, created_at: "invalid" } })).toThrow(
    "created_at must be a valid timestamp",
  );
});
