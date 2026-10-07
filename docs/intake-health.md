# Intake code-health verification

2026-10-07T17:10Z — Repowise 0.55.0 was run directly against the dirty intake worktree and the original Rancher checkout. A fresh worktree index was generated without a model, editor setup, hooks, agent-file rewrites, or credentials. No findings were suppressed or marked resolved. Local generated index/evidence directories are ignored by Git, not source files.

## Changes and results

The initial wizard embedded URL parsing, step validation, analytics, and presentation inside PartnershipForm, raising its maximum cyclomatic complexity from the baseline 8 to 44. Prefill parsing and wizard navigation now live in `src/components/useIntakeWizard.ts`; form defaults, progress/actions, introduction, and record-type presentation have explicit private boundaries. Submission transport and final tracking remain unchanged. Optional step-tracking errors emit only a generic warning/error class, never form data or error text.

| Path                                 |            Final maximum CCN |      Repowise health |
| ------------------------------------ | ---------------------------: | -------------------: |
| `src/components/PartnershipForm.tsx` | 8 (baseline 8, initially 44) | 5.85 (baseline 5.15) |
| `src/components/useIntakeWizard.ts`  |                            6 |                10.00 |
| `tests/intake.spec.ts`               |                            3 |                 9.85 |
| `tests/intake-prefill.spec.ts`       |                            1 |                 9.85 |

The wizard module has no findings. New complexity, bumpy-road, function-hotspot, and oversized-test-function findings were removed. Form functions retain baseline-sized low-severity presentation/payload warnings: tracking payload 71 lines (unchanged), fields 84 lines (baseline 84), form component 66 lines (baseline 67). Existing churn/change-entropy/co-change history warnings remain, as do three pre-existing best-effort analytics catch warnings. Tests demonstrate that analytics exceptions must not prevent persistence, navigation, confirmation, or redirect; changing those boundaries simply to silence a heuristic would reintroduce a bug.

Two low-severity test duplication findings remain: 10 lines overlap the Google Sheets payload test, and 17 lines overlap existing submission tests. These assert the same API contract independently through different paths. They are not production duplication or runtime defects; no generic cross-suite abstraction was added solely to improve the score. This is not a zero-warning repository claim.

## Verification and evidence

- Ten wizard/prefill/homepage browser tests passed after refactoring. They verify all data-field URL prefill, aliases/multiple records/invalid options, consent remaining unchecked, preservation of edits, per-step validation and events, analytics-failure boundaries, retry identity, final conversion, and mobile layout.
- Astro diagnostics: zero errors/warnings, seven pre-existing unused-code hints.
- Snapshot build, changed-code Prettier, and `git diff --check` passed.
- No live submissions, PostHog captures, Hookdeck calls, production writes, commits, or deployments were performed.

Local evidence: `artifacts/intake-health/form-baseline.json`, `form-before.json`, `final.json`, `index.log`; test/build log `/tmp/intake-health-checks.log`. Reports are fresh in-process computations, not a stale main-checkout dashboard.

Recompute using the existing Repowise container image, mounting both the worktree and the main checkout (the worktree Git pointer requires the latter):

```sh
docker run --rm -e DO_NOT_TRACK=1 -e HOME=/tmp \
  -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0='*' \
  -v /home/cmux/rancher:/home/cmux/rancher:ro \
  -v /home/cmux/rancher-intake:/home/cmux/rancher-intake \
  -w /home/cmux/rancher-intake rancher-repowise:local \
  repowise health . --no-workspace --format json
```

The host paths above describe this workspace; adjust them when moving the checkouts.
