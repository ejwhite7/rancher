# Production quiz investigation

Checked at **2026-10-08T00:08Z**. This is a read-only investigation of existing runs, not a new paid inference test.

## Verified

- GitHub records a successful Production deployment for commit `14d8d900014d73fa08ebd380c518c21240ab2ef3`, deployment record `6923562081`, URL `https://rancher-g31oyewcl-b2b-saas.vercel.app`.
- `GET https://www.gorancher.com/api/quiz/classify/` returned HTTP 200 and `{"configured":true}`. This handler checks configuration only and does **not** contact Jev.
- The active PostHog project (609505, Production) matches the quiz's deployed public project token; comparison was performed without displaying the token.
- A bounded read-only query of that project's events from 2026-10-07T23:45:00Z returned no `quiz_session_started`, `quiz_answered` or `quiz_completed` rows at the time of inspection. The taxonomy snapshot predates deployment, so the investigation also checked actual recent records rather than relying on the snapshot.
- The deployed server calls `POST https://api.typesafe.ai/v1/systemone` with native Choice criteria and readable active history, including written answers. Successful progression requires a validated response. There is no weight fallback in this deployed version. This is evidence about the code path, **not a provider receipt for a particular historical session**.
- The deployed adapter does not emit dedicated provider request receipts. The inspected Vercel/Jev integrations have no active connection that can read request history. Historical provider calls and the reported incorrect classifications therefore remain **unverified**.

## Confirmed requirement failure

`tests/quiz-length-regression.spec.ts` executes the real deployed `nextQuestion` logic with a synthetic valid uncertain classification. Its exact conformance assertion fails:

```text
AO at 0.5: q1 → q2 → q4_problem → q5_outcome
Expected: >= 6
Received: 4
```

The map sends an uncertain opening pair straight to the two written questions. The runtime permits at most one tailored question, the server caps history at five answers, and the UI has hardcoded five-step progress. Together these produce four questions when uncertain or five with a branch—not the required six to eight per visitor. Earlier tests encoded the incorrect short-flow contract, so their success was not evidence of compliance.

## Not established

- No-event results do not prove that Jev was not called. Optional analytics require saved site consent and can be unavailable or blocked; inference is independent.
- Configuration presence does not prove valid credentials, a successful vendor call, or classification accuracy.
- No exact failed-run input/output or independently verified expected label was available. The length bug is established; the cause of incorrect archetype predictions is not.
- The corrected map's graph tests prove path shape, not classifier quality. A source-code health score is neither conformance nor accuracy evidence.

## Evidence needed next

Obtain read-only Vercel runtime logs/provider request records for the affected UTC window, and at least one failed run's expected role and returned landing. If available, inspect its existing response model, probabilities and provider request identifier. Do not paste credentials or turn on answer logging without an appropriate privacy/consent basis.

Before release, independently label representative histories across all four roles and replay them against Jev with authorization. Specifically test supplier versus downstream buyer, affiliate introductions versus acquisition partners, existing supplier offers versus first-time archive reviews, and explicit role corrections in written answers. Do not replace Jev with a role picker or a keyword/weight override to hide errors.

Corrected proposed map and diagram: `quiz_map.json` and `quiz_flow.md` in this directory. They remain review artifacts; no production changes were made during this investigation.

PostHog evidence interpretation: [AI observability traces](https://posthog.com/docs/ai-observability/traces) and [manual capture](https://posthog.com/docs/ai-observability/installation/manual-capture) describe dedicated provider trace events; ordinary client quiz analytics are not such traces.
