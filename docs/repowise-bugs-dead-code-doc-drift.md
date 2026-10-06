# Repowise bug, dead-code and doc-drift review

## Outcome

2026-10-06T22:57Z — Direct implementation supersedes the unsuccessful delegated pass. Confirmed fixes, all frozen finding dispositions, regression checks and the persisted dashboard refresh are complete.

- Fixed **two production bugs**: optional analytics could block a partnership save/confirmation/calendar redirect, or discard the calculator scenario before prefilling the form.
- Fixed the previously excluded nonqualifying browser test: wait for React hydration before entering controlled fields. The failure was reproduced before the change; no exclusion remains.
- Removed **one genuinely unused private helper**, `rt`, from `scripts/corral/prepare.mjs`. It had no callers and no export. No command entrypoint was executed.
- Repaired **all 28 live documentation findings** across three documents: copied PostHog links now resolve against their upstream origin, the identify anchor matches its heading, and legal-source guidance names the actual Prismic loader/snapshots. Also corrected the outdated claim that all other partnership fields are required.
- Audited all **87 initial analyzer dead-code findings**, with consumer/framework/runtime evidence below. They are used symbols or entrypoints, not safe deletions. After graph refresh, **85 remain**; Calculator and PartnershipForm's unreachable-file alerts disappeared without deleting either component. No public export was removed.
- Retained historical risk metrics, deliberate failure boundaries and independently verified parameterized SQL. No analyzer suppression, acknowledgement or resolved-status mutation was used.

### Confirmed bugs and regressions

**Partnership analytics boundary.** `src/components/PartnershipForm.tsx` previously read the PostHog session ID before saving and performed identify/event tracking inside the submission-error boundary. SDK exceptions could prevent the POST, display an analytics error after successful persistence, expose a retry, or prevent the calendar redirect. Session attribution is now best-effort; failed identify does not prevent the separate conversion attempt; failed analytics does not reinterpret confirmed delivery as a save failure. Successful event-before-calendar ordering, payloads, retry identity and qualification/consent behavior are unchanged.

**Calculator scenario boundary.** `src/components/Calculator.tsx` called analytics before `setScenario`. A thrown capture discarded the selected scenario. The caller now preserves its business action when optional analytics fails. Shared `trackEvent` semantics are unchanged; all callers were inspected, and contact/referral already isolate analytics from confirmed delivery.

The new browser tests cover identify, dataLayer and session-ID failures for both qualifying and nonqualifying responses, plus calculator prefill after a capture failure. Red evidence: `bug-red.log`, `calculator-red.log`. Green evidence: `bug-green.log`, final complete suites. Two private test helpers separate fault setup from saved-response assertions; all seven fault cases remain covered without introducing fresh size/complexity/nesting markers.

### Verification

Evidence directory: `artifacts/repowise-cleanup/` (local, ignored).

- Full Docker suite: **142 passed, one live-Prismic preview skip; no grep exclusion**.
- Dedicated glossary/browser suite: **seven passed**.
- Real disposable PostgreSQL 17 integration checks include malicious SQL-like text stored unchanged, idempotency, migration reruns, CDC flattened columns/primary keys, RLS, webhook atomicity and lease/retry recovery.
- Prettier, Astro check and snapshot build pass. Astro: **zero errors, zero warnings, seven pre-existing hints**. The removed private helper accounts for the eighth former hint.
- The seven remaining Astro hints are false positives: the reported imports/404 response helpers are actually used by frontmatter return/error paths. They were checked and preserved.
- An initial verification attempt found two incomplete new test mocks and an imported minified UI evidence file being typechecked. Mocks now supply the required methods; UI evidence has a non-source `.txt` extension. Final checks supersede that attempt.
- Owned DB, runner and internal network were removed. No host dependency installation, production access, CMS/scheduler invocation, deployment, commit or push.
- Reproduction: `bash artifacts/repowise-cleanup/verify.sh`. Local evidence: `final-checks.log`, `FINAL_EXIT format=0 check=0 build=0 tests=0 glossary=0`.

## Scope and analyzer semantics

The installed Repowise 0.55.0 portal has a **Findings** tab, not a separate tab literally named “Bug findings.” Its `defect` dimension is labelled **Code health**. UI/API source was inspected rather than equating security patterns or refactoring opportunities with verified bugs.

The frozen inventory conservatively includes **all 79 open Code Health/maintainability findings** (68 defect, 11 maintainability), plus a separate review of **16 security signals**. Fifty of the 79 are historical churn/entropy/co-change/prior-defect predictors. They accurately describe history but do not identify a current executable bug. A source edit cannot erase that history.

Dead code was recomputed live with minimum confidence 0.0: **87**, matching the stored population. Documentation had **27 stored IDs versus 28 live occurrences**: an additional anonymous-event link fragment shares a line/target with another stored finding. Both populations are recorded below; the extra live occurrence is explicit. Counts must be compared on the same basis.

Initial immutable evidence: `health-findings-initial.json`, `security-initial.json`, `dead-code-initial.json`, `doc-drift-initial.json`, `doc-drift-live-initial.json`. The initial dirty patch/status were captured before this turn's edits. Earlier uncommitted refactors, tests and helper modules were preserved.

## Dead code: complete frozen ledger

All rows mean **retain: demonstrably used or externally/framework invoked**. Raw repository matches are in `dead-code-consumers.json`; normalized evidence is in `dead-code-dispositions.json`. Seven draft modules are deliberately dynamically imported; six Hookdeck scripts are standalone transform entrypoints exercised by VM tests; Astro discovers routes and component imports without ordinary TypeScript import edges. Same-file use also contradicts “no importers ⇒ dead” inference.

| Finding ID | Target | Evidence / disposition |
|---|---|---|
| 52cf7b93a4db4ab4a092da4a8b784aa3 | `src/lib/blog.ts` · `blogSiteContent` | Astro consumer: src/pages/preview/view/[...path].astro:38, src/pages/preview/view/[...path].astro:72. |
| e2d4a17071444d4ba19d876ef905b221 | `src/lib/blog.ts` · `readingMinutes` | Astro consumer: src/components/pages/BlogArticle.astro:9, src/components/pages/BlogArticle.astro:110. |
| bf928aee0f6244d9818b27c8f9343a8d | `src/lib/contact.ts` · `contactSnapshot` | Astro consumer: src/pages/contact.astro:3, src/pages/contact.astro:7. |
| 055ab1e008274a8c8eb55288303121dc | `src/lib/content.ts` · `richHtml` | Astro consumer: src/components/RichText.astro:2, src/components/RichText.astro:9. |
| c9d73f5dedfa462a84c21f249241e1da | `src/lib/glossary.ts` · `glossarySiteContent` | Astro consumer: src/pages/preview/view/[...path].astro:53, src/pages/preview/view/[...path].astro:86. |
| fc8bf73087c2410e88ca253d8e0bcbd4 | `src/lib/glossary.ts` · `glossaryRich` | Astro consumer: src/components/GlossaryRichText.astro:4, src/components/GlossaryRichText.astro:12. |
| 82330971d0264276b77b2737419c4b05 | `src/lib/prismic.ts` · `getLegalContent` | Astro consumer: src/pages/terms-of-use.astro:3, src/pages/terms-of-use.astro:5. |
| 003c8971e2a74251a064e9afd86bdb27 | `src/lib/referral.ts` · `referralSnapshot` | Astro consumer: src/pages/referral.astro:3, src/pages/referral.astro:7. |
| cc8f990eac3748cfb135e275ff773a52 | `src/components/DataTabs.tsx` · `DataTabs` | Astro consumer: src/components/DataSection.astro:4, src/components/DataSection.astro:18. |
| 1b2a5c8619b14db7b7e074ed18d070cc | `hookdeck/contact-attio.js` | Standalone installed transform, loaded with readFile/VM by tests/hookdeck.spec.ts. |
| 1e0f0cc96b984b8f8ba38c7a0a17628e | `hookdeck/heyreach-attio.js` | Standalone installed transform, loaded with readFile/VM by tests/hookdeck.spec.ts. |
| 81b85d110953433880f3c210b0c6bdf9 | `hookdeck/referral-attio.js` | Standalone installed transform, loaded with readFile/VM by tests/hookdeck.spec.ts. |
| f51ce904926f4d4099714f4f39c9cae1 | `hookdeck/website-attio.js` | Standalone installed transform, loaded with readFile/VM by tests/hookdeck.spec.ts. |
| cdd7d77bcc8541e0bae0fa8a7c6ff34c | `hookdeck/zapier-partnership-attio.js` | Standalone installed transform, loaded with readFile/VM by tests/zapier-hookdeck.spec.ts. |
| 494a83d03fec48b886a34cdcfe5c9fc9 | `hookdeck/zapier-partnership-posthog.js` | Standalone installed transform, loaded with readFile/VM by tests/zapier-hookdeck.spec.ts. |
| e8645a92212e4ccc9f26741a5293ae83 | `prismic/glossary/drafts/ai.mjs` | scripts/glossary-content.mjs:26–44 enumerates and dynamically imports every .mjs draft; 60-draft validation passes. |
| c215cfc86df843ee98be1c17bf3172bc | `prismic/glossary/drafts/licensing.mjs` | scripts/glossary-content.mjs:26–44 enumerates and dynamically imports every .mjs draft; 60-draft validation passes. |
| c797b678fbaf407f9f128bb1bb9a2b88 | `prismic/glossary/drafts/physical-ai.mjs` | scripts/glossary-content.mjs:26–44 enumerates and dynamically imports every .mjs draft; 60-draft validation passes. |
| e644f47497f44c5b85f867839303b157 | `prismic/glossary/drafts/pilots.mjs` | scripts/glossary-content.mjs:26–44 enumerates and dynamically imports every .mjs draft; 60-draft validation passes. |
| 95b6acd99da5401eb125290904c1f157 | `prismic/glossary/drafts/quality.mjs` | scripts/glossary-content.mjs:26–44 enumerates and dynamically imports every .mjs draft; 60-draft validation passes. |
| 30f9b082c09e4b0dbaec3f20cf65d8fe | `prismic/glossary/drafts/rights.mjs` | scripts/glossary-content.mjs:26–44 enumerates and dynamically imports every .mjs draft; 60-draft validation passes. |
| 8559d2442f9147fdb0a71ea005390acb | `prismic/glossary/drafts/workflows.mjs` | scripts/glossary-content.mjs:26–44 enumerates and dynamically imports every .mjs draft; 60-draft validation passes. |
| 77ef793f160d480c8524dbce299d3ac3 | `src/components/Calculator.tsx` | Astro consumer: src/components/CalculatorSection.astro:4, src/components/CalculatorSection.astro:18. |
| 862395f7fbf54d11a72bdcf1d0eb7f23 | `src/components/Calculator.tsx` · `Calculator` | Astro consumer: src/components/CalculatorSection.astro:4, src/components/CalculatorSection.astro:18. |
| 59739d9ad25045da8aa459da02b158b0 | `src/components/ContactForm.tsx` | Astro consumer: src/components/pages/Contact.astro:5, src/components/pages/Contact.astro:34. |
| 9f5d42db11864371b0d8fd0d173e648e | `src/components/ContactForm.tsx` · `ContactForm` | Astro consumer: src/components/pages/Contact.astro:5, src/components/pages/Contact.astro:34. |
| a2a7f827371848c6a5b8b45927f28442 | `src/components/DataTabs.tsx` | Astro consumer: src/components/DataSection.astro:4, src/components/DataSection.astro:18. |
| ed6b89dd8d9341c3b1eae8d91c6f09ac | `src/components/GlossarySearch.tsx` | Astro consumer: src/components/pages/GlossaryIndex.astro:8, src/components/pages/GlossaryIndex.astro:81. |
| 1a1c775677424a14a5791f07f92ca2cf | `src/components/GlossarySearch.tsx` · `GlossarySearch` | Astro consumer: src/components/pages/GlossaryIndex.astro:8, src/components/pages/GlossaryIndex.astro:81. |
| cef66d2977464986939777093bcd775d | `src/components/PartnershipForm.tsx` | Astro consumer: src/components/Contact.astro:4, src/components/Contact.astro:22. |
| 58284e65b1724eedbd05c405fbcd12d1 | `src/components/PartnershipForm.tsx` · `PartnershipForm` | Astro consumer: src/components/Contact.astro:4, src/components/Contact.astro:22. |
| 33ba438b37ec45519ba80572f55f0080 | `src/components/ReferralForm.tsx` | Astro consumer: src/components/pages/Referral.astro:5, src/components/pages/Referral.astro:30. |
| bb068ae3ccf04439801e93bddffc7612 | `src/components/ReferralForm.tsx` · `ReferralForm` | Astro consumer: src/components/pages/Referral.astro:5, src/components/pages/Referral.astro:30. |
| d707b0f1d2d6445fa67c73c34cdbf1b1 | `src/lib/blog.ts` · `blogTopics` | Same-file runtime/schema use: src/lib/blog.ts:160. Public export retained. |
| 5537ac3c40b74ef58b2ee69472cf119f | `src/lib/blog.ts` · `blogRichText` | Same-file runtime/schema use: src/lib/blog.ts:66. Public export retained. |
| 2d7c4580b5644cd693c501e88a6d6dbd | `src/lib/blog.ts` · `blogIndexSchema` | Same-file runtime/schema use: src/lib/blog.ts:269. Public export retained. |
| 8554590e0b244d4eae116f8180e4be4d | `src/lib/contact.ts` · `fetchContact` | Same-file runtime/schema use: src/lib/contact.ts:76. Public export retained. |
| c19cb7a9e1124915881f08d7fdcd1e7a | `src/lib/content.ts` · `richTextSchema` | Same-file runtime/schema use: src/lib/content.ts:40. Public export retained. |
| 47ba4e78334f4c1985da52562e7dfd68 | `src/lib/content.ts` · `navigationSchema` | Same-file runtime/schema use: src/lib/content.ts:68. Public export retained. |
| 13d96c1e9703476684198e8c3b79e482 | `src/lib/content.ts` · `footerSchema` | Same-file runtime/schema use: src/lib/content.ts:107. Public export retained. |
| ddc7bc68142745cda42626c92af66d8a | `src/lib/content.ts` · `sectionSchemas` | Same-file runtime/schema use: src/lib/content.ts:236. Public export retained. |
| 52c3db25e23d448189133c212fd47218 | `src/lib/glossary.ts` · `glossaryRichText` | Same-file runtime/schema use: src/lib/glossary.ts:61. Public export retained. |
| deaf7c7bf05a488e86e527714a43e193 | `src/lib/prismic.ts` · `getNavigationContent` | Astro consumer: src/layouts/LegalLayout.astro:2, src/layouts/LegalLayout.astro:18. |
| 3100e6ffa0f144b4882836e9ded3f8ae | `src/lib/prismic.ts` · `getFooterContent` | Astro consumer: src/layouts/LegalLayout.astro:2, src/layouts/LegalLayout.astro:19. |
| 89e741000aa74348a0b44c0507916f28 | `src/lib/referral.ts` · `fetchReferral` | Same-file runtime/schema use: src/lib/referral.ts:106. Public export retained. |
| 16dab911c809407e8f1507f7239cd4f6 | `src/lib/seo.ts` · `title` | Same-file runtime/schema use: src/lib/seo.ts:15. Public export retained. |
| 66e975afc3d44ec48205d5887b17063f | `src/lib/seo.ts` · `description` | Same-file runtime/schema use: src/lib/seo.ts:15. Public export retained. |
| fc6bccd54a8c4c26a04c6b1fe8228144 | `src/lib/seo.ts` · `imageAlt` | Same-file runtime/schema use: src/lib/seo.ts:19. Public export retained. |
| f6aa08419bcf49fe8cff46ed84fa3107 | `src/pages/api/contact.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| 5cecbcf9cfba4de68b547225fa14d3a1 | `src/pages/api/contact.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| a17fc6c32ba34aa187021b981f133185 | `src/pages/api/contact.ts` · `ALL` | Astro filesystem route; runtime consumes ALL. Build and route suites pass. |
| b610961d7dca4de18143f2a898a4743e | `src/pages/api/cron/attio-stages.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| e83e2da0f56d402382f845b258ee103c | `src/pages/api/cron/attio-stages.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| 7637aa689e4948a5b2fc3b5885d72991 | `src/pages/api/cron/attio-stages.ts` · `GET` | Astro filesystem route; runtime consumes GET. Build and route suites pass. |
| 28e50658a8434e9097627da5642f0c24 | `src/pages/api/cron/pipeline-report.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| 912bc9ae21ff4de5a668575aa2ed2d0d | `src/pages/api/cron/pipeline-report.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| 4d62be9454ba412982a85f4a6f1c9331 | `src/pages/api/cron/pipeline-report.ts` · `GET` | Astro filesystem route; runtime consumes GET. Build and route suites pass. |
| ed4ee5f85cd749feb9907ed0bbffcda9 | `src/pages/api/cron/webhooks.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| 71a262c55a2d41abb255de7c386e3244 | `src/pages/api/cron/webhooks.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| 79a6bf57bc0548d6bb94f50b4bfb24a7 | `src/pages/api/cron/webhooks.ts` · `ALL` | Astro filesystem route; runtime consumes ALL. Build and route suites pass. |
| 659f741fbffe4d1a911620f54210aed3 | `src/pages/api/referral.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| decbc470c61a4a3aa387181f486c1883 | `src/pages/api/referral.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| 9c54dfe980424d0e9b6226f7c05a65fe | `src/pages/api/referral.ts` · `ALL` | Astro filesystem route; runtime consumes ALL. Build and route suites pass. |
| 3e642acca9434973837d0fb234beebe9 | `src/pages/api/submissions.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| 3a90a93e13804ea8b2327e18dca90f51 | `src/pages/api/submissions.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| 6e897441da214b1382735b2265380ac5 | `src/pages/api/submissions.ts` · `ALL` | Astro filesystem route; runtime consumes ALL. Build and route suites pass. |
| 1b26a8d5292f43698fe5a069b4f8867f | `src/pages/api/webhooks/cal.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| aec452107c2c441faae72ead30a05393 | `src/pages/api/webhooks/cal.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| a60126cb8b8540408fd50d0aeba11e58 | `src/pages/api/webhooks/cal.ts` · `ALL` | Astro filesystem route; runtime consumes ALL. Build and route suites pass. |
| e14751a4cfc547218902184d6f39f155 | `src/pages/authors-sitemap.xml.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| f1878a3fc5144c239632d24f174fef4e | `src/pages/authors-sitemap.xml.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| d93b5016413444eeaf88fd1dd53f35af | `src/pages/authors-sitemap.xml.ts` · `GET` | Astro filesystem route; runtime consumes GET. Build and route suites pass. |
| 1ee4a383ab284d3db2bc4c09c19fd7a6 | `src/pages/blog-sitemap.xml.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| 40403383a7e9416b8b957506f7d7c9e9 | `src/pages/blog-sitemap.xml.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| 3e980bf8081e4a149f7b9cc669c8ad41 | `src/pages/blog-sitemap.xml.ts` · `GET` | Astro filesystem route; runtime consumes GET. Build and route suites pass. |
| b10c4a0949c4410eb543f34f2b1f4f44 | `src/pages/glossary-sitemap.xml.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| f65adb3a1a5d49db8d4e5a7c475e08ba | `src/pages/glossary-sitemap.xml.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| 5ef1e3e8511c46c981c439f9cd9a6a25 | `src/pages/glossary-sitemap.xml.ts` · `GET` | Astro filesystem route; runtime consumes GET. Build and route suites pass. |
| ffd7e31f7c2e4715a69efe96fcfc4083 | `src/pages/preview/exit.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| 60b408648cec4392b72c83fc261d194b | `src/pages/preview/exit.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| 642482355bbf473aaaf771a9ecec7522 | `src/pages/preview/exit.ts` · `GET` | Astro filesystem route; runtime consumes GET. Build and route suites pass. |
| 15b8e44724ef4e20b4122acc46f34f80 | `src/pages/preview/index.ts` · `prerender` | Astro filesystem route; runtime consumes prerender. Build and route suites pass. |
| 23dbe0e83e674a7a9747338f9f8607ad | `src/pages/preview/index.ts` · `GET` | Astro filesystem route; runtime consumes GET. Build and route suites pass. |
| 47bbb77150f34906a0b6846b7de00452 | `src/pages/robots.txt.ts` | Astro filesystem route; runtime consumes GET/ALL exports. Build and route suites pass. |
| baef6191c0464737b8fcfa13914de73a | `src/pages/robots.txt.ts` · `GET` | Astro filesystem route; runtime consumes GET. Build and route suites pass. |
| 5d242f3df05a487ab6c655f9077b2c9f | `src/server/pipeline-report.ts` · `STAGES` | Same-file runtime/schema use: src/server/pipeline-report.ts:49. Public export retained. |
| d039e4ff83c14036b0b774bb2040b97b | `src/server/submission-handler.ts` · `NONQUALIFYING_MESSAGE` | Same-file runtime/schema use: src/server/submission-handler.ts:129. Public export retained. |

## Code Health findings: complete frozen ledger

These are risk/shape markers, not a list of verified defects. Actual bugs discovered while reviewing their targets were corrected above; real metrics and intentional contracts remain visible. Deliberate catches preserve confirmed delivery, privacy-safe cookie fallback, or persisted retries. Splitting DOM/schema maps or deleting independent assertions just to lower a count would not fix a bug.

| Finding ID | Target / marker | Evidence / disposition |
|---|---|---|
| 2831648de82b42df93684abdeee8e634 | `tests/webhooks.spec.ts` · large_assertion_block | Independent expected webhook/transformation payload assertions protect external contract; reducing assertions would weaken coverage. Isolated DB/VM cases pass. |
| 4cd5b81716c149f3866ce548040962cb | `tests/hookdeck.spec.ts` · large_assertion_block | Independent expected webhook/transformation payload assertions protect external contract; reducing assertions would weaken coverage. Isolated DB/VM cases pass. |
| ceea8684d0e64959820106bf99af3cff | `db/migrations/016_flatten_attribution_for_cdc.sql` · sql_update_delete_without_where | Intentional migration-wide backfill through synchronization triggers; adding WHERE would skip existing rows. Isolated DB reruns/flattening checks pass. |
| c760cf96fd8c4728aa7ea1e677ab4f36 | `db/migrations/016_flatten_attribution_for_cdc.sql` · sql_update_delete_without_where | Intentional migration-wide backfill through synchronization triggers; adding WHERE would skip existing rows. Isolated DB reruns/flattening checks pass. |
| ae1b196da6e14ea2b88d81abcfe62cf8 | `db/migrations/016_flatten_attribution_for_cdc.sql` · sql_high_complexity | Required attribution validation, immutable first-touch/partnership state or trigger table/column mapping. DB idempotency/flattening/PK checks pass; no confirmed logic defect. |
| 20143b03269a454e976c0fbec12d5310 | `db/migrations/010_submission_attribution.sql` · sql_high_complexity | Required attribution validation, immutable first-touch/partnership state or trigger table/column mapping. DB idempotency/flattening/PK checks pass; no confirmed logic defect. |
| 620ccf65afe94d4696faba3bbde22a89 | `tests/submissions.spec.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 3beb8e4b7c96497b92950312a5d7fec3 | `src/components/ReferralForm.tsx` · large_method | Declarative DOM/JSON contract retained; full browser/CMS/SEO suite passes. Line count alone is not a confirmed defect. |
| 5549af10703f4cccb6e225127d118d3e | `src/components/ContactForm.tsx` · large_method | Declarative DOM/JSON contract retained; full browser/CMS/SEO suite passes. Line count alone is not a confirmed defect. |
| e379d46e142542ec83d507f9cd80b946 | `src/components/Calculator.tsx` · large_method | FIXED actual analytics failure blocking scenario update; red/green browser regression. Remaining size is declarative controls/DOM, retained. |
| 9104d5920fb248c588c19913c6fb70b0 | `scripts/prismic-sections.mjs` · large_method | One-time original-content-to-slices mapping; validates all source fields and refuses unmapped content. Declarative field inventory retained, no entrypoint execution. |
| 9fa136f43e6941e0afa4fb0546d3a847 | `tests/hookdeck.spec.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 844d5b9bc50744538a46eeab8b070d97 | `src/components/ReferralForm.tsx` · co_change_scatter | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| b2e5fc16b38a4cc190769b70a8252c93 | `tests/webhooks.spec.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| badef97f5bf34f73af8e9d0318e5e53c | `src/components/PartnershipForm.tsx` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| e2e641ad35a149c8b45d7572c8707f56 | `tests/referral.spec.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| c141bee275754fc9bd6f52c213fc4332 | `src/server/slack-booking-notifier.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 2009c8f7c278418a85a07c8ddaf56f7f | `tests/posthog-server.spec.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 7d18003899fe4b88ae607a5366cc0061 | `src/server/cal-webhook-handler.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 0da7432436984b60aea533294bae4f14 | `src/lib/preview.ts` · function_hotspot | Guarded document-type routing and safe UID/legal allowlists; invalid types/UIDs fall back to Home. Preview/contact/referral/glossary suites pass; CCN is a shape metric, not a defect. |
| a584cc39b373480e867932c2419eb78c | `tests/site.spec.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| fb90f48908344474b8746918905faea3 | `src/components/PartnershipForm.tsx` · co_change_scatter | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 513e88f954ba403eb1180a85addd05be | `src/server/posthog.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 8d054e5da1044e19905792db699abdc8 | `tests/contact.spec.ts` · large_method | Explicit ordered independent test phases/expectations retained; full suite passes without exclusion. Hydration readiness separately repaired in submissions.spec.ts. |
| 2880d7ecc16c4d26aefd2d6cf7e36f23 | `src/components/GlossarySearch.tsx` · large_method | Declarative DOM/JSON contract retained; full browser/CMS/SEO suite passes. Line count alone is not a confirmed defect. |
| 86b8401e03a04f0bb22bb76faee37234 | `tests/prismic.spec.ts` · complex_method | Mock router distinguishes API refs and homepage/form/navigation/footer requests; isolated CMS contract cases pass. Test fixture complexity is not a production bug. |
| 1baafad9c3fc47f7b677355fb4a1f0f5 | `src/lib/glossary-search.ts` · complex_method | Exact/prefix/substring scoring with category AND query and alphabetical tie-break; browser ranking/category/clear cases pass. |
| 7482ae98741243ff85251e46b27f4a6b | `src/server/submission-handler.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 072ce09047814ecab0358282cd397e11 | `src/server/submissions.ts` · co_change_scatter | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 8f12364bd26a4805aab95dde416abebf | `tests/database.spec.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| d2ab1f8cd8a04668b360c1a3821012a1 | `hookdeck/website-attio.js` · co_change_scatter | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 1074900d68284b08928231c28a84642c | `src/server/submissions.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| c53be41988254699895f1d31acbbb522 | `src/lib/blog.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| cbb732021676410e86024fbc103e5378 | `src/server/google-sheets.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 6f3b8abc96674274b0db5205e1e8f0aa | `hookdeck/website-attio.js` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 82e41e9c7329433ba2096caef5712e23 | `src/types/posthog.d.ts` · co_change_scatter | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 24c49bb6afa047689239940640c4d60c | `src/lib/submission.ts` · co_change_scatter | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| d45de9442dda4256b9bb10aba566834f | `src/server/submission-handler.ts` · co_change_scatter | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 6bbeba446b884da0b50aaff6f721497f | `astro.config.mjs` · co_change_scatter | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 39b2c96dc6874690bd35c9e8f4caeee2 | `src/types/posthog.d.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 58f3da677c4142b4970111ad02fda8a7 | `src/lib/submission.ts` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| fe5e3911c69f4823b7741011a0b9b7ce | `src/server/google-sheets.ts` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 20a6b250d6b346b0a421672bae66920c | `astro.config.mjs` · change_entropy | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 30cd4f3fbbf7468baece0c8ffb0611b4 | `scripts/generate-brand-token-specimens.mjs` · complex_conditional | Scalar guard explicitly distinguishes arrays, value/unit objects and primitive strings; required type checks retained. No demonstrated bug. |
| d86ee149116049c2aba566327449b747 | `tests/submissions.spec.ts` · large_method | Explicit ordered independent test phases/expectations retained; full suite passes without exclusion. Hydration readiness separately repaired in submissions.spec.ts. |
| 3c4c13be83454e32a8cf3094ac71b053 | `tests/corral-script-health.spec.ts` · large_method | Explicit ordered independent test phases/expectations retained; full suite passes without exclusion. Hydration readiness separately repaired in submissions.spec.ts. |
| d264ddf419224e05a08508972bb70ecb | `src/lib/seo.ts` · large_method | Declarative DOM/JSON contract retained; full browser/CMS/SEO suite passes. Line count alone is not a confirmed defect. |
| 5fec30b2804b4047b8fa35076cd9fbd5 | `src/components/PartnershipForm.tsx` · large_method | FIXED actual analytics/session failure blocking save/confirmed response/booking; six failure-path browser cases. Required DOM/event shapes retained; marker itself is not cleared. |
| 0542b18ccdce44e2a645fc6310c6393f | `src/components/PartnershipForm.tsx` · large_method | FIXED actual analytics/session failure blocking save/confirmed response/booking; six failure-path browser cases. Required DOM/event shapes retained; marker itself is not cleared. |
| a75b1f5387954d74b1e040362b0bae8d | `src/components/PartnershipForm.tsx` · large_method | FIXED actual analytics/session failure blocking save/confirmed response/booking; six failure-path browser cases. Required DOM/event shapes retained; marker itself is not cleared. |
| 0ca6c99163d74b4b9b12c527d86ec59c | `src/server/posthog.ts` · co_change_scatter | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 5ed6a6df750b460ab3e1a81d1beaff91 | `src/lib/content.ts` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| a67a2fc9b9f345deb1e808fe016475cf | `src/components/ReferralForm.tsx` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| ce990c4e12c44d6b9c770fe7db17143e | `src/components/Calculator.tsx` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 9a94e383e4cd4f51bba0a2f60a078050 | `scripts/corral/import.mjs` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| dae43fd8df984e6090d9511ac7b3f586 | `scripts/corral/activate-schedule.mjs` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| de1803df50bd4eaa85fdcf313c76b209 | `src/components/PartnershipForm.tsx` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 70be82ceda594dceb6f4589dc7643f1e | `src/server/submission-handler.ts` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 107b3a36e97c42bdb055936fe2439d6f | `tests/database.spec.ts` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| b0818dc7d2db43488d829bf27cb17d64 | `tests/seo.spec.ts` · prior_defect | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 3b8bef50467a4d6db30a58604f122794 | `tests/corral-links.spec.ts` · prior_defect | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 975a34234a1e44109c2d280f4ea97de8 | `src/pages/robots.txt.ts` · prior_defect | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| b27e8f5111a84fe4a63813da5447b68a | `src/lib/site.ts` · prior_defect | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| bc8ac7bdfeca4c9285aa6ec94cdca9f8 | `src/lib/blog-links.ts` · prior_defect | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| f083fdf14d8b446895c9fb50f31a25bb | `tests/webhooks.spec.ts` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 6a545cdde54d4a7db0db7e72fcbbee7e | `tests/hookdeck.spec.ts` · prior_defect | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 8d296b74d4d3471c906bfc1d3cf9bedb | `src/lib/blog.ts` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 09c23dabddc842d3a50a5fdddd9af5ea | `src/lib/blog.ts` · prior_defect | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 803a44a4d3ee4dd6b4cc63825689f426 | `hookdeck/website-attio.js` · prior_defect | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 7c5d8300a76449128878217492cd60d0 | `src/server/webhook-outbox.ts` · error_handling | Transport failure feeds persisted retry/status/error metadata; lease/cancellation/network tests pass. |
| 718bf307aff440cdaec84dc8e5488b30 | `src/lib/attribution.ts` · error_handling | Malformed consent cookie fallback; explicit opt-out still wins. Malformed-cookie/privacy regression passes. |
| 01c5bba3b433437bad8aed0133e451bb | `src/components/ReferralForm.tsx` · error_handling | Saved confirmation survives analytics failure; independent identify/capture attempts. Browser regression passes. |
| 4e3fda02fdc947ab8c80eb9fa4662d1f | `src/components/ReferralForm.tsx` · error_handling | Saved confirmation survives analytics failure; independent identify/capture attempts. Browser regression passes. |
| 8c346ddff8ca498e93297ac540304ff2 | `src/components/ContactForm.tsx` · error_handling | Saved confirmation survives analytics failure; independent identify/capture attempts. Browser regression passes. |
| 899a9fad581346f3a633832bef2a3450 | `src/components/ContactForm.tsx` · error_handling | Saved confirmation survives analytics failure; independent identify/capture attempts. Browser regression passes. |
| 52cf3408b4af44faafe40d1509145bff | `scripts/corral/import.mjs` · primitive_obsession | Private CMS checkpoint/type/UID/data/title contract; five arguments are explicit, not a bug. Mocked integrity/failure tests pass. |
| 64cd9ff9ac384be29038b5b4eaf9b27d | `astro.config.mjs` · prior_defect | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 32ebfb2c846c49cbbe31aaf9f68ad7d1 | `tests/site.spec.ts` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |
| 4b342b3c0a3846fc833111e7e129d2ef | `src/server/posthog.ts` · churn_risk | Retain historical risk predictor; describes committed history, not a demonstrated current bug. |

## Security signals: complete frozen ledger

All 16 initial signals are `template_literal_sql`. Postgres.js 3.4.9 uses **tagged templates**: values are sent separately as protocol parameters, not concatenated into SQL. Disabling named prepared statements for transaction-pooler compatibility does not disable parameterization. Static migration files passed to `unsafe` are not user-input concatenation.

Cross-checks: installed `postgres` README “Query parameters,” upstream [Postgres.js documentation](https://github.com/porsager/postgres), and the existing isolated DB regression which submits a company name containing a DROP TABLE fragment and verifies exact persisted text. Source/client/transaction tags and every listed test query were inspected. The pattern scanner does not distinguish safe tagged templates from unsafe string interpolation.

| Initial security ID | Target | Evidence / disposition |
|---|---|---|
| 1 | `src/server/submissions.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 2 | `src/server/webhook-outbox.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 3 | `tests/database.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 4 | `tests/database.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 5 | `tests/database.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 6 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 7 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 8 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 9 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 10 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 11 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 12 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 13 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 14 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 15 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |
| 16 | `tests/webhooks.spec.ts` | Parameterized Postgres.js sql/tx tagged template, not string concatenation; driver README and real DB malicious-text/lease tests establish safety. Retain. |

## Documentation drift: complete frozen ledger

All rows are **fixed**. Original source prose/code samples were preserved except link destinations, the incorrect internal heading fragment, and inaccurate Rancher form/legal-source guidance. Root-relative PostHog links outside the detector's original queue were corrected by the same rule rather than leaving sibling references broken. All **22 unique official documentation targets return HTTP 200** through Firecrawl; rate-limited initial checks were retried with throttling. Evidence: `posthog-link-validation.json`. Remote fragment existence was not separately re-audited; the broken local fragment was checked against its actual heading.

| Initial finding ID / live occurrence | Document / original line | Repair |
|---|---|---|
| d5ce8f82e83c304139a2f0fe0821e03d | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:207 | Corrected heading anchor to include its final word. |
| e17d06b85e08fb64bb8553089883708b | `.claude/skills/integration-astro-hybrid/references/astro.md`:11 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| cd43194ffe9e3bb5903ca5887f88ac9c | `.claude/skills/integration-astro-hybrid/references/astro.md`:63 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| fcabb208c5ff615abeee22861c58f05e | `.claude/skills/integration-astro-hybrid/references/astro.md`:63 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 1ad2813b6f2e084f19e6a153a67101cd | `.claude/skills/integration-astro-hybrid/references/astro.md`:139 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 1a3e1f46d539dfd0bfff2b3d959ac011 | `.claude/skills/integration-astro-hybrid/references/astro.md`:139 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| de3a501368f290b72732adae781f18c8 | `.claude/skills/integration-astro-hybrid/references/astro.md`:139 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| b9998f4d39379d7e5ae15c7298c8df5e | `.claude/skills/integration-astro-hybrid/references/astro.md`:167 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 9643a4bf6c9cbd52810d953ca0c6b228 | `.claude/skills/integration-astro-hybrid/references/astro.md`:169 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| d2ba4ae5da14bf0cf5131ae3e76b824f | `.claude/skills/integration-astro-hybrid/references/astro.md`:171 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 422fd975ba7326dfa272d27735f31699 | `.claude/skills/integration-astro-hybrid/references/astro.md`:171 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| a5d2158f177811d905a1b38e7e83c6af | `.claude/skills/integration-astro-hybrid/references/astro.md`:171 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 46dd99063229e2b87605eefb22203b99 | `.claude/skills/integration-astro-hybrid/references/astro.md`:175 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 613ca9189e2f8c132123ce9bba7a3f44 | `.claude/skills/integration-astro-hybrid/references/astro.md`:181 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| e86d6111e9b0c60054ea5617f0ce5182 | `.claude/skills/integration-astro-hybrid/references/astro.md`:191 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 8c381330963924b2e0e6aebe17a77608 | `.claude/skills/integration-astro-hybrid/references/astro.md`:195 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 415e73937beab7fdee48d32a51b3c364 | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:13 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 2b0a7780f2e485297bc04b28431343e3 | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:13 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 0a7c349d12d3130e53bdaf21fa822c15 | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:77 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 7020d5638b02e9a2e5ec68d3795643a1 | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:193 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 58b38b6f9774dc5d81822baea6872c7d | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:201 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 561c9386db5bc2f2a66a47f4d9129fc6 | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:203 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 25edb6f20a6ff4822fc076867d11abae | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:221 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| e0914e17f25831656f247759c7c5c581 | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:222 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 801f9bd306c0f8203d6f834082c5437a | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:297 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 086f5770b163ae08d7e5c1fea47c5bb5 | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:298 | Qualified copied upstream link with https://posthog.com and removed extraction-only .md suffix. |
| 2a504bd5e7911dae32f62bf7294597e5 | `brand_atomic_system/agent/verbal/claims-and-legal.md`:27 | Replaced retired legal-module reference with actual Prismic loader/snapshot sources. |
| LIVE-extra-1 | `.claude/skills/integration-astro-hybrid/references/identify-users.md`:13 | Same root-relative upstream-link repair; separate anonymous-event fragment absent from the 27-item indexed API. |

## Dashboard refresh

Completed using `repowise update . --since HEAD^ --no-workspace --index-only --no-agents`, followed by **unfiltered** `repowise health . --no-workspace --format table`. JSON-only health inspection does not persist dashboard metrics. Independently retrieved local API data, then compared live dead-code/doc-drift populations:

| Population / same basis | Before | After |
|---|---:|---:|
| Live doc-drift occurrences | 28 | **0** |
| Indexed doc-drift IDs | 27 | **0** |
| Live / indexed dead-code findings | 87 | **85 / 85** |
| Open defect + maintainability markers | 79 | **83** |
| Pattern-based security signals | 16 | **16** |
| Fix-first eligible files | 4 | **6** |

Final health basis: **2026-10-06T22:56:36.785002**, HEAD `4523816a547ddaa28e2e289ff30978c4d0bf7d17`. Fix-first: **71 candidates / 6 eligible / 6 shown**, all six in the lower-priority maintainability tier; its defect/performance eligible counts are zero. The complete all-dimension overview additionally includes performance advisories outside this frozen bug/dead-code/doc-drift scope, so its total is not the 83-row filtered inventory.

The four added markers are the deliberate failure boundaries needed to correct the bugs: three catches in PartnershipForm (optional session, independent identify, confirmed-delivery analytics) and one in Calculator (scenario preservation). These catches are proven by regression tests, not silently dismissed. The original four eligible files—ContactForm, ReferralForm, attribution and webhook-outbox—retain their demonstrated confirmation/fallback/persisted-retry boundaries. **Six visible warnings does not mean six unfixed bugs.** No detector statuses were altered; retained findings remain open and visible.

Final API evidence: `health-findings-final.json`, `health-fix-first-final.json`, `health-overview-final.json`, `dead-code-final.json`, `doc-drift-final.json`, `security-final.json`. Distinct live evidence: `dead-code-live-final.json`, `doc-drift-live-final.json`. The 83-row final inventory differs from the frozen 79 only by the four intentional catches; no new test shape marker remains. No zero-total-findings or zero-opportunities clearance claim is made.
