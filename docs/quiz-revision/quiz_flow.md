# Corrected Rancher quiz — review before rebuilding

**Status:** Approved by the user and implemented locally on 2026-10-08; deployment verification is recorded in `docs/quiz.md` and the workspace continuity log. This supersedes the old 4–5-question design. Source: `/home/cmux/archetypes.md`, read in full. Question wording below is a **paraphrase grounded in the cited research**, not a claim that a prospect said each complete sentence.

## Contract

- **Every visitor answers 6–8 questions**, with 4–6 multiple-choice questions and exactly two open-ended questions. These are per-visitor limits, not question-bank limits.
- The bank contains 14 definitions to support four distinct branches. Visitors never see the whole bank.
- Start with `q1` and `q2`, both shared multiple choice. Do not enter a branch before both are answered.
- Reclassify the entire active history using native Jev after **every** answer, including both written answers. No offline/weight fallback or visitor role picker. Option weights remain 0–1 editorial routing signals, not calibrated probabilities.
- At the routing gates, follow the branch only when the top Jev probability is **strictly greater than 0.85**. Equality or lower probability follows `next.default`, another shared question until the written pair.
- Every early-selected branch asks two tailored multiple-choice follow-ups. If a fresh classification after the first follow-up exceeds 0.85 for a different role, the second follow-up switches to that role without adding a question.
- Both open answers come last. They can change the final landing; they never start another follow-up cycle.
- After the last written answer, route to exactly one landing using the latest validated Jev choice and `endings`. If the evidence is still uncertain, use that best choice automatically, without pretending uncertainty is measured accuracy.

## Full flow

```text
q1 — What are you trying to do with business data?                 [choice]
 |
q2 — What would be the most useful next step?                     [choice]
 |
 +-- top probability > 0.85 --> SELECTED BRANCH (below) ---------- 6 questions
 |
 +-- otherwise --> q3_shared — Your role in getting data into a deal
                    |
                    +-- top probability > 0.85 --> BRANCH ------- 7 questions
                    |
                    +-- otherwise --> q4_shared — What is already in place?
                                       |
                                       +-- > 0.85 --> BRANCH ----- 8 questions
                                       |
                                       +-- otherwise --> WRITTEN PAIR
                                                         -------- 6 questions

SELECTED BRANCH — two choices, not one:
 AO: q3_AO — What would help assess the archive's value?
       --> q4_AO — Where are you with the review or introduction?
 OS: q3_OS — What do you need to compare in the supplier offer?
       --> q4_OS — How much time do you have to compare it?
 MC: q3_MC — Which different opportunities are you bringing?
       --> q4_MC — What would avoid wasting time or opportunities?
 AP: q3_AP — What makes an opportunity actionable?
       --> q4_AP — What must be checked before accepting a dataset?

 After the first branch question: if a different role now exceeds 0.85,
 switch to that role's SECOND follow-up; otherwise keep the branch default.
 All second follow-ups --> WRITTEN PAIR:
   q4_problem — In your own words, what is holding up your next steps? [open]
       |
   q5_outcome — What would make this worth your time?                 [open]
       |
   latest Jev choice --> AO: landing_AO
                     --> OS: landing_OS
                     --> MC: landing_MC
                     --> AP: landing_AP
```

The shared clarification questions distinguish supplier/buyer authority and actual deal readiness, rather than collecting names, emails or demographic data. The uncertain path still asks four choices plus two written answers. There is no four-question shortcut.

## Why each question is useful

| Question   | Routing or personalization purpose                                                                                            | Evidence in archetypes.md                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| q1         | Separate licensing one's archive, comparing offers, bringing suppliers, and acquiring for downstream buyers.                  | AO/OS/MC/AP definitions; Q01, Q07–Q09, Q10–Q12, Q19–Q20 |
| q2         | Identify the immediate review, comparison, multi-opportunity or qualified-inventory job.                                      | Q02, Q06–Q12, Q18–Q20                                   |
| q3_shared  | Resolve ownership/representation/referral versus acquisition-side authority. Referring companies is not buying their data.    | MC and AP role distinctions; Q12 and AP call discussion |
| q4_shared  | Resolve whether an archive, competing offer, multiple opportunities or buyer requirements already exist.                      | AO/OS/MC/AP observed progress; Q09, Q11, Q18–Q20        |
| q3_AO      | Prioritize archive depth, history/eligibility or a missing handoff; allow an explicit offer-shopping correction.              | Q01–Q06                                                 |
| q4_AO      | Locate the stalled review/introduction step so the CTA conversation can start there.                                          | Q04–Q06 and AO observed progress                        |
| q3_OS      | Identify the supplier's fee, rights, delivery/payment terms or comparable-estimate issue.                                     | Q07–Q09; no universal payment promise                   |
| q4_OS      | Distinguish an actual decision deadline from an open-ended comparison.                                                        | Q08; research only documents urgency for one member     |
| q3_MC      | Separate represented datasets from affiliate introductions or a single archive; allow acquisition-side correction.            | Q10–Q12 and MC ownership caveat                         |
| q4_MC      | Prioritize per-company assessment, reuse of submitted material, referral process or continuity review.                        | Q10–Q12, Q23 and MC implications                        |
| q3_AP      | Identify which inventory, seller ask, corpus or authority requirement makes an opportunity actionable.                        | Q18–Q20, Q24 and acquisition call                       |
| q4_AP      | Personalize acceptance/rights/continuity/delivery requirements without inventing universal buyer thresholds or payment terms. | Q19–Q25 and AP implications                             |
| q4_problem | Capture the actual obstacle and any role correction in the visitor's own words.                                               | Q04–Q06, Q08, Q10–Q15, Q20–Q25                          |
| q5_outcome | Capture desired progress and deadlines, licensing conditions or data requirements.                                            | Archetype jobs and characteristic language              |

## Landing contract

Preserve the latest requested public-experience rules: main-site Navigation/logo/Footer/privacy controls; no eyebrows, visitor-facing archetype labels, notes summaries, research quote blocks or fee/purchase disclaimers. Internal IDs below are not headings.

| Internal ending | Pain-led message                                                                                     | One offer / CTA                                                   | Destination |
| --------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------- |
| landing_AO      | You suspect your archive has valuable stuff, but need to know whether it fits and what happens next. | Archive review / “Discuss my archive”                             | /contact/   |
| landing_OS      | You have an offer on the table and need a comparable estimate with a fair fee and terms.             | Offer comparison / “Discuss my existing offer”                    | /intake/    |
| landing_MC      | You do not want to waste time or opportunities by repeating the same review for several companies.   | Multi-company review / “Discuss my opportunities”                 | /contact/   |
| landing_AP      | You need actionable opportunities, not incomplete inventories or another approval loop.              | Acquisition-fit conversation / “Discuss acquisition requirements” | /contact/   |

These are proposed inquiry offers, not fabricated packages, prices, promised payments or testimonials. Final landing correctness must be checked against independently labeled representative histories—not confidence or a hardcoded role picker.

## Implementation

The runtime now follows this graph, accepts valid 1–8-answer graph prefixes rather than question-ID heuristics, and derives progress totals from remaining graph paths. Quiz version `rancher-quiz-v3-jev` separates the longer flow from the old cohort. Same-origin/16 KiB input limits, written-answer limits, Jev failure/retry gating, back/draft invalidation, saved analytics consent, GPC and staff authentication remain intact.

Metadata-only provider receipts use the existing server operational logger (server request ID, provider request ID if supplied, model, status, latency, validation result and answer count; no answers, tokens or personal identifiers). Optional answer analytics remain subject to saved consent. New receipts cannot retroactively prove old calls.

## Verification

```sh
node docs/quiz-revision/quiz_map.check.mjs
```

The checker enumerates every structural graph path, including cross-role second follow-ups, and rejects cycles, missing destinations, malformed weights, fewer than six or more than eight questions, anything other than two open answers, or fewer than four choices. It checks graph conformance only; it does **not** prove Jev classification accuracy or live provider calls.
