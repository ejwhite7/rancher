# Hookdeck submission delivery

Each new INSERT into `rancher.partnership_submissions` queues one `submission.created` event. Contact and referral inserts queue `contact.submission.created` and `referral.submission.created`. All three use `rancher.webhook_outbox`. A database trigger performs both writes in the same transaction. A repeated submission with the same idempotency key creates no additional event. Existing records are not automatically backfilled.

The protected Vercel cron route `/api/cron/webhooks/` runs every minute in production. Configure `HOOKDECK_SOURCE_URL` as the source-specific Rancher Events Gateway URL under `https://hooks.gorancher.com/`, and configure a randomly generated `CRON_SECRET`; both are server-only production environment variables. The cron secret is checked against the request's Bearer authorization header. Preview/development do not schedule delivery. Development submissions written to the shared production database also enter its queue.

`/api/cron/pipeline-report/` runs at the UTC hours covering 9:00 AM and 5:00 PM in `America/New_York`; the route checks local time so daylight-saving overlap runs are skipped. It reads current Attio deals, compares them with the latest `pipeline_report_snapshots` row, generates a weighted PNG, and uploads it with movement notes to `#pipeline-status`. It uses `ATTIO_API_KEY`, `SLACK_FORM_SUBMISSIONS_BOT_TOKEN`, and `CRON_SECRET`; set `SLACK_PIPELINE_CHANNEL_ID` only if channel-name discovery is unavailable. Stage weights are Lead 5%, Discovery 25%, Introduced 50%, Inventory 80%, Won 100%, and 0% for inactive stages.

New partnership and referral submissions use the shared Google Sheet writer for the `Deals` tab. Share the spreadsheet with the configured service account. The writer checks the exact A:I headers, writes the operational boolean to G, data sources to H, and leaves I (Status) blank for new leads. An existing normalized contact-email/company pair is left untouched, including its manually maintained status. The explicitly identified GrowthCast test address is excluded. A transaction-scoped database advisory lock serializes read/deduplicate/write operations across application instances; no new database table is required.

`/api/cron/attio-stages/` runs hourly (`0 * * * *`). The Sheet is authoritative for explicit supported statuses: email is C and Status is I, not G (Operational) or H (Data Sources). It finds the person’s single associated Attio deal and maps `Introduced`, `Inventory`, `Rejected`, `Closed Lost`, and `Closed Won` to `Introduced`, `Inventory`, `Unqualified`, `Lost`, and `Won 🎉`. `Accepted`, blank, and unsupported statuses do not reset existing deal progress. Missing/ambiguous relationships and unreadable current stages are skipped. Add `?dry_run=1` to the authenticated cron request to return counts, including `wouldUpdate`, without issuing Attio PATCH requests. It uses `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `ATTIO_API_KEY`, and `CRON_SECRET`.

### Meta lead-form delivery through Zapier

`POST /api/webhooks/meta-leads/` is a Sheet-only receiver protected by a dedicated server-only `GOOGLE_SHEETS_WEBHOOK_SECRET` Bearer token. Configure an additional connection from the existing Meta/Zapier Hookdeck source to this endpoint, without changing the existing Attio/PostHog connections. Attach `hookdeck/zapier-partnership-sheets.js` only to the new connection to normalize parsed or form-encoded source bodies to JSON. Disable path forwarding; set POST and the destination Bearer token; configure bounded exponential retries for non-2xx responses (five retries, starting at 30 seconds).

The receiver accepts all valid Meta company sizes, including nonqualifying leads. It validates and bounds lead ID, identity, company-size/history ranges and optional record types. It ignores unrelated source fields, rejects bodies over 16 KiB, excludes explicit internal/test leads, and uses the same locked deduplicating Sheet writer as website/referral submissions. Meta operational state and data sources remain blank when not supplied; no consent or other missing values are invented. Sheet failures return 503 so Hookdeck can retry this destination independently. Receipt duplicates return `existing`; test leads return `excluded`. No submission database INSERT, analytics conversion, email enrollment, or advertiser call is made by this receiver.

Deploy the endpoint and secret before enabling the new connection. Backfill only missing real Meta leads into empty rows after a fresh Sheet reconciliation; do not replay the source through unrelated destinations. Verify the new rows and rerun the reconciliation for zero remaining duplicates/missing records. Roll back routing by disabling only the new Sheet connection; application changes can be reverted through a normal Git revert/redeploy. Do not delete existing Sheet rows or reset Attio stages as part of rollback.

The worker claims up to ten events per invocation with `FOR UPDATE SKIP LOCKED`, assigns a two-minute lease, and sends HTTPS JSON requests with a ten-second timeout. Failed requests retry with exponential delay starting at one minute, capped at one hour; Retry-After can extend the delay up to 24 hours. After twelve attempts, an event remains marked `failed` for operator review. An interrupted invocation's expired leases can be reclaimed by the next run. A successful HTTP 2xx response marks an event delivered **to Hookdeck**, not necessarily to its downstream destination.

Both the JSON event `id` and the `Idempotency-Key`/`X-Rancher-Event-Id` headers use the submission UUID. Delivery is at least once: if acceptance occurs immediately before a database acknowledgement fails, the event can be resent. Configure downstream consumers to deduplicate using this stable ID. Configure routing, destination authentication, retry rules, and notifications inside Hookdeck for onward delivery.

The Partnership v7, Contact v3, and Referral v3 JSON envelopes contain `id`, `type`, `event_name`, `schema_version`, `created_at`, and `data`. The stable business event names are `partnership_request_submitted`, `contact_form_submitted`, and `referral_form_submitted`, allowing Hookdeck connections to route each payload before running its related transformation. Each `data` object contains the form fields plus a nested `attribution` object with immutable `first` and `last` snapshots. Partnership v7 also includes `conversion_attribution` with a version, submission ID, conversion timestamp, immutable first touch, and conversion touch. Partnership data contains normalized email domain, optional E.164 US phone number, communications-consent fields and disclosure version, calculator scenario, and the internal `referral_bonus_usd`. It excludes the request hash and honeypot. The source URL, credentials, payloads, and response bodies are not logged by the worker. The outbox uses RLS with no public policies; it is accessible only through authorized database roles.

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

Queued payloads and delivery history are retained until the submission is deleted; the foreign key cascades deletion to the outbox. Copies already delivered to Hookdeck or other tools require separate deletion there. Apply all migrations through `016_flatten_attribution_for_cdc.sql` with an administrative database connection before deploying the application and worker.

## Contact delivery and transformation

Contact events use schema version 2 and contain the submission ID, form identifier, name, email, email domain, message, and first/last attribution. Generated parent columns preserve foreign keys and cascading deletion for both contact and partnership events. No historical enquiries are backfilled.

The existing Hookdeck source `rancher-website` (`src_a3qr6u9qtbwd8e`) routes to the existing Attio destination through separate connections:

- `Rancher-to-Attio` routes `event_name = partnership_request_submitted` and retains its existing transformation/retry rules.
- `Rancher-Contact-to-Attio` routes `event_name = contact_form_submitted`, deduplicates within 60 seconds, applies `contact-attio` (`trs_bkVeya698fKz0Q`), and retries five times with exponential backoff starting at 30 seconds.

Transformation source: `hookdeck/contact-attio.js`. Connection rules: `hookdeck/contact-rules.json`. The contact transformation maps its message to Attio context. The partnership transformation keeps `additional_context` exclusively for text entered manually by the submitter and emits 15 first-touch fields, 15 conversion-touch fields, the attribution submission ID, and conversion timestamp as dedicated values for the Attio workflow to apply to its Person, Company, and Deal. It maps `company_size` to Attio's accepted Employee range options: `1–10` → `1-10`, `11–19` and `20–49` → `11-50`, `50–199` → `51-250`, `200–499` and `500–999` → `251-1K`, `1,000–4,999` → `1K-5K`, and `5,000+` → `5K-10K`. Both partnership and referral webhook payloads include `rancher_company_size` as the exact raw submitted band. Partnership schema version 9 also includes server-derived `qualifies` and `qualification_status`; `1–10` and `11–19` are nonqualifying, while all larger bands qualify. The partnership Hookdeck transformation retains those qualification values alongside `rancher_company_size` and Attio's normalized native `company_size`, allowing downstream workflow filters to use either the original selection or the explicit qualification state. Unsupported values fail before delivery rather than sending an invalid Attio option. Test the installed transformation without sending an enquiry to Attio:

```sh
npx hookdeck-cli gateway transformation run --id trs_bkVeya698fKz0Q --connection-id web_gO4m62pfvMJM --request-file hookdeck/contact-sample.json --output json
```

`db/tests/contact_webhooks.sql` checks transactional enqueueing, retry deduplication, payload fields, and cascading deletion. Run it inside an administrative transaction and roll back test work; do not commit synthetic enquiries to the live queue unless downstream delivery is intended.
