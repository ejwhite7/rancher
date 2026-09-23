# Rancher

Astro with React islands, deployed to Vercel. The marketing and legal pages are prerendered from Prismic; `/api/submissions/` runs as a serverless function and stores inquiries in Supabase PostgreSQL before directing the browser to the booking calendar.

```sh
npm ci
npx vercel env pull .env.local --yes
npm run db:migrate
# Configure Prismic first (see docs/prismic.md).
npm run dev
```

Use Node.js 24 to match the deployment runtime. Development serves the site at http://localhost:4321.

## Environment

- `SITE_URL`: canonical public origin, e.g. the project's production Vercel alias. The sitemap and all absolute SEO URLs use it.
- `POSTGRES_URL`: server-side pooled Postgres connection provisioned by the Vercel Supabase integration. `DATABASE_URL` is accepted as an alternative. Never prefix credentials with `PUBLIC_` or expose them to the browser.
- `BOOKING_URL`: HTTPS calendar URL. Initially `https://cal.com/rancher/discovery`. The server reads it at request time. The browser receives it only after the database confirms the submission. No contact information is appended to this URL.
- `PUBLIC_POSTHOG_PROJECT_TOKEN`: browser-safe PostHog project token used for analytics and OTLP log authentication. Do not use a personal API key.
- `PUBLIC_POSTHOG_HOST`: canonical PostHog ingestion origin used by server capture. Browser analytics uses the same-origin `/ingest` proxy configured in `vercel.json`.
- `OTEL_SERVICE_NAME`: optional OpenTelemetry service name; defaults to `rancher-web`.
- `POSTHOG_LOGS_ENDPOINT`: optional OTLP/HTTP logs endpoint; defaults to `https://us.i.posthog.com/i/v1/logs`.

The Supabase integration provides the production database connection. Preview and development use a dedicated `rancher_form_writer` role with INSERT access and SELECT access only to id and request hash for retry detection. Its RLS policies apply only to that role. All connected environments write to the same database; only use clearly marked test submissions when testing and remove them after verification. Local environment files, Vercel output, and research snapshots are ignored by Git.

## Persistence

`npm run db:migrate` applies the idempotent, transactional SQL migration files in `db/migrations/` in filename order. Run it once before deploying an endpoint that needs the table, using an administrative connection (the limited preview/development role cannot migrate). Alternatively, apply the SQL files in order through the Supabase SQL editor. Migrations are not executed during ordinary builds, and no table creation runs on public requests.

Records live in `rancher.partnership_submissions`: contact, job-title, and company fields, selected data-history band, selected record types, additional context, optional E.164 US phone number, communications-consent text/version/timestamp, the unchecked-checkbox record, optional server-calculated estimate, submission time, and an internal `referral_bonus_usd` derived on the server from the company-size band. Attribution snapshots live in `rancher.submission_attribution` and `rancher.user_attribution`; both retain compatibility JSONB and expose every stable Attributor value as physical first/last-touch columns for CDC and warehouse queries. Their declared PostgreSQL primary keys are `submission_id` and `email`, respectively. The six bands are 20–49 ($8,000), 50–199 ($14,000), 200–499 ($28,000), 500–999 ($42,000), 1,000–4,999 ($54,000), and 5,000+ ($75,000). These are internal referral values from the supplied schedule, separate from the calculator estimate. Older rows retain a null bonus because their previous bands overlap the new ones. The schema is private, the table has RLS enabled with no public policies, and database credentials are available only to the server. There is no public endpoint for reading records.

The endpoint validates all fields again on the server, checks request size and origin, and uses parameterized queries. A UUID idempotency key prevents duplicate records when a client retries the same submission. Reusing a key with different data is rejected. Failed validation, unavailable booking configuration, and failed database writes do not trigger a booking redirect. On error, the form preserves entries for retry.

To review submissions, use an authorized SQL client or Supabase SQL editor:

```sql
SELECT id, created_at, name, email, job_title, company, team_size, data_history,
       record_types, records_description, referral_bonus_usd, phone_e164, outreach_consent, consent_text, consent_version, calculator_scenario
FROM rancher.partnership_submissions
ORDER BY created_at DESC;
```

Submissions have no automatic deletion schedule. Operators can delete records in the database as needed; the Privacy Policy describes this behavior.

## Validation and deployment

```sh
npm run check
npm run build
npx playwright install chromium
npm test
npx vercel --prod
```

The test suite uses a separate local development server on port 4322 so it does not interrupt the user's server on 4321. Tests cover benchmark outputs, validation and persistence-error handling, form success/error behavior, navigation, legal pages, metadata, and responsive layouts. An opt-in database test also checks real browser → API → Postgres → calendar behavior, concurrent retry deduplication, migration reruns, and RLS. Run it only against an isolated local Postgres instance at `127.0.0.1`: set `POSTGRES_URL`, `RUN_DATABASE_TESTS=1`, and `BOOKING_URL` in an ignored `.env.test.local`, then run `node --env-file=.env.test.local node_modules/@playwright/test/cli.js test`. Build and test sequentially because Astro shares its generated cache. Production verification must additionally confirm a real row in Supabase and the booking redirect.

The Vercel GitHub App must have access to `ejwhite7/rancher` for Git-based automatic deployments. The production branch is `main`.

## PostHog proxy and logs

Vercel rewrites `/ingest/static/*`, `/ingest/array/*`, and `/ingest/*` to PostHog's US asset and ingestion hosts. The browser SDK uses `/ingest` as its `api_host` and keeps `https://us.posthog.com` as its `ui_host`. This proxy carries browser events, feature-flag requests, session recordings, and SDK assets, so monitor Vercel Fast Data Transfer usage.

Server handlers emit privacy-safe operational failures through the standard OpenTelemetry Logs SDK. OTLP/HTTP exports go directly to PostHog and are flushed before the serverless handler returns. Log attributes are limited to deployment metadata and sanitized error codes; form contents, email addresses, webhook payloads, credentials, and database error details are excluded. Vercel platform/build/static logs are not OTLP application logs and require a separate Vercel Log Drain if they are needed.

## External submission delivery

New submissions are atomically queued in `rancher.webhook_outbox` and sent to Hookdeck by a protected Vercel cron job every minute. Configure `HOOKDECK_SOURCE_URL` and `CRON_SECRET` in production. See [webhook delivery](docs/webhook-delivery.md) for payload fields, retry behavior, monitoring, and replay instructions.

## Content and assets

[Prismic setup and migration](docs/prismic.md) documents the existing Homepage singleton, linked Form custom type, separate Legal documents, original-content import, publishing webhook, and offline development mode. Production builds require published Prismic content. The Rancher import is complete. The Homepage uses nine ordered shared slices plus reusable Navigation and Footer singletons with descriptive fields and repeatable items. Use `npm run prismic:inspect` and `npm run prismic:verify` to inspect the repository and check published content.

The calculator matches the audited Handshake AI benchmark for 20–200+ employees and 3–20+ years. See [the calculator audit](docs/calculator-audit.md) for regional factors and the Troveo comparison.

`node scripts/generate-icons.mjs` regenerates the logo-based favicon, social image, and device icons. Asset provenance is in `ASSETS.md`.

The Privacy Policy and Terms of Use describe submitted inquiries, calendar handoff, attribution cookies, and RB2B visitor-identification and marketing practices. The RB2B disclosure includes Retention.com advertising opt-out and RB2B GDPR opt-out links using RB2B’s May 4, 2026 guidance. Each Legal document contains its operator name and contact email; verified legal business/contact details remain to be supplied. [FTC consumer privacy guidance](https://www.ftc.gov/business-guidance/privacy-security/consumer-privacy) informed the policy's focus on actual processing. RB2B also requires the cookie banner or consent-management configuration to remain consistent with the policy; legal review and regional consent implementation are operational requirements outside the policy copy itself.
