# Rancher new-prospect quiz

## Current purpose

This quiz is for people who are **new to Rancher**, not people following up on an introduction, inventory, review, or onboarding. The questions qualify the prospect's business relationship and authority, process stage, motivation, transaction expectations, decision timing, and data characteristics.

The 2026-10-08 user-directed revision supersedes the previous archive-review and introduction-status questions. The motivation categories, timing choices, and USD expectation bands are **qualification design choices requested by the user**, not quotes or observed statistics from `archetypes.md`. USD and the amount boundaries are editable defaults, not Rancher pricing, valuation promises or guaranteed proceeds. The research remains the source for AO/OS/MC/AP role distinctions and landing offers.

## Per-visitor contract

Every path has **eight questions: six multiple-choice and exactly two free-form**. Eight is within the requested 6–8 limit and leaves room for all the requested qualification topics. Seventeen definitions support 33 structural paths, including later role corrections. There are no extra clarification questions that push a visitor beyond eight.

```text
1. What are you trying to do with business data?                  [choice]
   Licensing own records / comparing offers / several companies / acquiring
   |
2. Which describes where you are in the process?                  [choice]
   Exploring / understanding value / preparing to compare / open offer /
   several businesses / evaluating for buyers / unsure
   |
3. Relationship to the business or businesses                    [choice]
   Owner / executive / employee / advisor / representative / introducer
   Acquisition branch: decision-maker / evaluator / sourcing / buyer agent
   |
4. Motivation                                                   [choice]
   Suppliers: cash flow / expansion / retirement / legacy / shutting down /
              exploring / another reason
   Multi-company: these business goals plus referral/advisory income
   Buyers: product / AI / research / downstream requirements / coverage
   Uncertain: neutral data-transaction motivation
   |
5. Transaction amount                                           [choice]
   Supplier: How much are you hoping to receive in a transaction?
   Buyer: What budget do you have in mind for a data acquisition?
   Uncertain: What transaction value do you have in mind?
   |
6. How quickly are you hoping to make a decision?                 [choice]
   Within 2 weeks / 2–4 weeks / 1–3 months / more than 3 months / no deadline
   |
7. Does your dataset contain any unique, sensitive, or
   hard-to-obtain data that may be useful?                       [free-form]
   Describe categories and characteristics, not underlying records.
   Buyers can describe the data they need.
   |
8. Is there anything in particular that you would like to discuss? [free-form]
   If there are existing open offers, describe their terms and deadline here.
   Otherwise discuss questions/topics, or write “Nothing specific”.
   |
Latest validated Jev result --> landing_AO / landing_OS / landing_MC / landing_AP
```

The offer-terms prompt is conditional within the final discussion answer, not a third free-form question. People can be new to Rancher while having an offer from another provider.

## Native classification and branching

- Reclassify complete active readable history with native Jev after **every answer**, including both free-form answers. No weights, keyword scoring, previous predictions, or manual role picker replace Jev.
- Both opening questions precede branching. At the relationship, motivation and amount gates, follow a role branch only when the latest top probability is **strictly greater than 0.85**. Otherwise use the shared/default question at that same position.
- Fresh explicit role corrections can change later question wording or the final landing, but never add/repeat questions. Both free-form questions remain last.
- Money, timing and financial motivation are qualification details, not deterministic archetype signals. Their editorial weights are neutral. Demographics, monetary targets, retirement or closure must not override who is supplying, representing or acquiring the data.
- Uncertain histories still complete automatically with Jev's latest best choice. Confidence/probability is not independently measured classification accuracy.

## Option presentation

All multiple-choice lists use Fisher-Yates randomization **after hydration**, once per question per visit. The display contains no ordinal numbers. Canonical IDs, labels and weights stay unchanged; selection, back navigation and retries retain the same order and answer ID. A new visit generates new permutations. An identity permutation is a valid random outcome, not an error.

## Amount choices

USD: less than $10,000; $10,000 to less than $50,000; $50,000 to less than $100,000; $100,000 to less than $500,000; $500,000 or more; no target yet; prefer to discuss. These are non-overlapping selectable expectation/budget bands. They do not assert what any dataset is worth.

## Preserved contracts and verification

The exact site Navigation/logo/Footer/privacy controls, one question per screen, accessible labels, back/progress, failure/retry gating, eight-answer graph-prefix server validation, 16 KiB input cap, 2,000-character free-form limits, saved analytics consent/GPC, and metadata-only operational receipts remain in place. Cohort version `rancher-quiz-v4-jev` separates the new questions from earlier meanings and IDs.

Four inquiry offers remain: archive review (AO), existing-offer comparison (OS), multi-company review (MC), and acquisition-fit conversation (AP). OS opens `/intake/`; the others open `/contact/`. No answers or model/session identifiers enter CTA URLs. No public archetype labels, fabricated testimonials, prices, packages or payment claims.

```sh
node docs/quiz-revision/quiz_map.check.mjs
```

The checker enumerates every structural path and requires eight questions, six choices, the two opening shared questions, and the dataset/discussion free-form pair last. Router/server tests exercise all 33 paths and every prefix. Additional tests check prospect-focused copy, every motivation category, neutral money/timing/motivation weights, shuffle correctness and canonical identity. Browser checks verify random display, stable order/selection on Back, failure/retry behavior, corrected question sequence, four landings, written corrections and consent. These checks use mocked Jev and do **not** establish real-provider accuracy or historical inference calls.
