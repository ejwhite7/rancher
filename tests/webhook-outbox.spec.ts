import { test, expect } from "@playwright/test";
import { drainWebhookOutbox, hookdeckUrl } from "../src/server/webhook-outbox";

test("Hookdeck URL policy rejects unsafe parts without widening the allowlist", () => {
  for (const value of [
    undefined,
    "",
    "not a URL",
    "http://hkdk.events/test",
    "https://evil.example/test",
    "https://hkdk.events.evil.example/test",
    "https://hkdk.events/",
    "https://user@hkdk.events/test",
    "https://user:password@hkdk.events/test",
    "https://hkdk.events:8443/test",
    "https://hkdk.events/test#fragment",
  ]) {
    expect(() => hookdeckUrl(value)).toThrow();
  }
  for (const value of [
    "https://hkdk.events/test",
    "https://events.hookdeck.com/test",
    "https://hkdk.events:443/test?x=1",
  ]) {
    expect(hookdeckUrl(value).href).toBe(new URL(value).href);
  }
});

function worker(attempts = 1) {
  const writes: { query: string; values: unknown[] }[] = [];
  const sql = Object.assign(
    async (parts: TemplateStringsArray, ...values: unknown[]) => {
      writes.push({ query: parts.join("?"), values });
      return [];
    },
    {
      begin: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(async (parts: TemplateStringsArray) => {
          if (parts.join("").includes("WITH candidates"))
            return [
              {
                id: "event-id",
                payload: { id: "event-id" },
                attempts,
                lease_token: "lease-token",
              },
            ];
          return [];
        }),
    },
  ) as unknown as NonNullable<Parameters<typeof drainWebhookOutbox>[1]>;
  return { sql, writes };
}

test("delivery preserves bounded Retry-After, backoff, terminal failure and lease predicates", async () => {
  for (const [retry, attempts, delay, status] of [
    ["3600", 1, 3600, "pending"],
    ["999999", 1, 86400, "pending"],
    ["invalid", 2, 120, "pending"],
    [new Date(Date.now() - 60000).toUTCString(), 1, 60, "pending"],
    [null, 12, 3600, "failed"],
  ] as const) {
    const { sql, writes } = worker(attempts);
    const result = await drainWebhookOutbox(
      hookdeckUrl("https://hkdk.events/test"),
      sql,
      async (_url, init) => {
        expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
          "event-id",
        );
        expect(init?.redirect).toBe("error");
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        return new Response(null, {
          status: 429,
          headers: retry ? { "Retry-After": retry } : {},
        });
      },
    );
    expect(writes[0].values).toEqual([
      status,
      delay,
      429,
      "http_429",
      "event-id",
      "lease-token",
    ]);
    expect(writes[0].query).toContain(
      "status = 'processing' AND lease_token =",
    );
    expect(result).toMatchObject({
      claimed: 1,
      retrying: status === "pending" ? 1 : 0,
      failed: status === "failed" ? 1 : 0,
    });
  }
});

test("network failures are persisted as retries; accepted responses remain accepted if cancellation fails", async () => {
  const network = worker();
  expect(
    await drainWebhookOutbox(
      hookdeckUrl("https://hkdk.events/test"),
      network.sql,
      async () => {
        throw new TypeError("private URL must not be logged");
      },
    ),
  ).toMatchObject({ retrying: 1 });
  expect(network.writes[0].values).toEqual([
    "pending",
    60,
    null,
    "network_or_timeout",
    "event-id",
    "lease-token",
  ]);
  const accepted = worker();
  const response = new Response("private body", { status: 202 });
  response.body!.cancel = async () => {
    throw new Error("cancel failed");
  };
  expect(
    await drainWebhookOutbox(
      hookdeckUrl("https://hkdk.events/test"),
      accepted.sql,
      async () => response,
    ),
  ).toMatchObject({ delivered: 1 });
  expect(accepted.writes[0].values).toEqual([202, "event-id", "lease-token"]);
});
