import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { database } from "../src/server/database";
import { saveSubmission } from "../src/server/submissions";
import { drainWebhookOutbox } from "../src/server/webhook-outbox";
import { handleWebhookDelivery } from "../src/server/webhook-handler";

test("webhook worker requires authentication and valid source configuration", async () => {
  let calls = 0;
  const deps = {
    secret: "test-secret",
    destination: "https://hkdk.events/test",
    drain: async () => {
      calls++;
      return { delivered: 0 };
    },
  };
  const request = (token?: string, method = "GET") =>
    new Request("https://rancher.example/api/cron/webhooks/", {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  expect((await handleWebhookDelivery(request(), deps)).status).toBe(401);
  expect((await handleWebhookDelivery(request("wrong"), deps)).status).toBe(
    401,
  );
  expect(
    (
      await handleWebhookDelivery(request("undefined"), {
        ...deps,
        secret: undefined,
      })
    ).status,
  ).toBe(401);
  expect(
    (await handleWebhookDelivery(request("test-secret", "POST"), deps)).status,
  ).toBe(405);
  for (const destination of [
    undefined,
    "http://hkdk.events/test",
    "https://evil.example/test",
    "https://hkdk.events/",
  ]) {
    expect(
      (
        await handleWebhookDelivery(request("test-secret"), {
          ...deps,
          destination,
        })
      ).status,
    ).toBe(503);
  }
  expect(calls).toBe(0);
  expect(
    (await handleWebhookDelivery(request("test-secret"), deps)).status,
  ).toBe(200);
  expect(calls).toBe(1);
});

test("outbox is atomic, retries failures, deduplicates inserts, and recovers leases", async () => {
  test.skip(
    process.env.RUN_DATABASE_TESTS !== "1",
    "Requires isolated local Postgres.",
  );
  expect(new URL(process.env.POSTGRES_URL!).hostname).toBe("127.0.0.1");
  const sql = database();
  const id = randomUUID();
  const rollbackId = randomUUID();
  const url = new URL("https://hkdk.events/test");
  const input = {
    idempotencyKey: id,
    name: "Webhook test",
    email: "webhook@example.com",
    title: "VP of Operations",
    company: "Synthetic webhook test",
    size: "20–49" as const,
    history: "3–5 years" as const,
    records: "None",
    recordTypes: ["Documents & files"] as ["Documents & files"],
    outreachConsent: true as const,
    scenario: null,
  };
  try {
    const files = (await readdir("db/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (let run = 0; run < 2; run++)
      await sql.begin(async (tx) => {
        for (const file of files)
          await tx.unsafe(await readFile(`db/migrations/${file}`, "utf8"));
      });
    await expect(
      sql.begin(async (tx) => {
        await tx`INSERT INTO rancher.partnership_submissions (id,name,email,company,team_size,data_history,records_description,outreach_consent,consent_text,request_hash)
        VALUES (${rollbackId},'Rollback','rollback@example.com','Synthetic','20–49','3–5 years','None',true,'test',${"0".repeat(64)})`;
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(
      await sql`SELECT id FROM rancher.webhook_outbox WHERE id=${rollbackId}`,
    ).toHaveLength(0);
    await Promise.all([saveSubmission(input), saveSubmission(input)]);
    const [event] =
      await sql`SELECT * FROM rancher.webhook_outbox WHERE id=${id}`;
    expect(event.payload.type).toBe("submission.created");
    expect(event.payload.schema_version).toBe(3);
    expect(event.payload.data.domain).toBe("example.com");
    expect(event.payload.data.job_title).toBe("VP of Operations");
    expect(event.payload.data.referral_bonus_usd).toBe(8000);
    expect(event.payload.data.request_hash).toBeUndefined();
    expect(event.payload.id).toBe(id);
    // Other test files may create events concurrently; isolate delivery candidates to this event.
    await sql`UPDATE rancher.webhook_outbox SET available_at = now() + interval '1 day' WHERE id <> ${id}`;
    const headers: string[] = [];
    const fail: typeof fetch = async (_url, init) => {
      headers.push(new Headers(init?.headers).get("Idempotency-Key")!);
      expect(JSON.parse(String(init?.body)).id).toBe(id);
      return new Response(null, {
        status: 429,
        headers: { "Retry-After": "3600" },
      });
    };
    const first = await drainWebhookOutbox(url, sql, fail);
    expect(first.retrying).toBe(1);
    const [pending] =
      await sql`SELECT * FROM rancher.webhook_outbox WHERE id=${id}`;
    expect(pending.status).toBe("pending");
    expect(pending.attempts).toBe(1);
    expect(pending.last_http_status).toBe(429);
    expect(
      new Date(pending.available_at).getTime() - Date.now(),
    ).toBeGreaterThan(3500000);
    await sql`UPDATE rancher.webhook_outbox SET available_at=now() WHERE id=${id}`;
    // Concurrent invocations cannot claim the same active lease.
    let acknowledge!: () => void;
    const success: typeof fetch = async (_url, init) => {
      headers.push(new Headers(init?.headers).get("Idempotency-Key")!);
      await new Promise<void>((resolve) => {
        acknowledge = resolve;
      });
      return new Response(null, { status: 202 });
    };
    const active = drainWebhookOutbox(url, sql, success);
    await expect.poll(() => typeof acknowledge).toBe("function");
    expect((await drainWebhookOutbox(url, sql, fail)).claimed).toBe(0);
    acknowledge();
    expect((await active).delivered).toBe(1);
    expect(headers).toEqual([id, id]);
    expect(
      (await sql`SELECT status FROM rancher.webhook_outbox WHERE id=${id}`)[0]
        .status,
    ).toBe("delivered");
    await sql`UPDATE rancher.webhook_outbox SET status='processing', lease_until=now()-interval '1 minute' WHERE id=${id}`;
    expect(
      (
        await drainWebhookOutbox(url, sql, async () => {
          throw new Error("network");
        })
      ).retrying,
    ).toBe(1);
    expect(
      (
        await sql`SELECT last_error FROM rancher.webhook_outbox WHERE id=${id}`
      )[0].last_error,
    ).toBe("network_or_timeout");
    await sql`UPDATE rancher.webhook_outbox SET attempts=12, status='processing', lease_until=now()-interval '1 minute' WHERE id=${id}`;
    await drainWebhookOutbox(url, sql, fail);
    expect(
      (await sql`SELECT status FROM rancher.webhook_outbox WHERE id=${id}`)[0]
        .status,
    ).toBe("failed");
    await sql`DELETE FROM rancher.partnership_submissions WHERE id=${id}`;
    expect(
      await sql`SELECT id FROM rancher.webhook_outbox WHERE id=${id}`,
    ).toHaveLength(0);
  } finally {
    await sql`DELETE FROM rancher.partnership_submissions WHERE id IN (${id},${rollbackId})`;
    // The Playwright worker owns the shared database connection pool.
  }
});
