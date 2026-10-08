# Quiz coverage and Repowise gate

## Scope and thresholds

This is a **seller-quiz coverage gate**, not a repository-wide coverage claim. `.c8rc.json` includes the funnel view, both hooks, all `src/lib/quiz*.ts` and `src/server/quiz*.ts` modules, both quiz API routes, and the browser coverage adapter. Shared site components, the staff dashboard React view, JSON copy/maps and non-quiz application code are not instrumented by this gate. JSON seller-only copy and all 10 graph paths are verified by separate assertions in the same test run.

Thresholds are enforced **per file**, including otherwise unexecuted files through c8 `all`: 90% lines, statements and functions; 80% branches. No coverage-ignore comments or lowered thresholds were added to make the suite pass. Repowise 0.55.0 reads LCOV and requires 90% changed-line coverage and 80% changed-line branch coverage, with no small-patch exemption. `.repowise/config.yaml` is the only versioned file in that directory; local indexes remain ignored.

## Reproduce in containers

```sh
docker build -f scripts/quiz-coverage.Dockerfile -t rancher-quiz-coverage .
docker create --name rancher-quiz-coverage --network none rancher-quiz-coverage
docker start -a rancher-quiz-coverage
# Copy evidence even if the test/threshold step failed.
docker cp rancher-quiz-coverage:/app/coverage ./coverage
docker rm rancher-quiz-coverage

docker build -f scripts/quiz-coverage-repowise.Dockerfile -t rancher-quiz-repowise .
docker run --rm --network none -e DO_NOT_TRACK=1 -e HOME=/tmp \
  -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0=/repo \
  -v "$PWD:/repo:ro" -w /repo rancher-quiz-repowise \
  repowise coverage check BASE_SHA..HEAD --fail-under-branches 80 --format json
```

Use the intended change base, not `origin/main...HEAD` after publishing both at the same commit; that would measure an empty diff. For an external Git worktree, also mount its common Git directory read-only at its original absolute path. Ordinary CI checkouts need only the repository mount.

The image uses Node 22 and the Chromium version matching Playwright 1.63.0. Dependencies are locked with `npm ci`; c8 is pinned to 12.0.0. No system packages are installed on the host. Image builds fetch packages; test execution has **no external network**. No production credentials, live Jev calls or live analytics writes are needed. Existing browser scripts intercept provider and SDK endpoints and exercise the actual rendered UI and PostHog SDK. The single new npm development dependency is c8, which handles V8-to-Istanbul conversion and report generation rather than a custom coverage parser.

`.github/workflows/quiz-coverage.yml` runs on pull requests and pushes to main/staging. It builds both tool images, collects coverage, gates the PR merge-base/push base with Repowise, and retains `coverage/quiz/` for 14 days even on failure. Branch-protection settings are not changed by this workflow; configure the `quiz-coverage` check as required separately if desired.

## How coverage is collected

Node test workers use `NODE_V8_COVERAGE` with source maps enabled. The Astro web server explicitly clears this variable because its SSR transforms use different byte offsets from Playwright's Node transforms. Browser coverage comes from Chromium's `page.coverage`, starts before the tested navigations, and survives navigation. Each browser transform gets a separate virtual generated URL with its original inline source map and line lengths, so c8 remaps hits to the real TypeScript/TSX files before merging them with Node hits. Browser and Node raw byte offsets are never merged as if they were the same script.

The browser adapter fails if an included application script lacks a map or no application coverage is collected. Regression tests verify relative/absolute source-map paths and failure behavior. The report includes untouched code with zero hits rather than omitting it. Missing reports make Repowise exit 2; insufficient coverage makes the gates fail. Runtime instrumentation is not included in the production app.

Outputs (ignored by Git):

- `coverage/raw/`: raw Node/Chromium V8 evidence.
- `coverage/quiz/lcov.info`: source-mapped input for Repowise, including branches.
- `coverage/quiz/coverage-summary.json`: per-file and aggregate measurements.
- `coverage/quiz/coverage-final.json`: detailed source locations/hits.
- `coverage/quiz/lcov-report/`: browsable coverage report.
- `coverage/quiz/repowise.json`: CI changed-code gate result.

## Initial measurements, 2026-10-08

41 quiz tests pass in a fresh image with external networking disabled, including all seller paths, real browser landings/retry/back/consent/GPC, failed readiness, actual API wrappers with mocked I/O, rate-limit expiry, malformed consent, SDK initialization failure, and staff query/label failure paths. Measured aggregate coverage is **99.61% lines/statements, 100% functions and 95.49% branches**. Every included file passes the thresholds. Typecheck/build pass with seven pre-existing unrelated hints. Negative controls confirm that zero-hit coverage fails Repowise with exit 1 and a missing report fails with exit 2.

A separate full-repository offline run passed 204 tests, skipped three and timed out on the 30-second graph test. The isolated coverage suite passes that graph test. The full-suite failure is not hidden or counted as passing; process-shared telemetry state from other suites is a suspected cause, not a proven diagnosis. This workflow deliberately runs the quiz suite, not a repository-wide test gate.

The measured seller correction `e2913a5..96f6f02` passes Repowise at **100% changed-line coverage (7/7 reported lines)**, with no newly changed branching lines. This is a small prompt/configuration/deletion-heavy patch: JSON copy and deletions are not executable coverage. The wider source coverage is reported separately in the summary and must not be described as 100% solely because this patch passes.

Coverage proves execution, not that every assertion is sufficient, business assumptions are correct, all repository tests pass, or live Jev accuracy is established. Earlier Repowise health scores are a separate static maintainability measure. No local wiki/index refresh or live classifier evaluation is implied.
