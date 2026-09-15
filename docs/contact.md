# Contact Us

- Public page: `/contact/`. Prismic singleton: `contact` (`aql13hUAAC8AVCHt`).
- The page references the existing Navigation and Footer singletons and the repeatable Form document with UID `contact` (`aql16xUAACwAVCIp`).
- Edit page heading, introduction, SEO, and relationships in Contact. Edit shared name/email fields and submission messages in Form → Main; the message and privacy text live in Form → Contact. Partnership-only fields are grouped separately and the partnership form keeps its existing behavior.
- Three required fields: Name, Email, How can we help? Personal email addresses are accepted. Submission confirmation stays on the page.
- Submissions go to `rancher.contact_submissions` in the Rancher Supabase database. Row-level security is enabled with no public policies. This flow stores enquiries; it does not send notification emails or enroll visitors in marketing outreach.
- Apply `db/migrations/007_contact_submissions.sql` before deploying. The existing server Postgres connection handles writes. The API validates payloads and origin, rejects honeypots/oversized requests, and deduplicates retries by UUID and payload hash.
- PostHog receives `contact_form_submitted` after a successful save, with the form identifier only. Contact inputs are excluded from automatic capture. Existing partnership and calculator analytics are unchanged.
- Prismic Preview supports the page and its Contact form. Preview disables submissions and stays noindex. Canonicals use `/contact/` on the production origin. Astro automatically includes the page in the sitemap; existing Prismic publish hooks rebuild the static page on staging and main.
