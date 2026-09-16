# How to review AI dataset quality

Dataset quality is fitness for a defined use, supported by evidence about the records and their limitations. A useful checklist covers completeness, duplicates, label reliability, coverage, provenance, joins and leakage. The checks below are illustrative: acceptance thresholds must be agreed for the recipient’s task, and no checklist by itself establishes licensing rights, privacy clearance or a guaranteed model improvement.

## Specify the unit and the intended decision

Quality checks need a denominator and a purpose. Define whether one unit is a case, event, message, document or [trajectory](/blog/workflow-trajectory/). Then explain what the recipient intends to do with those units. A missing final event may be critical for one evaluation task and irrelevant to a task using only initial categories. Without that context, a generic completeness percentage can look precise while answering the wrong question.

Write the proposed acceptance questions in operational terms. For example, can each retained event be assigned to a defined case, and can the recipient interpret the outcome field? These are more useful starting points than describing the file as high [quality](/glossary/data-quality/). Identify which checks can be automated, which need human interpretation and which cannot be completed from the available evidence. Preserve those distinctions in the review report.

## Measure missingness where it matters

Distinguish an empty field, an unavailable observation and an event that did not occur. These conditions can look similar in an export but have different meanings. Document the source conventions and check whether they remain consistent across time and record categories. A default value inserted during preparation should not be mistaken for an observed fact merely because it fills a previously empty cell.

Inspect complete units rather than only columns. A trajectory may contain every required field on each row yet still be missing an important intermediate event. Conversely, a field may legitimately be absent for a particular category. Define the expected structure for the task, record exceptions and explain any exclusions. Do not improve a reported completeness figure by silently removing difficult cases without documenting the resulting selection.

## Illustrative quality-review scorecard

| Check | Example acceptance question | Evidence to record |
| --- | --- | --- |
| Completeness | Does each retained unit contain the context needed for this task? | Field meanings, missing-event rules and exceptions |
| Duplicates | Can repeated or overlapping cases cross a split boundary? | Methods, grouping rules and unresolved overlap |
| Labels | Does each outcome mean what the documentation claims? | Label source, definitions and disagreement policy |
| Coverage | Which periods and cases are absent or underrepresented? | Selection rules and known collection changes |
| Provenance | Can the delivery be traced to sources and transformations? | Version references and preparation record |
| Leakage | Did held-out information influence development choices? | Split policy and known prior use |

## Investigate duplicates and overlapping representations

Look for repeated records and for different records that describe the same underlying event. Imports, synchronization and cross-system exports can create overlapping representations. Exact matching may identify some duplicates while missing reformatted or partially copied content. State which methods were used and which kinds of overlap remain uncertain. Deduplication is a preparation decision that should be traceable.

Consider the effect on counts and dataset splits. If one case appears in both training and [evaluation](/blog/training-vs-evaluation-data-licensing/) material through different exports, a recipient may receive a misleading picture of generalization. The relevant grouping may be a case, customer, document family or another unit determined by the task. Do not assume that splitting rows independently is sufficient simply because every row has a unique identifier.

## Check labels against their supporting evidence

An outcome label should have a documented meaning and a source. Determine whether it reflects an observed result, an administrative state, a later annotation or an inference. Those categories should not be blended without explanation. A closed case is not automatically a successful resolution, and a merged issue is not automatically evidence that the underlying problem was fixed.

Review ambiguous, contradictory and changed labels. Record how disagreements are handled and whether the labeling convention changed during the proposed history. If a sample is used for review, describe its scope and selection rather than presenting it as proof about every record. The goal is a proportionate account of label reliability for the intended task, including cases where the available evidence does not support a confident label.

## Examine coverage and provenance together

Coverage describes which populations, periods, processes and conditions are represented. Provenance describes where the material came from and how it was transformed. Read them together. A historical migration, a changed collection rule or an excluded source can explain a gap that would otherwise look like a real change in behavior. A dataset should make those events visible to the reader.

Ask whether the selection is aligned with the intended use. A collection containing only completed, well-documented cases may be useful for some purposes while failing to represent unresolved or difficult cases. Do not treat a larger file as more representative without evidence. Record the boundaries, including known omissions and uncertain source history, so the recipient can decide whether the collection supports its particular question.

## Guard the boundary between development and evaluation

Evaluation material should not quietly influence the decisions being evaluated. Document how records are assigned to development and held-out sets, and consider related records or later versions that could cross the boundary. The appropriate policy depends on the task, but it should be decided and recorded before the evaluation result is treated as independent evidence.

The scikit-learn guidance cited below gives a concrete example: preprocessing choices learned from test data can produce overly optimistic estimates. More generally, keep the information used during preparation and model development visible. A split label on a file is not sufficient if related content has already been used elsewhere in the process. Record known prior use and uncertainty rather than promising that contamination is impossible.

## Turn the scorecard into an acceptance discussion

For each check, record the method, result, scope, limitations and responsible owner. Add a threshold only when the parties have a reason for that threshold and agree how it will be evaluated. The illustrative table deliberately provides questions rather than universal pass marks. A dataset that fails a particular task’s requirements might still support a narrower use, but that needs a new assessment rather than a cosmetic relabeling.

Keep rights, privacy and security decisions separate from the quality scorecard. A technically useful dataset can still be inappropriate to transfer, and a permitted scope can still be unhelpful for the proposed task. The final decision should bring these findings together without substituting one for another. Use the downloadable worksheet to preserve the evidence and decide whether to proceed, revise the scope or stop.

## Before you move forward

- Agree the task and unit before interpreting quality metrics.
- Document exclusions and their effect on representation.
- Keep label strength proportionate to its evidence.
- Use task-specific thresholds rather than invented universal standards.

## Sources and scope

The scikit-learn documentation warns that allowing test data to influence model development can produce overly optimistic results. NIST describes the AI Risk Management Framework as intended for voluntary use. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [scikit-learn — Common pitfalls and recommended practices](https://scikit-learn.org/stable/common_pitfalls.html)
- [AI Risk Management Framework - NIST](https://www.nist.gov/itl/ai-risk-management-framework)

[Discuss dataset requirements](/contact/)
