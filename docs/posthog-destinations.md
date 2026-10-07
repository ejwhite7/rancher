# PostHog destination delivery

Successful partnership, contact, and referral writes are captured from the server after the database transaction commits. Partnership submission requests forward the browser SDK's validated UUIDv7 `$session_id`; the server includes it on the authoritative `partnership_request_submitted` event. That event exposes the conversion touch as standard `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content` properties, and preserves both touches as explicit `first_utm_*` and `conversion_utm_*` properties plus the nested attribution object. Missing campaign fields remain absent rather than being invented. The browser still pushes that conversion to `window.dataLayer` for advertising tags but does not send a second copy to PostHog, preventing conversion counts and `referral_bonus_usd` from doubling. Contact and referral browser/server transports continue to use the submission UUID as `$insert_id` and `event_id` so PostHog and advertising platforms can deduplicate retries.

Analytics delivery is non-fatal: a saved form remains successful if PostHog is unavailable. Server captures use the normalized submitting email as `distinct_id`, include the immutable attribution snapshot, and set only the person properties appropriate to that form. Referral identity and attribution belong to the referrer; the referred person remains the downstream CRM contact.

## Matching-cookie persistence

`src/lib/advertising-cookies.ts` is shared by browser and server capture. It preserves full `_fbp` and `_fbc` cookie values as raw names plus `$fbp`/`fbp` and `$fbc`/`fbc`, rather than retaining only the click ID inside `_fbc`. It also preserves Google `_gcl_aw`, `_gcl_dc`, `_gcl_gb`, `_gcl_au`, Microsoft `_uetmsclkid`, `_uetvid`, `_uetsid`, LinkedIn `li_fat_id`, and TikTok `_ttp`/`ttclid` when present. Google/Microsoft click IDs are exposed under their standard names; URL-derived click IDs and braids are recovered from existing first/last attribution cookies. No IDs or cookie values are manufactured.

The browser SDK's `before_send` hook reads current cookies for every captured event, including the first pageview and cookies written after initialization. Values are included on the event and merged into `$set` without discarding existing person updates. Advertising-enabled sessions use `person_profiles: always`, so anonymous visitors' matching properties are saved rather than waiting for form identification. Event envelopes, project token, identity, `$set_once`, and other SDK properties are preserved. Advertising opt-out/GPC disables enrichment; analytics-only sessions retain the SDK's identified-only profile mode.

The shared server `captureFormEvent` path reads request cookies and merges the same matching properties into events and person updates for partnership, contact, and referral captures. Explicit form attribution retains precedence over cookie fallback. Request `Sec-GPC: 1` and cookie advertising opt-out disable cookie enrichment. Values are allowlisted, bounded to 500 characters, and exclude control characters; unrelated session/authentication cookies are never copied. Missing cookies do not erase previously saved person properties. Historical events that never captured these values cannot be repaired by destination mappings.

Verification: `tests/advertising-cookies.spec.ts` exercises the real installed browser SDK with mocked ingestion, initial pageviews, late cookie updates, person-profile processing, advertising opt-out, malformed/oversized values, and allowlisting. `tests/posthog-server.spec.ts` asserts full matching cookies on both the server event and `$set`. These tests create no live advertiser traffic or PostHog records; production ingestion still requires deployment and verification.

### Code-health verification

The request-cookie/GPC boundary is shared through `advertisingRequestProperties` by server capture and attribution fallback. Browser tests separate initial/late-cookie capture from opt-out behavior and reuse the actual SDK mock transport; server tests share capture setup while independently checking deduplication and request GPC/opt-out. No capture assertions or consent guards were removed to shorten the tests.

Repowise's refactored report restores server maximum complexity to the baseline 7 (from 9). Cookie reader, attribution reader, and browser-cookie tests each score 10/10 without findings; neither expanded test suite has a size finding. Seven existing duplication/history findings remain across changed analyzed files. Local evidence: `artifacts/intake-health/cookie-refactored.json` and `cookie-refactor-delta.json`, compared with the prior baseline audit `final.json`. No findings were suppressed. Repowise does not analyze the `.astro` integration, which is instead covered by the real-SDK tests, Astro diagnostics, and build.

## Active conversion destinations

- **Meta Ads Conversions:** only `partnership_request_submitted` maps to `Lead`. CAPI uses `submission_id` as `event_id`, `action_source=website`, normalized and hashed identity, source URL, user agent, and client IP. The GTM browser `Lead` uses the same event name and ID.
- **LinkedIn Ads Conversions:** only partnership submissions are sent. `eventId` is the submission UUID, amount is serialized as a decimal string, currency is `USD`, and hashed email is the primary match key.
- **Reddit Conversions API:** only partnership submissions are sent. The user payload uses Reddit's `ip_address` field, includes user agent and email when available, and uses the submission UUID as `conversion_id`.
- **Attio:** the direct PostHog destination is disabled because its token lacks Object Configuration read scope and Hookdeck is the authoritative, tested CRM delivery path. Do not re-enable it until the token is replaced and the destination is restricted to the three form events.

## Operations

After changing a destination, stage the draft, mock-test it with a representative event, preview the publish diff, and publish only the reviewed token. Monitor destination logs for non-2xx responses and verify a controlled real submission in each destination's event manager. Internal/test users must remain filtered.

Never include credentials, raw webhook bodies, or database errors in PostHog operational logs.
