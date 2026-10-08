import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { DEALS_HEADERS } from "../src/server/google-sheets";
import { sanitizedErrorCode } from "../src/server/logger";

function sheetHarness(rows: unknown[][], failWrite = false) {
  const order: string[] = [];
  const writes: unknown[] = [];
  const source = readFileSync("src/server/google-sheets.ts", "utf8")
    .replace(/^import .*;\n/gm, "")
    .replace(/export /g, "");
  const send: typeof fetch = async (_, init) => {
    const method = init?.method || "GET";
    order.push(method);
    if (method === "GET") return Response.json({ values: rows });
    writes.push(JSON.parse(String(init!.body)));
    return failWrite
      ? Response.json({ error: { message: "mock" } }, { status: 503 })
      : new Response(null);
  };
  const api = runInNewContext(
    ts.transpileModule(
      source +
        '\ntokenCache = {value: "mock-token", expiresAt: Date.now()+3600000}; ({ensureSheetRow});',
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
    ).outputText,
    {
      Buffer,
      AbortSignal,
      serverEnv: () => "mock-spreadsheet",
      database: () => ({
        begin: async (callback: (sql: any) => Promise<unknown>) => {
          order.push("begin");
          const result = await callback(async (query: TemplateStringsArray) => {
            expect(query.join("")).toContain("pg_advisory_xact_lock");
            order.push("lock");
          });
          order.push("commit");
          return result;
        },
      }),
    },
  );
  return {
    run: async (row: (string | boolean)[]) => api.ensureSheetRow(row, send),
    order,
    writes,
  };
}
const row = [
  "Example",
  "Alex",
  "alex@example.com",
  "",
  "20–49",
  "3–5 years",
  true,
  "CRM",
  "",
];

test("Sheet and stage error summaries stay bounded and single-line", () => {
  expect(sanitizedErrorCode(new Error("bad\nvalue!"))).toBe("badvalue");
  expect(sanitizedErrorCode(new Error("x".repeat(200)))).toHaveLength(120);
  expect(sanitizedErrorCode({ message: "untrusted" })).toBe("unknown");
});

test("shared Sheet transport holds a cross-instance lock around read/deduplicate/write", async () => {
  const harness = sheetHarness([
    DEALS_HEADERS,
    ["", "", "", "", "", "", false],
  ]);
  expect(await harness.run(row)).toBe("added");
  expect(harness.order).toEqual(["begin", "lock", "GET", "PUT", "commit"]);
  expect(harness.writes).toEqual([{ majorDimension: "ROWS", values: [row] }]);
});

test("shared Sheet transport refuses header drift and surfaces write failures for retry", async () => {
  const badHeaders = [...DEALS_HEADERS];
  [badHeaders[6], badHeaders[8]] = [badHeaders[8], badHeaders[6]];
  const drift = sheetHarness([badHeaders]);
  await expect(drift.run(row)).rejects.toThrow("Deals headers");
  expect(drift.writes).toEqual([]);
  const failure = sheetHarness([DEALS_HEADERS], true);
  await expect(failure.run(row)).rejects.toThrow(
    "Google Sheets update failed (503)",
  );
});

test("shared Sheet transport preserves existing statuses and never writes duplicates", async () => {
  const existing = [...row];
  existing[8] = "Inventory";
  const harness = sheetHarness([DEALS_HEADERS, existing]);
  expect(await harness.run(row)).toBe("existing");
  expect(harness.order).toEqual(["begin", "lock", "GET", "commit"]);
  expect(harness.writes).toEqual([]);
});
