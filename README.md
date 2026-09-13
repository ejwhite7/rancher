# Rancher

Astro with React islands, deployed to Vercel. The marketing and legal pages are prerendered; `/api/submissions/` runs as a serverless function and stores inquiries in Supabase PostgreSQL before directing the browser to the booking calendar.

```sh
npm ci
npx vercel env pull .env.local --yes
npm run db:migrate
npm run dev
```

Use Node.js 24 to match the deployment runtime. Development serves the site at http://localhost:4321.

## Environment

- `SITE_URL`: canonical public origin, e.g. the project's production Vercel alias. The sitemap and all absolute SEO URLs use it.
- `POSTGRES_URL`: server-side pooled Postgres connection provisioned by the Vercel Supabase integration. `DATABASE_URL` is accepted as an alternative. Never prefix credentials with `PUBLIC_` or expose them to the browser.
- `BOOKING_URL`: HTTPS calendar URL. Initially `https://cal.com/growthcast/discovery`. The server reads it at request time. The browser receives it only after the database confirms the submission. No contact information is appended to this URL.

The Supabase integration provides the production database connection. Preview and development use a dedicated `rancher_form_writer` role with INSERT access and SELECT access only to id and request hash for retry detection. Its RLS policies apply only to that role. All connected environments write to the same database; only use clearly marked test submissions when testing and remove them after verification. Local environment files, Vercel output, and research snapshots are ignored by Git.

## Persistence

`npm run db:migrate` applies the idempotent, transactional SQL migration files in `db/migrations/` in filename order. Run it once before deploying an endpoint that needs the table, using an administrative connection (the limited preview/development role cannot migrate). Alternatively, apply the SQL files in order through the Supabase SQL editor. Migrations are not executed during ordinary builds, and no table creation runs on public requests.

Records live in `rancher.partnership_submissions`: contact and company fields, selected data-history band, selected record types, additional context, outreach consent text and timestamp, the prechecked-checkbox disclosure, optional server-calculated estimate, and submission time. The schema is private, the table has RLS enabled with no public policies, and database credentials are available only to the server. There is no public endpoint for reading records.

The endpoint validates all fields again on the server, checks request size and origin, and uses parameterized queries. A UUID idempotency key prevents duplicate records when a client retries the same submission. Reusing a key with different data is rejected. Failed validation, unavailable booking configuration, and failed database writes do not trigger a booking redirect. On error, the form preserves entries for retry.

To review submissions, use an authorized SQL client or Supabase SQL editor:

```sql
SELECT id, created_at, name, email, company, team_size, data_history,
       record_types, records_description, outreach_consent, consent_text, calculator_scenario
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

## Content and assets

The calculator matches the audited Handshake AI benchmark for 20–200+ employees and 3–20+ years. See [the calculator audit](docs/calculator-audit.md) for regional factors and the Troveo comparison.

`node scripts/generate-icons.mjs` regenerates the logo-based favicon, social image, and device icons. Asset provenance is in `ASSETS.md`.

The Privacy Policy and Terms of Use describe submitted inquiries and calendar handoff. `src/data/legal.ts` contains the operator name and contact email; verified legal business/contact details remain to be supplied. [FTC consumer privacy guidance](https://www.ftc.gov/business-guidance/privacy-security/consumer-privacy) informed the policy's focus on actual processing.
