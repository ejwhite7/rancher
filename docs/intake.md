# Partnership intake wizard

`/intake/` hosts the wizard variant of the homepage partnership form. The homepage remains a static form. Both use `PartnershipForm.tsx`, the same Prismic Form copy, attribution, calculator scenario, honeypot, optional communications consent, submission API, idempotent retries, qualification confirmation, analytics, and booking redirect.

Three steps: Your details (name/email/title/company); Business data (size/history/active business/record types); Getting in Contact (optional phone/communications consent). The wizard has no additional-context field; the API receives an empty `records` value. The homepage keeps that field. Continue and Enter validate the current step without sending a request. Back preserves answers. Hidden steps remain mounted for the final payload. Final submission validates all steps and returns to any invalid step. Progress is a labeled native progress element; navigation focuses the new step heading. The page reuses SiteLayout, Navigation, Footer, global form styles, and brand tokens. No new CMS document, database migration, dependency, or deployment is required. The existing no-JavaScript guidance remains available.

Wizard navigation and URL prefill live in `src/components/useIntakeWizard.ts`; shared submission logic stays in `PartnershipForm.tsx`. See [code-health verification](intake-health.md) for fresh Repowise results, retained findings, and evidence.

## Tracking and layout

The wizard emits `partnership_intake_step_viewed` on each step entry (including Back) and `partnership_intake_step_completed` once per validated step per mount. Properties: `form: partnership`, `form_variant: wizard`, one-based `step_number`, `step_name`, and `total_steps`; field values are not included. Events use the existing browser PostHog/consent setup and dataLayer helper. Analytics failures never block navigation. Browser PostHog requires the existing public token/host and analytics consent; no new project configuration is added.

Final submission still POSTs to `/api/submissions/`. The API emits server-side `partnership_request_submitted` with the existing idempotency ID, while the client identifies the visitor and emits the existing dataLayer conversion (without duplicating the PostHog conversion). The shared database insert trigger queues the Hookdeck outbox envelope with `type: submission.created` and `event_name: partnership_request_submitted`; the existing authenticated worker delivers it. Existing database migrations, Hookdeck source, worker schedule, and PostHog environment must be configured as for the homepage form. Step navigation does not create submissions or webhooks. Live provider delivery has not been exercised in local tests.

The intake page has a compact, centered single-column layout. The header description is retained; only the eyebrow and the “No data uploads…” note are removed. The repeated form title is omitted in the wizard, and its final button says `Submit` with no arrow. Action buttons stay side-by-side with single-line labels. The wizard omits the repeated form description and empty calculator context; the homepage retains both. The first question is above the fold at 375×667 without auto-scrolling on initial hydration.

## URL prefill and autofill

Every wizard data field supports URL prefill:

| Field           | Parameters (first matching key wins)                             |
| --------------- | ---------------------------------------------------------------- |
| Full name       | `name`, or combined `first_name` and `last_name`                 |
| Email           | `email`                                                          |
| Company         | `company`                                                        |
| Job title       | `title`, `job_title`                                             |
| Phone           | `phone`                                                          |
| Company size    | `size`, `company_size`, `team_size`                              |
| Data history    | `history`, `data_history`                                        |
| Active business | `is_business_active`, `isBusinessActive`, `business_active`      |
| Record types    | `recordTypes`, `record_types`, `recordTypes[]`, `record_types[]` |

Every key also accepts its `utm_`-prefixed alias. Direct parameters take precedence over prefixed aliases. Multi-select values accept repeated parameters or comma-separated option labels. Options are matched case-insensitively with ordinary hyphens or en dashes; unknown options are ignored and records are deduplicated. Active-business values accept `yes/true/1` and `no/false/0`. Standard campaign UTMs retain the existing attribution flow.

Prefill runs once on mount, is allowlisted and length-bounded, and preserves user edits through Back navigation. Explicit URL selections take precedence over calculator defaults. Communications consent requires an explicit user click; URL parameters cannot check it. Honeypot and system-generated submission/security fields are not prefilled. The removed context field is not restored or populated invisibly.

Example: `/intake/?first_name=Alex&last_name=Morgan&company=Example&job_title=Operations&utm_source=newsletter`.

The form enables browser autofill and uses `name`, `email`, `organization`, `organization-title`, and `tel-national` tokens on the relevant inputs. Company size, history, and consent have no standard personal-data autofill token. Avoid sensitive data in prefill links: URL query parameters can appear in browser history, referrers, logs, and page analytics.

## Container workflow

```sh
docker build -f Dockerfile.dev -t rancher-intake:dev .
docker run --rm --name rancher-intake -p 127.0.0.1:4323:4323 rancher-intake:dev
# In another terminal:
docker exec rancher-intake npm run check
docker exec rancher-intake npm run build
docker exec rancher-intake npx prettier --plugin prettier-plugin-astro --check src/components/PartnershipForm.tsx src/pages/intake.astro src/styles/intake.css src/styles/global.css src/components/useIntakeWizard.ts tests/intake.spec.ts tests/intake-prefill.spec.ts
docker exec rancher-intake npx playwright install --with-deps chromium
docker exec rancher-intake npx playwright test tests/intake.spec.ts tests/intake-prefill.spec.ts tests/partnership-form.spec.ts --workers=1
```

Open `http://localhost:4323/intake/`. Local snapshot mode needs no CMS credentials; the existing PostHog missing-token warning is expected without analytics configuration. Production uses the existing Prismic environment. Tests mock the submission endpoint and create no live records. The repo has no lint script; use Astro diagnostics and Prettier for changed code.

Rollback: remove the intake route/style and revert the wizard option and field grouping. No backend state needs reversal.
