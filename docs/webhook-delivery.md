# Hookdeck submission delivery

Each new INSERT into `rancher.partnership_submissions` queues one `submission.created` event in `rancher.webhook_outbox`. A database trigger performs both writes in the same transaction. A repeated submission with the same idempotency key creates no additional event. Existing records are not automatically backfilled.

The protected Vercel cron route `/api/cron/webhooks/` runs every minute in production. Configure `HOOKDECK_SOURCE_URL` and a randomly generated `CRON_SECRET` as server-only production environment variables. The cron secret is checked against the request's Bearer authorization header. Preview/development do not schedule delivery. Development submissions written to the shared production database also enter its queue.

The worker claims up to ten events per invocation with `FOR UPDATE SKIP LOCKED`, assigns a two-minute lease, and sends HTTPS JSON requests with a ten-second timeout. Failed requests retry with exponential delay starting at one minute, capped at one hour; Retry-After can extend the delay up to 24 hours. After twelve attempts, an event remains marked `failed` for operator review. An interrupted invocation's expired leases can be reclaimed by the next run. A successful HTTP 2xx response marks an event delivered **to Hookdeck**, not necessarily to its downstream destination.

Both the JSON event `id` and the `Idempotency-Key`/`X-Rancher-Event-Id` headers use the submission UUID. Delivery is at least once: if acceptance occurs immediately before a database acknowledgement fails, the event can be resent. Configure downstream consumers to deduplicate using this stable ID. Configure routing, destination authentication, retry rules, and notifications inside Hookdeck for onward delivery.

The version-1 JSON envelope contains `id`, `type`, `schema_version`, `created_at`, and `data`. Data contains submission ID, name, email, company, company size, data history, record types, additional context, consent fields, calculator scenario, and the internal `referral_bonus_usd`. It excludes the request hash and honeypot. The source URL, credentials, payloads, and response bodies are not logged by the worker. The outbox uses RLS with no public policies; it is accessible only through authorized database roles.

## Inspect delivery status

In Supabase SQL Editor:

```sql
SELECT id, created_at, status, attempts, available_at,
       last_http_status, last_error, delivered_at
FROM rancher.webhook_outbox
ORDER BY created_at DESC;
```

`pending` means awaiting delivery/retry, `processing` means leased by a worker, `delivered` means accepted by Hookdeck, and `failed` means the retry limit has been reached. Monitor failed rows and stale pending rows; Hookdeck can only monitor events it has received.

## Replay a failed event

After fixing the source configuration or service issue, use the actual event ID:

```sql
UPDATE rancher.webhook_outbox
SET status = 'pending', attempts = 0, available_at = now(),
    lease_token = NULL, lease_until = NULL, last_error = NULL,
    last_http_status = NULL, delivered_at = NULL
WHERE id = 'REPLACE-WITH-EVENT-UUID' AND status = 'failed';
```

The next cron run sends it with the same event ID. Use Hookdeck's replay controls for downstream failures after successful ingestion.

Queued payloads and delivery history are retained until the submission is deleted; the foreign key cascades deletion to the outbox. Copies already delivered to Hookdeck or other tools require separate deletion there. Apply `004_submission_webhook_outbox.sql` with an administrative database connection before deploying the worker.
