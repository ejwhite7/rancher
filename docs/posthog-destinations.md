# PostHog destination delivery

Successful partnership, contact, and referral writes are captured from the server after the database transaction commits. Browser capture remains enabled for session context and `window.dataLayer`, but both transports use the submission UUID as `$insert_id` and `event_id` so PostHog and advertising platforms can deduplicate retries.

Analytics delivery is non-fatal: a saved form remains successful if PostHog is unavailable. Server captures use the normalized submitting email as `distinct_id`, include the immutable attribution snapshot, and set only the person properties appropriate to that form. Referral identity and attribution belong to the referrer; the referred person remains the downstream CRM contact.

## Active conversion destinations

- **Meta Ads Conversions:** only `partnership_request_submitted` maps to `Lead`. CAPI uses `submission_id` as `event_id`, `action_source=website`, normalized and hashed identity, source URL, user agent, and client IP. The GTM browser `Lead` uses the same event name and ID.
- **LinkedIn Ads Conversions:** only partnership submissions are sent. `eventId` is the submission UUID, amount is serialized as a decimal string, currency is `USD`, and hashed email is the primary match key.
- **Reddit Conversions API:** only partnership submissions are sent. The user payload uses Reddit's `ip_address` field, includes user agent and email when available, and uses the submission UUID as `conversion_id`.
- **Attio:** the direct PostHog destination is disabled because its token lacks Object Configuration read scope and Hookdeck is the authoritative, tested CRM delivery path. Do not re-enable it until the token is replaced and the destination is restricted to the three form events.

## Operations

After changing a destination, stage the draft, mock-test it with a representative event, preview the publish diff, and publish only the reviewed token. Monitor destination logs for non-2xx responses and verify a controlled real submission in each destination's event manager. Internal/test users must remain filtered.

Never include credentials, raw webhook bodies, or database errors in PostHog operational logs.
