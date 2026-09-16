# The Corral

## Owner update

Edward White accepted pilots 01, 04 and 20 and explicitly removed editorial and specialist approval requirements. His byline is **Edward White, Co-founder at Rancher**; the bio in `publishing-policy.json` is approved. This instruction supersedes the earlier review gates described below and in the original plan. The remaining 21 articles can proceed. Technical validation and CMS integrity checks remain required; no specialist review is implied. The schedule is still inactive.

## Current rollout

The user’s weekday cadence supersedes the plan’s simultaneous launch: one article at a persisted random minute in each 09:00–10:00, 12:00–13:00 and 16:00–17:00 America/New_York window, Monday–Friday. The original CSV dates remain provenance only. `proposed-schedule.json` is a **proposal**, not an active publishing schedule. If a proposed slot passes before approvals, regenerate dates, update draft metadata and obtain new hash-bound approvals; never backdate a launch.

The plan requires pilots 01, 04 and 20 before the remaining 21 articles. These three pilots and the index are imported as unpublished Prismic drafts. Their author is explicitly pending confirmation. No editorial or specialist review has been invented. All publication gates stay closed until the required named reviews exist.

## Architecture

- `blog-index` is the singleton for `/blog/`; `blog` is repeatable for `/blog/[uid]/`. The unused pre-existing `blog_index` remains untouched.
- Astro renders all blog content server-side. Existing React islands and shared PostHog initialization are preserved.
- Eight classic slice types support rich text, callouts, accessible three-column tables, checklists, images/captions, downloadable files, visible FAQs and CTAs.
- Public routes query Prismic’s published ref and additionally exclude articles dated in the future. Related links and curated cards appear only when their targets are available in the same collection. Previews use the actual draft ref and noindex/no-store headers.
- `/blog-sitemap.xml` queries published content dynamically; lastmod comes from meaningful editorial dates. Static sitemap generation excludes blog routes.
- Article metadata includes explicit Prismic share images, article dates, canonical, BlogPosting and BreadcrumbList. CTA clicks emit `corral_cta_clicked` without changing the existing form submission events.

## Content Engine

`vendor/ejwhite-content-engine-0.1.0.tgz` is an immutable snapshot of `/Users/ejwhite/Code/content-engine`, pinned to the source commit and archive SHA-256 in `content/corral/manifest.json`. The upstream engine has no Rancher brand or Prismic adapter. `scripts/corral/engine.mjs` adds a consumer contract extension for the Rancher brand enum only; it retains the upstream schema, canonical hashing, evidence validation, QA and exact-hash approval rules. Short final headlines preserve working titles in the manifest and satisfy the engine’s headline contract.

Draft prose was authored in this Codex session and supplied to the engine’s caller-provided draft stage. The engine itself is a provider-neutral orchestration/QA package, not a hosted article generator. `prepare.mjs` runs its resumable stages over the drafts, validates contracts, generates QA reports, renders original share cards/diagrams and materializes CSV decision aids. No external content-generation provider is claimed.

Research uses primary Copyright Office, ICO and NIST material with a source ledger and hashes. Engine checks do not substitute for the plan’s legal, privacy, security, commercial or editorial reviews. Source attribution checks are distinct from approval of transaction-specific advice.

## Commands

```sh
node scripts/corral/prepare.mjs --start=YYYY-MM-DD
node --env-file=.env.local scripts/corral/import.mjs
node --env-file=.env.local scripts/corral/import.mjs --execute
node scripts/corral/refresh-preview.mjs --execute
node scripts/corral/activate-schedule.mjs
```

`prepare` persists its initial schedule and refuses checkpoint input drift. The importer defaults to the three pilots; `--keys=corral-01,corral-02,...` selects a later accepted batch. It backs reconciliation with private checkpoints, refuses untracked editor changes, uploads assets by checksum, establishes document IDs before relationships, and never publishes. Re-running an unchanged import reports unchanged documents.

`activate-schedule` defaults to dry-run. It requires all 24 complete packages, future in-window dates, exact-hash author/editorial/specialist approvals, passing engine QA, and complete Prismic relationships. `--execute` enables the native Prismic Release scheduling workflow. It creates one release per article and puts the index and shared discovery updates in the first release. Its repository endpoints and millisecond date representation match the inspected Page Builder; revalidate that internal API contract if Prismic changes it. Credentials stay in the local CLI credential file and are never deployed.

`discovery.mjs --execute` prepares Navigation/Footer links as audited drafts, and the schedule adapter includes them in the first release. The homepage entry reads published `blog-index` copy and only appears when at least one article is public. These entry points must not advertise an unpublished library. Verify all article previews and downloads, all relationships and all review receipts before scheduling.

## Review and rollback

Reviewable article Markdown is in `content/corral/articles/`; Prismic document IDs are in `content/corral/reconciliation/documents.json`. Exact pending gate findings are in `content/corral/qa/` and `schedule-preflight.json`. Never set approval fields merely to make these reports pass.

Cancel scheduled native releases through Prismic if approved content changes; update the package and repeat review before rescheduling. Code rollback does not unpublish CMS content. Preserve the prior deployment and `.prismic-migration/corral/` snapshots. Do not delete referenced assets. After launch, verify all newly live URLs, source/download links, sitemap and inquiry tracking; perform the plan’s day-1, day-7 and day-28 checks with actual publication dates.

After draft imports or discovery updates, refresh the migration release with `refresh-preview.mjs --execute`, then start a **new** session using Prismic Preview → Staging. Existing preview tokens retain the earlier ref and can omit newly imported documents. Refreshing does not publish.

## Shared authors

The `authors` repeatable custom type contains `name`, `title`, rich-text `bio`, and repeatable `socials` (`label` plus HTTPS `url`). Blog `author` is a content relationship restricted to authors. If the author is already published, the first scheduled release includes only the index, navigation, footer and first post. Otherwise it also includes the author document. Resolve authors from the same Prismic ref as articles; broken or wrong-type relationships fail validation. Article bylines link to `/authors/[uid]/`. The dedicated author page renders the bio, socials and articles from Prismic; the article does not repeat the bio. Author preview routes use the same protected draft ref, and `/authors-sitemap.xml` lists published authors only. OG images are metadata/card images only; article-body images must be explicit content slices.

Length target: 1,200–1,500 words, tolerance 1,080–1,650. Owner-approved biography is recorded in `content/corral/publishing-policy.json`. No social profile is inferred.
