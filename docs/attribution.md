# Form attribution

Rancher vendors Attributor 2.1.1 from commit `219bd77bc04cb8fe0bf28d9896e7c2963203f5d5` under its MIT license at `public/vendor/attributor/`. The local copy adds a missing default constructor value and writes first-party cookies with `Path=/`, `SameSite=Lax`, and `Secure` on HTTPS. Production uses the root cookie domain `gorancher.com`; local development uses a host-only cookie.

Attributor records campaign/referrer first touch in `attr_first` and the most recent non-direct session touch in `attr_last`. The last-touch cookie uses a rolling 30-minute window. Hidden fields on the Partnership, Contact, and Referral forms carry the supported source, medium, campaign, term, content, ID, source-platform, marketing-tactic, creative-format, and ValueTrack-style fields. Values are validated server-side and limited to 500 characters each.

## Persistence

Migration `010_submission_attribution.sql` creates two restricted, RLS-enabled tables:

- `rancher.submission_attribution` stores the immutable first/last snapshot for each submission UUID, form type, and normalized submitter email.
- `rancher.user_attribution` stores one record per normalized submitter email. Its first touch never changes. Contact and referral submissions may update its latest last touch. The first partnership submission separately locks `partnership_first_touch`, `partnership_last_touch`, and `partnership_submission_id`.

Referral attribution belongs to the referrer who browsed and submitted the form. The referred person remains the Attio contact.

Attribution and the source form row are written in one database transaction. The attribution row is inserted before the form row so the existing database webhook trigger can include the snapshot atomically. A failed or conflicting form insert rolls back attribution changes.

## Analytics and delivery

Every successful form event includes `attribution.first` and `attribution.last` in PostHog and `window.dataLayer`.

- Partnership uses PostHog `$set_once` for `attribution_first_*`, `partnership_first_*`, and `partnership_last_*` person properties.
- Contact and referral use `$set_once` for `attribution_first_*` and `$set` for `attribution_last_*`.

Webhook schema versions are Partnership v4, Contact v2, and Referral v2. Hookdeck forwards the nested attribution object, and the Attio transformations append a readable first/last attribution block to the existing context field.

## Verification

Test first-touch immutability by loading a campaign URL, navigating to a different non-direct campaign, and confirming `attr_first` remains unchanged while `attr_last` changes. On form submission, confirm the API payload, both attribution tables, webhook payload, PostHog event/person properties, data-layer event, and Attio preview all contain the expected values.
