# Rancher quiz

## Current contract

`/quiz/` opens on question one, using the main website’s Navigation (including its exact SVG logo), Footer and privacy controls. Every visitor answers **6–8 questions**, with two shared opening choices, 4–6 choices overall and exactly two open answers last. One question per screen, back navigation and graph-aware progress (a total range until the branch is known, then an exact total); no introduction, separate analytics checkbox, eyebrows, visitor-facing archetype labels, scoring explanations, manual role picker, research quote blocks, notes summary or purchase disclaimers. Archetype IDs are internal routing and staff-measurement metadata only.

`q5_outcome` uses “What would make this worth your time?” as its heading; the requested result/deadline/license/data-requirements sentence is supporting text. The offer-comparison CTA goes to `/intake/`, the canonical trailing-slash route required by this Astro project. The previously built three-step intake wizard is reused from the local intake worktree, not replaced with a new form. Other CTAs remain `/contact/`; no answers, model result or session identifiers are appended to any CTA.

## Mandatory native Jev classification

`src/server/quiz-classifier.ts` calls `POST https://api.typesafe.ai/v1/systemone` with a `choice` question and the four research-grounded criteria AO/OS/MC/AP. Every submitted answer triggers a classification of the complete active history, including the exact written responses and readable choice labels. Neither supplied option weights nor previous predictions are sent to Jev. There is no weight-based/offline classifier or manual path-selection fallback.

Both opening questions precede branching. A top archetype probability must be **strictly greater than 0.85** to select its follow-ups; this uses Jev’s raw probability, not its separate confidence field. An early branch asks two tailored choices and two written answers (six questions). If uncertain, ask `q3_shared`; branching there yields seven questions. If still uncertain, ask `q4_shared`; branching there yields eight. Remaining uncertainty proceeds to both written answers, for six questions overall. A fresh high-probability role correction after the first tailored choice switches only the second tailored choice. Written answers can change the final landing but never reopen a branch. At the end, automatically use the latest validated Jev best choice, even below the follow-up cutoff. Probability is not independently measured accuracy. The complete diagram and evidence-grounded design are in `docs/quiz-revision/quiz_flow.md`.

Back navigation invalidates downstream predictions while retaining drafts for unchanged revisits. Editing an earlier answer clears subsequent drafts. Continuing always requires a new successful Jev response. Responses must supply a finite 0–1 probability for every archetype, a distribution summing to one, a valid highest-probability choice, confidence and a Jev model identifier. Invalid responses, missing/invalid credentials, overloads, rate limits, network failures and timeouts do not advance the quiz or discard its current draft.

`GET /api/quiz/classify/` checks local configuration without calling the provider; a missing key returns 503 and disables submission. `POST` validates same-origin JSON, bounded input (16 KiB), known choices, 1–8-answer graph-prefix order (including both follow-ups before the written pair) and 2,000-character written-answer limits before contacting Jev. Provider calls time out after 20 seconds. A bounded process-local rate limit allows 30 calls/minute/IP; it is not a distributed production spending control. Before public rollout, configure edge rate limits and TypeSafe account spending controls, and verify the site’s privacy notice/provider-processing arrangements cover this service. No new privacy warning or checkbox is added to the quiz.

## Operational inference receipts

Every attempted upstream inference emits `quiz_jev_request` through the existing `serverLog` pipeline: Vercel console and configured operational PostHog OTLP logs. Fields are a random server request ID, provider request ID if supplied, requested/resolved model, upstream status, validation result, answer count and latency. `X-Quiz-Request-Id` correlates the response with its receipt. Answers, choice labels, probabilities, credentials, IPs and session IDs are never included. Receipt failures do not fail essential classification. Configuration-only GETs, invalid input and requests blocked before inference emit no provider receipt. These records are not optional client answer analytics, and they cannot retroactively prove pre-revision calls. Verify receipt availability/retention in the hosting configuration before treating it as a complete audit trail.

## Server-only configuration

- `TYPESAFE_API_KEY`: required TypeSafe account key, stored in server secret management or a protected local environment file; never a `PUBLIC_` variable and never pasted into chat.
- `TYPESAFE_MODEL`: optional, defaults to `jev-latest`. The resolved model identifier is recorded with predictions. Pin a tested version if stable model behavior is required.

The endpoint and model contract were confirmed against official TypeSafe API/model documentation on **2026-10-07**. No endpoint choice from the operator is necessary. Local checks use no real TypeSafe key. On 2026-10-08, production readiness returned configured, but historical live inference remained **unverified** because provider/runtime records were unavailable; see `docs/quiz-revision/production-verification.md`. Readiness is not an inference receipt.

For Compose, pass the key through the environment or `docker compose --env-file /secure/path/quiz.env -f compose.quiz.yaml up -d`. Recreate the service when runtime secrets change. The existing manual `rancher-quiz-dev` container occupies port 4324; stop that owned preview before switching to the Compose service on the same port. Never echo the key or include it in command arguments, logs, browser code, model state or screenshots.

## Analytics and staff measurement

A saved analytics-allowing choice in the existing `rancher_consent` cookie and the `rancher:consent` event control optional anonymous quiz analytics; Global Privacy Control and analytics withdrawal stop capture. There is no separate quiz opt-in checkbox. Essential Jev processing is separate from optional analytics. Quiz answers stay in React memory between submissions, but are sent to Jev for classification; do not describe this as private/offline mode.

The named PostHog SDK instance uses memory persistence, anonymous session IDs and no identify calls, ad pixels, session replay, autocapture or page/DOM capture. Events carry all four Jev probabilities, model, confidence, active answers and `rancher-quiz-v3-jev`; no legacy weight predictions are mixed into this version. Missing analytics configuration does not prevent Jev classification. Missing Jev configuration always prevents the quiz from progressing.

Public ingestion configuration is build-time: `PUBLIC_POSTHOG_PROJECT_TOKEN` and `PUBLIC_POSTHOG_HOST`; rebuild after changing either. Staff-only runtime configuration: `POSTHOG_PROJECT_ID`, `POSTHOG_QUERY_HOST` (US/EU; default US), project-scoped `POSTHOG_PERSONAL_API_KEY`, `QUIZ_DASHBOARD_TOKEN` (at least 32 characters), and separate stable `QUIZ_LABEL_SIGNING_KEY` (at least 32 characters). These secrets never enter public HTML. Rotating the signing key invalidates historical label signatures.

The staff UI is now `/quiz/dashboard/`, not part of the visitor funnel. Its API remains `/api/quiz/dashboard/`, requiring bearer authentication and failing closed without configuration. Signed, independently reviewed labels—not self-selection or classifier confidence—measure accuracy. Dashboard windows are 1–30 days, capped at 10,000 events; partial counts are refused. Drop-off uses sessions inactive for at least 30 minutes. Conditional branch cohorts, analytics choice, incomplete observations and small samples limit interpretation; no accuracy claim is made without verified labels.

Events: `quiz_session_started`, `quiz_question_viewed`, `quiz_answered`, `quiz_answers_invalidated`, `quiz_completed`, `quiz_cta_clicked`, `quiz_label_verified`. The old visitor-confirmation event is no longer emitted.

## Local checks

```sh
docker compose -f compose.quiz.yaml run --rm quiz npm ci
docker compose -f compose.quiz.yaml up -d
docker compose -f compose.quiz.yaml run --rm quiz npm run check
docker compose -f compose.quiz.yaml run --rm quiz npm run build
docker compose -f compose.quiz.yaml run --rm quiz npm test -- tests/quiz.spec.ts tests/quiz-classifier.spec.ts tests/quiz-refactor.spec.ts tests/quiz-length-regression.spec.ts tests/submission-transport.spec.ts tests/seo.spec.ts
```

`tests/quiz-length-regression.spec.ts` exercises all 49 structural paths through the actual router and server, every submitted graph prefix, total ranges and metadata-only receipts. `node docs/quiz-revision/quiz_map.check.mjs` independently checks the map shape. `tests/quiz.browser.mjs` validates six-, seven- and eight-answer flows, cross-role follow-up changes, all four automatic landings, the canonical intake destination, written-answer routing changes, uncertainty without a role picker, failure gating/retry, invalid response gating, duplicate-submit prevention, back/drafts, rejected copy and 320/375/1440px overflow. Use `playwright_validate` for real-engine focus, layout, interactions and intercepted requests. Mock Jev and PostHog; never send live test answers/events. `tests/quiz-consent.browser.mjs` checks real SDK payloads (including written responses), a saved site choice before sharing, withdrawal and GPC. Screenshot files `artifacts/quiz-mobile.png` and `artifacts/quiz-desktop.png` show mocked readiness, not live inference. The native HTTP contract is separately tested against mocked provider responses, including authentication, invalid distributions, overloads and transport failures.

The site’s existing SimpleConsent library requires `crypto.randomUUID` on save: use HTTPS or a trusted localhost origin. Bridge-IP HTTP browser tests fail that secure-context requirement. Verification uses a temporary self-signed HTTPS proxy in an isolated QA container; certificate acceptance is restricted to the local test context. Test synthetic PostHog credentials never replace private-preview configuration.

`src/data/quiz_map.json` mirrors `/home/cmux/quiz_map.json`, including the revised question copy. The old editorial weights remain in the input map as research/design data only; runtime routing never computes or uses them. Quote snapshots are not displayed, but `scripts/quiz-source.check.mjs` still verifies their fidelity against the unchanged private report. No fabricated testimonials, prices, packages or results.

## Maintainability and response validation

`QuizFunnel.tsx` contains the accessible question/landing views. `useQuizFunnel.ts` owns atomic UI state transitions, fresh per-answer requests, draft retention and the synchronous pending-request guard. Its pure `advanceQuiz`/`rewindQuiz` functions are regression-tested. `useQuizAnalytics.ts` owns the saved-consent subscription and SDK lifecycle: duplicate opt-ins cannot start concurrent initializations; a tracker resolving after withdrawal or unmount is stopped without answer capture. Capture rechecks saved consent/GPC and respects explicit withdrawal even if cookie storage fails. Optional SDK failures never turn successful essential classification into an error.

The existing Zod dependency supplies the shared `src/lib/quiz-classification.ts` contract. Both server and browser validate finite all-four probabilities, the normalized distribution, a maximizing choice, confidence, Jev model and source. Invalid or malformed successful HTTP responses do not advance or discard a draft. The server adapter separately validates bounded known answers and history order, translates choice IDs to readable labels, and isolates upstream failures from request parsing.

`tests/quiz-refactor.spec.ts` covers response corruption/nonfinite values, written role corrections, late branching, immutable back/edit transitions, duplicate SDK initialization, failed-cookie withdrawal, silent consent changes, GPC, disposal and optional SDK failures. The real-browser scripts exercise the actual UI and intercepted SDK traffic; they do not call live Jev or ingest live analytics.

On 2026-10-07, live working-tree Repowise code health improved from **6.00 to 10.00** for `src/server/quiz-classifier.ts` and **8.35 to 10.00** for `src/components/QuizFunnel.tsx`. The three extracted/shared modules also scored **10.00**, with no findings. No rules or thresholds were suppressed. These are static maintainability scores, not a repository-wide clean bill, security-gate result or live inference verification; unrelated findings and the documented production abuse-control requirements remain.

## 2026-10-08 conformance correction

The previous deployment asked four questions when uncertain or five after a branch. Earlier tests accepted that incorrect contract. The new regression first reproduced the four-question failure, then passed after replacing the map and runtime rules. The approved replacement has 14 definitions and 49 structural paths; every path has six to eight questions, four to six choices and exactly two written answers. Graph-prefix validation rejects skipped, repeated or out-of-order follow-ups before contacting Jev.

Container verification: 36 focused tests, graph/source fidelity checks, formatting, Astro typecheck and production build. Typecheck retains seven pre-existing unrelated hints with zero errors/warnings. Chromium validates all four landings, delayed seven/eight-question branches, cross-role changes, written corrections, retry/malformed-response gating, duplicate-submit prevention, drafts/back, intake and 320/375/1440px layouts. It also checks the actual intercepted PostHog SDK for saved consent, withdrawal and GPC. The main browser harness makes 55 **mocked** classifications, not live Jev calls; the local unconfigured readiness 503 is expected. Native-provider contract tests use mocks too. Actual classifier accuracy and historical provider calls remain unverified; do not interpret passing mocks or graph tests as evidence otherwise.

Future native calls have operational receipts through the existing logger. The prompt clarifies supplier versus downstream buyer, first archive review versus existing-offer comparison, and referral versus acquisition roles; this does not establish the cause of the reported historical wrong results. Independent labeled real-provider evaluation still needs authorization and failed-run examples.

## References

- [TypeSafe API](https://docs.typesafe.ai/api): native endpoint, Choice request and probability response contract.
- [TypeSafe models](https://docs.typesafe.ai/models): `jev-latest`, resolved model IDs and account limits.
- [TypeSafe confidence](https://docs.typesafe.ai/confidence): confidence differs from the highest choice probability.
- Private evidence: `/home/cmux/archetypes.md`; SHA-256 `544781c4ee5d26f6964f02194ee9a9055d6aa12708a0300e1854368c55424181`. Keep the full CRM report outside the repository.

Local verification uses mocked Jev and PostHog; it does not verify live inference or analytics ingestion. For Vercel, configure server-only `TYPESAFE_API_KEY` under the Rancher project's Environment Variables for Production and, separately, Preview if staging should work. Redeploy after configuration changes. `GET /api/quiz/classify/` confirms configuration only; it never calls Jev. Public-rollout abuse controls and provider/privacy arrangements still require operator verification.
