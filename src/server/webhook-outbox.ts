import { database } from "./database";

const MAX_ATTEMPTS = 12;
type Delivery = {
  id: string;
  payload: Record<string, unknown>;
  attempts: number;
  lease_token: string;
};
type Sql = ReturnType<typeof database>;

export function hookdeckUrl(value: string | undefined): URL {
  const url = new URL(value || "");
  if (
    url.protocol !== "https:" ||
    ![
      "hkdk.events",
      "events.hookdeck.com",
      "hooks.gorancher.com",
    ].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    url.pathname === "/"
  ) {
    throw new Error("Invalid Hookdeck source configuration");
  }
  return url;
}

export async function drainWebhookOutbox(
  destination: URL,
  sql: Sql = database(),
  send: typeof fetch = fetch,
) {
  // Expired leases recover work after a killed function; the token prevents stale acknowledgements.
  const deliveries = await sql.begin(async (tx) => {
    await tx`UPDATE rancher.webhook_outbox SET status = 'failed', lease_token = NULL, lease_until = NULL,
      last_error = 'retry_limit_reached'
      WHERE attempts >= ${MAX_ATTEMPTS} AND (status = 'pending' OR (status = 'processing' AND lease_until <= now()))`;
    return await tx<Delivery[]>`
      WITH candidates AS (
        SELECT id FROM rancher.webhook_outbox
        WHERE attempts < ${MAX_ATTEMPTS} AND
          ((status = 'pending' AND available_at <= now()) OR (status = 'processing' AND lease_until <= now()))
        ORDER BY available_at, created_at
        FOR UPDATE SKIP LOCKED LIMIT 10
      )
      UPDATE rancher.webhook_outbox AS o
      SET status = 'processing', attempts = attempts + 1,
          lease_token = gen_random_uuid(), lease_until = now() + interval '2 minutes'
      FROM candidates WHERE o.id = candidates.id
      RETURNING o.id, o.payload, o.attempts, o.lease_token
    `;
  });
  const outcomes = await Promise.all(
    deliveries.map(async (delivery) => {
      let httpStatus: number | null = null;
      let accepted = false;
      let retryAfter = 0;
      try {
        const response = await send(destination, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": delivery.id,
            "X-Rancher-Event-Id": delivery.id,
          },
          body: JSON.stringify(delivery.payload),
          signal: AbortSignal.timeout(10_000),
          redirect: "error",
        });
        httpStatus = response.status;
        accepted = response.ok;
        const retry = response.headers.get("retry-after");
        if (retry) {
          const seconds = /^\d+$/.test(retry)
            ? Number(retry)
            : (Date.parse(retry) - Date.now()) / 1000;
          if (Number.isFinite(seconds))
            retryAfter = Math.max(0, Math.min(86400, seconds));
        }
        // Never persist response bodies, which may echo submitted personal information.
        await response.body?.cancel();
      } catch {
        // Timeouts, redirects and network failures are retryable; don't log source URLs or payloads.
      }
      if (accepted) {
        await sql`UPDATE rancher.webhook_outbox SET status = 'delivered', delivered_at = now(),
        lease_token = NULL, lease_until = NULL, last_http_status = ${httpStatus}, last_error = NULL
        WHERE id = ${delivery.id} AND status = 'processing' AND lease_token = ${delivery.lease_token}`;
        return "delivered";
      }
      const failed = delivery.attempts >= MAX_ATTEMPTS;
      const delay = Math.ceil(
        Math.max(retryAfter, Math.min(3600, 60 * 2 ** (delivery.attempts - 1))),
      );
      await sql`UPDATE rancher.webhook_outbox SET status = ${failed ? "failed" : "pending"},
      available_at = now() + ${delay} * interval '1 second', lease_token = NULL, lease_until = NULL,
      last_http_status = ${httpStatus}, last_error = ${httpStatus === null ? "network_or_timeout" : "http_" + httpStatus}
      WHERE id = ${delivery.id} AND status = 'processing' AND lease_token = ${delivery.lease_token}`;
      return failed ? "failed" : "retrying";
    }),
  );
  return {
    claimed: deliveries.length,
    delivered: outcomes.filter((status) => status === "delivered").length,
    retrying: outcomes.filter((status) => status === "retrying").length,
    failed: outcomes.filter((status) => status === "failed").length,
  };
}
