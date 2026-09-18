# Referral page

`/referral/` renders the Prismic `referral` singleton with shared Navigation and Footer relationships. Its linked repeatable `form` document has UID `referral`. Main holds heading, introduction, button and status copy; Referral holds the eight field labels and repeatable company-size/industry choices (`label`, `value`). Keep option values unique and at most 120 characters. All eight fields are required; personal emails are allowed.

The page uses Rancher’s shared form styles, with the form on the left and an explainer on the right. The Referral singleton’s Explainer tab supplies the offer heading, introduction, eligibility heading/list, and process heading/list. On narrow screens the columns and paired names stack. The footer link is an editable Footer item. Astro automatically includes the published page route in the static sitemap and sets its production canonical. Prismic previews of either the page or its form resolve to `/preview/view/referral/`; submissions are disabled in preview.

## Submission flow

1. The React island POSTs to `/api/referral/`. A payload-specific UUID is retained across retries.
2. The server validates both identities, attribution, lengths, JSON request size, origin and honeypot, then atomically inserts the form row and separate attribution snapshots keyed to the referrer email and submission UUID. A conflicting retry returns 409; storage failures return 503 without a success message.
3. Migration `009_referral_submissions.sql` creates the restricted writer permissions and atomically queues one `referral.submission.created` event per inserted referral. The shared outbox retains all existing Contact and Partnership delivery behavior.
4. The existing production cron delivers queued events to the `rancher-website` Hookdeck source with retries and stable event IDs. Staging and production use the existing shared submission database and delivery worker.
5. Hookdeck connection **Rancher-Referral-to-Attio** filters `event_name = referral_form_submitted`, deduplicates, applies **referral-attio** (`trs_4vYqv1B0lftCCO`), and forwards to the existing **attio** workflow destination with five exponential retries. The referred person remains the Attio contact; readable attribution lines describe the referrer’s browser journey in the context field. Source, transformation and rule files are under `hookdeck/referral-*`.
6. After a confirmed save, PostHog identifies the **referrer** by normalized email with their name and email domain, then captures `referral_form_submitted` with `form`, `submission_id`, both submitted names and emails, `company_size`, `industry`, and first/last attribution. First-touch person properties are set once and last-touch properties may update. An active PostHog Workflow forwards those event fields to `#form-submissions` in Slack. The referred person's identity is not written to the referrer's PostHog person profile. Analytics failure never reverses the saved confirmation.

The Attio payload targets the **referred person**, matched by email, and maps their full name, email domain, company size and submission ID. The existing `additional_context` field carries the referrer's full name/email, referred person's name/email, company size and industry. The transformation does not assert outreach consent.

## Verification

`tests/referral.spec.ts` covers validation, storage failures, conflicts, retry IDs, analytics ordering/identity, CMS relationships, preview resolution, canonical/footer and mobile layout. `tests/hookdeck.spec.ts` checks both object and string webhook bodies and rejects wrong event types. `db/tests/referral_webhooks.sql` checks queue payload, duplicate inserts, cascade cleanup and existing parent relationships; run in a transaction and roll back against a shared database. Hookdeck's remote transformation runner validates the installed mapping without sending synthetic records to Attio.
