# The Corral pilot review

## Owner update

Edward White accepted pilots 01, 04 and 20 and explicitly removed editorial and specialist approval requirements. His byline is **Edward White, Co-founder at Rancher**; the proposed bio in `publishing-policy.json` awaits his review. This instruction supersedes the earlier review gates described below and in the original plan. The remaining 21 articles can proceed. Technical validation and CMS integrity checks remain required; no specialist review is implied. The schedule is still inactive.

## Review these three unpublished Prismic drafts

| Pilot                                  | Prismic                                                                 | Local article                    |
| -------------------------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| 01 — License business data for AI      | [Open draft](https://rancher.prismic.io/builder/pages/aqnJlhUAACwAVXo7) | [Article](articles/corral-01.md) |
| 04 — AI data licensing agreement terms | [Open draft](https://rancher.prismic.io/builder/pages/aqnKBRUAACsAVXwk) | [Article](articles/corral-04.md) |
| 20 — AI data card template             | [Open draft](https://rancher.prismic.io/builder/pages/aqnKDRUAAC0AVXxN) | [Article](articles/corral-20.md) |

[Index draft](https://rancher.prismic.io/builder/pages/aqnKZhUAADAAVX4E). Use Prismic’s Preview → Staging to inspect unpublished content. Preview tokens are private and deliberately omitted here.

## Required decisions

- Accept the pilot content, format and assets before generating the remaining 21 articles.
- Confirm the author’s name and bio.
- Assign named editorial and applicable legal/privacy/security/commercial reviewers. Their approvals must bind the exact final content and CMS payload, with the review dates recorded.

The supplied plan, sections 6, 9 and 11, explicitly separates automated checks from human approval and requires a successful pilot before full generation. No human review or approval has been fabricated. These three drafts are not approved for publication.

## Publication cadence

One article per window, Monday–Friday, America/New_York: 09:00–10:00, 12:00–13:00 and 16:00–17:00. Each minute is randomized once and persisted. The 24-entry `proposed-schedule.json` is inactive; its initial dates are provisional. Move any elapsed dates, update draft metadata, and obtain exact-hash approvals before activation.

All 24 articles must pass the plan’s launch gates before scheduling. The first native Prismic Release contains the first article, index and shared Navigation/Footer links. Later releases contain one article each. Homepage discovery and the dynamic sitemap include published content only.

## Evidence

- `manifest.json`: all 24 briefs and current workflow state.
- `articles/`, `assets/`, `source-ledger.json`: three generated packages, original assets and primary-source evidence.
- `qa/`, `reviews/`, `schedule-preflight.json`: explicit pending approvals and missing later packages.
- `reconciliation/`: imported document identifiers and readback comparisons.
- `../../docs/corral.md`: integration commands, scheduling gates and rollback procedure.
