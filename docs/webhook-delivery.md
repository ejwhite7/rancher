# Hookdeck submission delivery

Each new INSERT into `rancher.partnership_submissions` queues one `submission.created` event. Contact and referral inserts queue `contact.submission.created` and `referral.submission.created`. All three use `rancher.webhook_outbox`. A database trigger performs both writes in the same transaction. A repeated submission with the same idempotency key creates no additional event. Existing records are not automatically backfilled.

The protected Vercel cron route `/api/cron/webhooks/` runs every minute in production. Configure `HOOKDECK_SOURCE_URL` and a randomly generated `CRON_SECRET` as server-only production environment variables. The cron secret is checked against the request's Bearer authorization header. Preview/development do not schedule delivery. Development submissions written to the shared production database also enter its queue.

The worker claims up to ten events per invocation with `FOR UPDATE SKIP LOCKED`, assigns a two-minute lease, and sends HTTPS JSON requests with a ten-second timeout. Failed requests retry with exponential delay starting at one minute, capped at one hour; Retry-After can extend the delay up to 24 hours. After twelve attempts, an event remains marked `failed` for operator review. An interrupted invocation's expired leases can be reclaimed by the next run. A successful HTTP 2xx response marks an event delivered **to Hookdeck**, not necessarily to its downstream destination.

Both the JSON event `id` and the `Idempotency-Key`/`X-Rancher-Event-Id` headers use the submission UUID. Delivery is at least once: if acceptance occurs immediately before a database acknowledgement fails, the event can be resent. Configure downstream consumers to deduplicate using this stable ID. Configure routing, destination authentication, retry rules, and notifications inside Hookdeck for onward delivery.

The Partnership v5, Contact v3, and Referral v3 JSON envelopes contain `id`, `type`, `event_name`, `schema_version`, `created_at`, and `data`. The stable business event names are `partnership_request_submitted`, `contact_form_submitted`, and `referral_form_submitted`, allowing Hookdeck connections to route each payload before running its related transformation. Each `data` object contains the form fields plus a nested `attribution` object with immutable `first` and `last` snapshots. Partnership data also contains normalized email domain, consent fields, calculator scenario, and the internal `referral_bonus_usd`. It excludes the request hash and honeypot. The source URL, credentials, payloads, and response bodies are not logged by the worker. The outbox uses RLS with no public policies; it is accessible only through authorized database roles.

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

Queued payloads and delivery history are retained until the submission is deleted; the foreign key cascades deletion to the outbox. Copies already delivered to Hookdeck or other tools require separate deletion there. Apply all migrations through `011_webhook_event_names.sql` with an administrative database connection before deploying the application and worker.


## Contact delivery and transformation

Contact events use schema version 2 and contain the submission ID, form identifier, name, email, email domain, message, and first/last attribution. Generated parent columns preserve foreign keys and cascading deletion for both contact and partnership events. No historical enquiries are backfilled.

The existing Hookdeck source `rancher-website` (`src_a3qr6u9qtbwd8e`) routes to the existing Attio destination through separate connections:

- `Rancher-to-Attio` routes `event_name = partnership_request_submitted` and retains its existing transformation/retry rules.
- `Rancher-Contact-to-Attio` routes `event_name = contact_form_submitted`, deduplicates within 60 seconds, applies `contact-attio` (`trs_bkVeya698fKz0Q`), and retries five times with exponential backoff starting at 30 seconds.

Transformation source: `hookdeck/contact-attio.js`. Connection rules: `hookdeck/contact-rules.json`. The transformation maps email, name, submission ID, domain, contact message, and readable first/last attribution lines to Attio's existing `additional_context` attribute. It does not set company, job title, or consent fields. Partnership and referral transformations preserve the submitted Rancher range in context while mapping `company_size` to Attio's accepted Employee range options: `20–49` → `11-50`, `50–199` → `51-250`, `200–499` and `500–999` → `251-1K`, `1,000–4,999` → `1K-5K`, and `5,000+` → `5K-10K`. Unsupported values fail before delivery rather than sending an invalid Attio option. Test the installed transformation without sending an enquiry to Attio:

```sh
npx hookdeck-cli gateway transformation run --id trs_bkVeya698fKz0Q --connection-id web_gO4m62pfvMJM --request-file hookdeck/contact-sample.json --output json
```

`db/tests/contact_webhooks.sql` checks transactional enqueueing, retry deduplication, payload fields, and cascading deletion. Run it inside an administrative transaction and roll back test work; do not commit synthetic enquiries to the live queue unless downstream delivery is intended.
