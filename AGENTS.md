# Local development

Use the Node 22 container workflow in `docs/intake.md` for dependency installation and verification. Snapshot content avoids CMS credentials for local checks. Mock submission endpoints in browser tests so checks do not create live enquiries.

When changing partnership intake, read `docs/intake.md`; the homepage and wizard share `PartnershipForm.tsx` and the existing submission API.

For quiz routing, analytics, dashboard access or reviewer labels, read `docs/quiz.md`. Use `compose.quiz.yaml` for quiz development/checks; keep private CRM research outside the repository and verify public quote snapshots with `scripts/quiz-source.check.mjs`.
