# Calculator audit — September 12, 2026

Rancher now reproduces the public Handshake AI payout calculator. The former power-law model was fictional, rounded to thousands, and ignored country. Those behaviors have been removed. This verifies agreement with a public calculator, not the accuracy of future commercial payouts.

## Source comparison

| | Handshake AI | Troveo |
| --- | --- | --- |
| Source | https://joinhandshake.com/ai/data-partnerships/ | https://www.troveo.ai/business-data |
| Model | Indicative payout | Four projected dataset sales in year one |
| Employees | Integer slider: 20–200+ | Five steps: 20, 100, 250, 500, 1,000+ |
| History | Integer slider: 3–20+ years | Under 3, 3–7, 8–15, 15+ |
| Geography | USA 1.00; Canada 0.75; Europe 0.75; Other 0.30 | No region input or multiplier in the public estimator |
| Default | 100 employees, 10 years, USA: $383,083–$896,969 | 100 employees, 8–15 years: $800,000–$1,000,000 |

These are different estimates; combining Troveo's four-sale factor with Handshake's payout model would create an unsupported hybrid. Handshake matches Rancher's existing employee/history/region controls, so it is the implemented benchmark. Troveo was audited for comparison only.

Handshake's live component is [DataAcq_PricingCalculator.DxUX1z4J.mjs](https://framerusercontent.com/sites/7czOuVWubrZgDbKkjXobrH/DataAcq_PricingCalculator.DxUX1z4J.mjs). Troveo's model is module 22950 in [14j0mgr006maa.js](https://www.troveo.ai/_next/static/chunks/14j0mgr006maa.js?dpl=4ab42af2f546b3361c819c15e474658a7ee67347). These public asset URLs can change on deployment. Local research snapshots are in ignored `.firecrawl/`; committed observations preserve the reviewed behavior.

## Implemented Handshake calculation

Let `E` be employees, `Y` years, and `R` the region factor. Inputs are restricted to the source's supported domain; unsupported values throw rather than silently extrapolate.

1. Base: `140000 + 2333 × E + 11667 × Y`.
2. Lower data volume in TB: `max(0.1, E × Y / 1000)`.
3. Upper data volume in TB: `max(0.2, 14 × E × Y / 1000)`.
4. Lower intermediate amount: round `0.75 × (base + lowerTB × 1000 × 15.75) × R`.
5. Upper intermediate amount: round `1.25 × (base + upperTB × 1000 × 15.75) × R`.
6. Apply the source's uplift to each rounded intermediate amount: `max(amount + 1, ceil(amount × 1.01))`.
7. Subtract `69102 × R × max(0, (50 − E) / 30)` from the uplifted lower amount and round again.

The order of rounding is deliberate. Multiplying the final USA output by a regional factor can differ by a dollar from the source.

| Region | Factor | 100 employees / 10 years |
| --- | ---: | ---: |
| USA | 1.00 | $383,083–$896,969 |
| Canada | 0.75 | $287,313–$672,727 |
| Europe | 0.75 | $287,313–$672,727 |
| Other | 0.30 | $114,925–$269,091 |

All figures are USD. These are the source's commercial modeling factors, not currency exchange rates or legally required geographic discounts.

### Display rules

- When the calculated lower bound is below $100,000, Handshake replaces both bounds with **Up to $100,000**. Rancher reproduces this display rule. This is a presentation threshold, not a mathematical cap on the computed upper bound, which can exceed $100,000 in those cases.
- When both sliders are at their maxima (200 employees and 20 years), the upper number gains a `+`. USA at that point is $683,978–$2,173,950+.
- The source evaluates `200+` as 200 and `20+` as 20. Rancher uses those same limits, replacing its previously unsupported 1,000 employee and one-year endpoints.
- The form displays the selected scenario using the same formatter as the calculator; the server recalculates its estimate before saving the inquiry. At 200+, the actual team-size band is left for the user to select because the cap cannot distinguish a 250-person company from a 1,000-person company.

## Troveo comparison

Troveo uses a $200,000 per-sale baseline and employee factors of 0.5, 1, 1.5, 2, and 3 at its five employee steps. Its history bands apply separate lower/upper factors:

| History band | Low | High |
| --- | ---: | ---: |
| Under 3 | 0.5 | 0.75 |
| 3–7 | 0.75 | 1 |
| 8–15 | 1 | 1.25 |
| 15+ | 1.25 | 1.5 |

Each per-sale estimate is clamped between $40,000 and $2,000,000, multiplied by four, then rounded to its display increments (including $25,000 increments below $1M and $100,000 increments at/above $1M). The supported scenarios range from $200K–$300K (20 employees, under 3 years) to $3M–$3.6M (1,000+, 15+ years). In the inspected implementation, the `systems` input is not used by the estimate function, despite the surrounding description mentioning systems. No regional factor is present. We did not add unsupported system or regional adjustments to this comparison.

## Verification

- Compared 60 live Handshake observations: five employee sizes (20, 35, 50, 100, 200), three histories (3, 10, 20), all four regions. Captured after client hydration. All match the replacement formula, including small-company adjustments and threshold cases.
- Verified all 20 Troveo step/band combinations in a live browser. Observations are in `troveo-calculator-observations.json` beside this document.
- `tests/fixtures/handshake-calculator.json` stores the independent live outputs. Both pure-function and browser tests use them instead of recalculating expectations with a copy of the implementation.
- Tests also cover invalid inputs, submission and calendar handoff, mobile overflow, server rendering, and the rest of the site's existing interactions.

The public benchmarks can change. Update this audit and recapture observations before changing the constants. Rancher's UI identifies this as an indicative benchmark; it makes no claim of affiliation, an offer from Handshake, or guaranteed earnings.
