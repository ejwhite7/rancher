# Rancher seller-prospect quiz

## Audience and purpose

**Rancher is the buyer. Visitors are sellers or people representing/introduction-routing sellers.** This funnel qualifies business data that they own or are authorised to offer to Rancher. It does not prospect downstream buyers or acquisition partners.

The 2026-10-08 seller-only correction supersedes the four-route v4 quiz. AO (one-business seller), OS (seller comparing offers), and MC (several seller businesses/introductions) remain. AP is removed entirely from the active map, shared choices, follow-up questions, landings, native Jev criteria and normalized response contract—not renamed, hidden, or heuristically mapped to a seller. All-contact research is unchanged; research categories are not automatically eligible funnel audiences.

## Eight questions per visitor

Every path has **eight questions: six multiple-choice and exactly two free-form**. There are 14 definitions and 10 structural paths, including fresh seller-role corrections. Eight satisfies the 6–8 limit while collecting the requested qualifying information.

```text
1. What would you like to do with your business data?          [choice]
   Sell/license my business's data to Rancher / compare an existing offer /
   represent or introduce several seller businesses / not sure yet
   |
2. Which describes where you are in the process?              [choice]
   Exploring / understanding value and terms / preparing to seek offers /
   existing open offer / several seller businesses / unsure where to start
   |
3. Can you describe your relationship to the business(es)?    [choice]
   Owner / director or executive / employee researching for leadership /
   advisor or representative / seller introducer / another relationship
   |
4. What is your motivation for seeking a licensing agreement? [choice]
   Cash flow / expansion / retirement / legacy / shutting down /
   understand the opportunity / another reason
   Several-business representatives also have referral/advisory income.
   |
5. How much are you hoping to receive in a transaction?       [choice]
   USD expectation bands / no target yet / prefer to discuss
   This seller question applies to both shared and tailored paths.
   |
6. How quickly are you hoping to make a decision?             [choice]
   Within 2 weeks / 2–4 weeks / 1–3 months / more than 3 months / no deadline
   |
7. Does your dataset contain any unique, sensitive, or
   hard-to-obtain data that may be useful?                    [free-form]
   Describe characteristics of data owned/represented, not underlying records.
   Do not include personal information or confidential records.
   |
8. Is there anything in particular that you would like to discuss? [free-form]
   Existing open-offer terms and deadlines, if relevant; otherwise questions
   or “Nothing specific”. This is not a third free-form answer.
   |
Latest validated native Jev prediction --> landing_AO / landing_OS / landing_MC
```

## Native inference and role corrections

Classify the complete active readable history after every answer, including both original free-form answers. Rancher’s buyer role is explicit in provider state/instructions. Native Choice criteria contain only AO/OS/MC. Both server and browser reject an AP choice or AP probability field. There is no buyer landing, acquisition budget, offline classifier, weight/keyword override, or manual role picker.

The two shared opening questions always precede branching. Fresh top probability **strictly >0.85**, not confidence or rounded values, selects seller-specific relationship/motivation/amount wording. Otherwise the default/shared seller question occupies that same position. Corrections can change later seller wording or the final seller landing, never add/repeat questions. Potential uses of supplied data in AI, research or buyer products do not imply a buyer prospect. Financial motives, amounts and urgency are neutral editorial qualification signals, not deterministic seller-route rules. Written answers remain last.

## Presentation, amount bands and preserved protections

Every choice list uses Fisher-Yates randomization after hydration, once per question per visit. There are no selection numbers. Canonical IDs/labels/weights stay unchanged during random display; order and selection persist on Back/retry. New visits generate new permutations; identity permutations are valid random outcomes.

USD bands: below $10k; $10k–less than $50k; $50k–less than $100k; $100k–less than $500k; $500k+; no target; prefer to discuss. These and the user-requested cash-flow/expansion/retirement/legacy/closure motives are qualification design choices, not research quotes, Rancher prices, valuations, payment promises or guarantees.

The exact site Navigation/logo/Footer/privacy controls, one question per screen, accessible fields, Back/progress, graph-prefix validation, eight-answer maximum, 16 KiB JSON limit, 2,000-character free-form limits, validated fresh inference/retry gating, saved analytics consent/GPC/withdrawal and metadata-only operational receipts are preserved. `rancher-quiz-v5-sellers-jev` isolates the seller-only cohort. Current staff labels accept only AO/OS/MC; historical events are not rewritten.

OS opens `/intake/`; AO/MC open `/contact/`. No answers or model/session identifiers appear in URLs. No public archetype labels, notes summary, research quote blocks, fabricated testimonials, commercial packages or purchase claims are added.

## Checks and evidence limits

`node docs/quiz-revision/quiz_map.check.mjs` enumerates all 10 structural paths and requires eight questions, six choices and the dataset/discussion free-form pair last. Router/server tests exercise every path and prefix. Prospect regression tests scan all active questions/options/landings for acquisition/budget content; provider contract tests assert Rancher is the buyer, exactly three criteria, and reject buyer-category responses. Staff-label tests reject AP. Chromium checks all three seller landings, uncertain seller defaults, randomization/no numbers, Back/retry/drafts, written seller-role corrections, malformed responses, duplicate submissions, intake, responsive layouts and consent/withdrawal/GPC.

Tests use mocked Jev and intercepted analytics. Neither path tests nor code health establishes live-provider accuracy or historical inference calls. Configuration-only readiness does not contact Jev.
