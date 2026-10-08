import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import {
  handleMetaSheet,
  metaSheetRow,
} from "../src/server/meta-sheet-handler";
import {
  ensureSheetRow,
  DEALS_HEADERS,
  sheetRowTarget,
} from "../src/server/google-sheets";

const lead = {
  lead_id: "1234567890123",
  name: "Alex Morgan",
  email: "alex@example.com",
  company: "Example",
  company_size: "20-49",
  data_history: "3-5 years",
};
const request = (body: unknown = lead, token = "mock-secret") =>
  new Request("https://rancher.test/api/webhooks/meta-leads/", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

test("Meta rows preserve unknown fields and do not invent operational state or status", () => {
  expect(metaSheetRow(lead)).toEqual([
    "Example",
    "Alex Morgan",
    "alex@example.com",
    "",
    "20–49",
    "3–5 years",
    "",
    "",
    "",
  ]);
  expect(
    metaSheetRow({
      ...lead,
      is_business_active: false,
      record_types: ["CRM"],
    })?.slice(6),
  ).toEqual([false, "CRM", ""]);
  expect(metaSheetRow({ ...lead, is_internal_user: true })).toBeNull();
  expect(() => metaSheetRow({ ...lead, company_size: "nonsense" })).toThrow();
});

test("Sheet retries deduplicate by normalized contact and company without resetting stages", async () => {
  const row = metaSheetRow(lead)!;
  const existing = [...row];
  existing[8] = "Inventory";
  existing[0] = " EXAMPLE ";
  existing[2] = "ALEX@EXAMPLE.COM";
  expect(
    sheetRowTarget(
      [DEALS_HEADERS, existing, ["", "", "", "", "", "", false]],
      row,
    ),
  ).toBeNull();
  expect(
    sheetRowTarget(
      [DEALS_HEADERS, existing, ["", "", "", "", "", "", false]],
      [...row.slice(0, 2), "other@example.com", ...row.slice(3)],
    ),
  ).toBe(3);
  expect(
    sheetRowTarget(
      [DEALS_HEADERS, existing],
      [...row.slice(0, 2), "other@example.com", ...row.slice(3)],
    ),
  ).toBe(3);
  expect(
    await ensureSheetRow(
      metaSheetRow({ ...lead, email: "ewhite@growthcast.app" })!,
    ),
  ).toBe("excluded");
});

test("Meta webhook refuses invalid requests before any writes", async () => {
  let writes = 0;
  const write: typeof ensureSheetRow = async () => {
    writes++;
    return "added";
  };
  for (const [req, secret, status] of [
    [request(lead, "wrong"), "mock-secret", 401],
    [request(), undefined, 401],
    [new Request(request().url), "mock-secret", 405],
    [request({ ...lead, email: "not-email" }), "mock-secret", 400],
    [request({ ...lead, lead_id: "" }), "mock-secret", 400],
    [request({ ...lead, company: "x".repeat(17000) }), "mock-secret", 413],
  ] as const)
    expect((await handleMetaSheet(req, secret, write)).status).toBe(status);
  expect(writes).toBe(0);
});

test("Meta webhook returns destination-only retry errors and excludes internal leads", async () => {
  process.env.PUBLIC_POSTHOG_PROJECT_TOKEN = ""; // Never send telemetry from this synthetic test.
  let writes = 0;
  const write: typeof ensureSheetRow = async () => {
    writes++;
    return "existing";
  };
  expect(
    await (await handleMetaSheet(request(), "mock-secret", write)).json(),
  ).toEqual({ result: "existing" });
  expect(
    await (
      await handleMetaSheet(
        request({ ...lead, is_internal_user: true }),
        "mock-secret",
        write,
      )
    ).json(),
  ).toEqual({ result: "excluded" });
  expect(writes).toBe(1);
  expect(
    (
      await handleMetaSheet(request(), "mock-secret", async () => {
        throw Error("mock failure");
      })
    ).status,
  ).toBe(503);
});

test("Hookdeck Sheet-only transformation accepts parsed and encoded Meta payloads", () => {
  let transform: (request: any) => any;
  runInNewContext(
    readFileSync("hookdeck/zapier-partnership-sheets.js", "utf8"),
    {
      // Hookdeck's runtime does not provide URLSearchParams.
      addHandler: (_: string, handler: typeof transform) => {
        transform = handler;
      },
    },
  );
  for (const [body, contentType] of [
    [lead, "application/x-www-form-urlencoded"],
    [JSON.stringify(lead), "application/json"],
    [new URLSearchParams(lead).toString(), "application/x-www-form-urlencoded"],
  ]) {
    const result = transform!({
      body,
      headers: { "content-type": contentType },
    });
    expect(result.headers["content-type"]).toBe("application/json");
    expect(metaSheetRow(result.body)).toEqual(metaSheetRow(lead));
  }
});
