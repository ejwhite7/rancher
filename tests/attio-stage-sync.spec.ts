import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  stageForSheetRow,
  stageForSheetStatus,
} from "../src/server/attio-stage-sync";

// Transpile the implementation with inert dependencies: no Sheet/auth entrypoint runs.
function stageSyncHarness() {
  const source = readFileSync("src/server/attio-stage-sync.ts", "utf8")
    .replace(/^import .*;\n/gm, "")
    .replace(/export /g, "");
  let key: string | undefined = "mock-attio-key";
  const syncOne = runInNewContext(
    ts.transpileModule(source + "\nsyncOne;", {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      serverEnv: () => key,
      AbortSignal,
      readDealsSheet: () => {
        throw Error("Unexpected Sheet read");
      },
    },
  );
  return {
    sync: async (send: typeof fetch, dryRun = false) =>
      syncOne("person@example.com", "Lost", send, dryRun),
    removeKey: () => {
      key = undefined;
    },
  };
}

function expectUpdatedStageRequest(calls: Array<[string, RequestInit]>) {
  expect(calls.map(([url, init]) => [url, init.method])).toEqual([
    ["https://api.attio.com/v2/objects/people/records/query", "POST"],
    ["https://api.attio.com/v2/objects/deals/records/one", "GET"],
    ["https://api.attio.com/v2/objects/deals/records/one", "PATCH"],
  ]);
  expect(JSON.parse(String(calls[0][1].body))).toEqual({
    filter: { email_addresses: "person@example.com" },
    limit: 2,
  });
  expect(JSON.parse(String(calls[2][1].body))).toEqual({
    data: { values: { stage: [{ status: "Lost" }] } },
  });
  for (const [, init] of calls) {
    expect(init.headers).toEqual({
      Authorization: "Bearer mock-attio-key",
      "Content-Type": "application/json",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  }
}

test("stage synchronization preserves relationship refusal and exact request contracts", async () => {
  const harness = stageSyncHarness();
  const calls: Array<[string, RequestInit]> = [];
  let responses: unknown[] = [];
  const send: typeof fetch = async (url, init) => {
    calls.push([String(url), init!]);
    return Response.json({ data: responses.shift() });
  };
  const run = async (data: unknown[]) => {
    calls.length = 0;
    responses = data;
    return harness.sync(send);
  };
  for (const people of [undefined, [], [{}, {}]]) {
    expect(await run([people])).toBe(people?.length ? "ambiguous" : "missing");
    expect(calls).toHaveLength(1);
  }
  for (const person of [
    {},
    { values: { associated_deals: [{ target_record_id: 42 }] } },
  ]) {
    expect(await run([[person]])).toBe("missing");
    expect(calls).toHaveLength(1);
  }
  const person = (ids: unknown[]) => ({
    values: {
      associated_deals: ids.map((target_record_id) => ({ target_record_id })),
    },
  });
  expect(await run([[person(["one", "two"])]])).toBe("ambiguous");
  expect(calls).toHaveLength(1);
  expect(
    await run([
      [person(["one", "one", 42])],
      { values: { stage: [{ status: { title: "Lost" } }] } },
    ]),
  ).toBe("unchanged");
  expect(calls).toHaveLength(2);
  expect(
    await run([
      [person(["one"])],
      { values: { stage: [{ status: { title: "Lead" } }] } },
      {},
    ]),
  ).toBe("updated");
  expectUpdatedStageRequest(calls);
  harness.removeKey();
  calls.length = 0;
  await expect(harness.sync(send)).rejects.toThrow(
    "Attio API key is not configured",
  );
  expect(calls).toEqual([]);
});

test("stage synchronization refuses missing or unreadable current stages", async () => {
  const { sync } = stageSyncHarness();
  for (const deal of [
    undefined,
    {},
    { values: { stage: [{ status: "Lost" }] } },
    { values: { stage: [{ status: { title: 42 } }] } },
  ]) {
    const methods: string[] = [];
    const data = [
      [{ values: { associated_deals: [{ target_record_id: "one" }] } }],
      deal,
    ];
    const send: typeof fetch = async (_, init) => {
      methods.push(init!.method!);
      return Response.json({ data: data.shift() });
    };
    expect(await sync(send)).toBe("missing");
    expect(methods).toEqual(["POST", "GET"]);
  }
});

test("stage dry run reads current stage without sending PATCH", async () => {
  const { sync } = stageSyncHarness();
  const methods: string[] = [];
  const responses = [
    [{ values: { associated_deals: [{ target_record_id: "one" }] } }],
    { values: { stage: [{ status: { title: "Lead" } }] } },
  ];
  const send: typeof fetch = async (_, init) => {
    methods.push(init!.method!);
    return Response.json({ data: responses.shift() });
  };
  expect(await sync(send, true)).toBe("wouldUpdate");
  expect(methods).toEqual(["POST", "GET"]);
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  expect(
    config.crons.find(
      (cron: { path: string }) => cron.path === "/api/cron/attio-stages/",
    ).schedule,
  ).toBe("0 * * * *");
});

test("stage synchronization parses response before status refusal and never proceeds after failure", async () => {
  const { sync } = stageSyncHarness();
  let reads = 0;
  const failed: typeof fetch = async () =>
    ({
      ok: false,
      status: 503,
      json: async () => {
        reads++;
        return {};
      },
    }) as Response;
  await expect(sync(failed)).rejects.toThrow("Attio request failed (503)");
  expect(reads).toBe(1);
  const malformed: typeof fetch = async () =>
    ({
      ok: false,
      status: 503,
      json: async () => {
        throw Error("malformed response");
      },
    }) as unknown as Response;
  await expect(sync(malformed)).rejects.toThrow("malformed response");
});

test("maps supported sheet statuses to Attio deal stages", () => {
  expect(stageForSheetStatus("Introduced")).toBe("Introduced");
  expect(stageForSheetStatus("inventory")).toBe("Inventory");
  expect(stageForSheetStatus("Rejected")).toBe("Unqualified");
  expect(stageForSheetStatus(" Closed Lost ")).toBe("Lost");
  expect(stageForSheetStatus("Closed Won")).toBe("Won 🎉");
});

test("reads status from column I, not operational G or data sources H", () => {
  expect(
    stageForSheetRow(["", "", "", "", "", "", true, "CRM", "Introduced"]),
  ).toBe("Introduced");
  expect(
    stageForSheetRow(["", "", "", "", "", "", "Inventory", "Closed Won", ""]),
  ).toBeNull();
  expect(
    stageForSheetRow(["", "", "", "", "", "", false, "", "Rejected"]),
  ).toBe("Unqualified");
});

test("ignores empty and unsupported sheet statuses", () => {
  expect(stageForSheetStatus("")).toBeNull();
  expect(stageForSheetStatus("  ")).toBeNull();
  expect(stageForSheetStatus("Discovery")).toBeNull();
  expect(stageForSheetStatus("Accepted")).toBeNull();
  expect(stageForSheetStatus("Maybe")).toBeNull();
  expect(stageForSheetStatus(42)).toBeNull();
});
