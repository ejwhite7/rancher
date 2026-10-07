# Local development

Use the Node 22 container workflow in `docs/intake.md` for dependency installation and verification. Snapshot content avoids CMS credentials for local checks. Mock submission endpoints in browser tests so checks do not create live enquiries.

When changing partnership intake, read `docs/intake.md`; the homepage and wizard share `PartnershipForm.tsx` and the existing submission API.
