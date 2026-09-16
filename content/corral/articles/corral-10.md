# What is a workflow trajectory?

A workflow trajectory is an ordered, connected account of events and state changes around a task or case. It can preserve context that an isolated record lacks, but it does not automatically reveal human reasoning or prove that the final outcome was successful. A useful trajectory documents identifiers, ordering, joins, missing events and outcome definitions, with clear boundaries between observed facts and interpretation.

## Distinguish a sequence from a collection of rows

An isolated ticket, message or issue can describe one part of an activity. A trajectory attempts to connect relevant parts into a sequence around a defined task. The unit might be a support case, a sales process or an engineering change. Define that unit before joining records. Otherwise, a technically valid merge can combine events that do not belong to the same business activity.

The sequence needs more than timestamps. Identify which fields establish relationships, what the events mean and how changes in state are represented. A later event may refer to an earlier one without being caused by it. Two events close in time may be unrelated. Documentation should distinguish a recorded link from a proposed interpretation so a recipient can assess how much context the reconstructed history actually preserves.

## Give identifiers a specific job

Use a stable case identifier to group events that belong to the same case, and separate event [identifiers](/blog/preserve-workflow-context-privacy/) to distinguish individual observations. If a trajectory crosses systems, document the relationship between source identifiers. Explain whether the join comes from an explicit field, a maintained mapping or an inference. These methods do not provide the same evidence, and the difference should survive into the dataset documentation.

In the fictional example below, CASE-014 links to ISSUE-031 through an explicit recorded relationship. EVENT-01 through EVENT-05 identify observations. Those identifiers are invented solely to explain the structure. They do not represent available Rancher inventory. A real preparation process would also need to consider whether the identifiers or their retained relationships create privacy or confidentiality risks in the proposed release context.

## Synthetic cross-system trajectory

| Event and time | Observed record | State or limitation |
| --- | --- | --- |
| EVENT-01 · 09:00 | CASE-014 assigned category access issue | Initial category only |
| EVENT-02 · 09:12 | CASE-014 routed to specialist queue | Assignee review time unknown |
| EVENT-03 · 10:05 | CASE-014 explicitly linked to ISSUE-031 | Relationship recorded; causation unverified |
| EVENT-04 · 11:20 | CASE-014 records workaround action | Message content intentionally omitted |
| EVENT-05 · next day | CASE-014 changes to closed | Closure is not independently verified success |

## Preserve ordering without inventing precision

Record the meaning and source of each timestamp. A creation time, ingestion time and last-modified time can describe different events. If sources use different time zones or precision, document how ordering was established. Do not manufacture an exact sequence when the available evidence only supports a partial order. Tied times and missing timestamps should have an explicit treatment.

Consider a case where a batch import makes several old events appear to have happened at the same time. Sorting by that field would produce a misleading account of the workflow. The right response might be to use another documented field, preserve an uncertain ordering or exclude the affected sequence from a task that needs exact order. The choice should be based on the intended use and recorded as a limitation.

## Separate actions, states and outcomes

An action is something recorded as having been done, while a state describes the case at a point in the process. An outcome is the result being used for the task, with its own definition and evidence. A status change to closed may be an action and a state transition without proving that the underlying customer problem was solved. Explain which interpretation the data supports.

If a trajectory ends after an escalation, record the missing result rather than labeling the case unsuccessful or successful by default. If a reopened case appears later, decide whether it belongs to the same trajectory and document that rule. [Outcome labels](/glossary/outcome-labels/) should not be stronger than their supporting evidence. This distinction matters when a recipient uses the records to evaluate behavior or learn relationships between actions and results.

## Read the synthetic example with its limits

The invented sequence begins with a category assignment, proceeds through specialist routing and a linked issue, then records a workaround and a closure state. It illustrates an event chain, not a claim that the workaround caused the closure. The example omits message contents and attachments, and it does not provide a verified measure of customer satisfaction. Those omissions are part of the description.

Now imagine EVENT-03 is missing. A reader may see routing followed by a workaround without knowing about the linked issue. The trajectory still contains observations, but a causal story would be less supported. Imagine instead that the final event belongs to another case because of a faulty join. The sequence would be structurally tidy and substantively wrong. Testing missing-context and incorrect-join cases is therefore part of making the representation credible.

## Do not confuse recorded history with reasoning

A sequence can show that an action followed an observation without showing why a person chose it. A note may provide a stated explanation, but that explanation is itself a recorded artifact with a source and context. Do not fill unobserved reasoning with fluent prose and present it as ground truth. Keep any synthetic explanations clearly separated from observed records.

The same caution applies to labeling a trajectory as an expert demonstration. The role, competence and decision [quality](/glossary/data-quality/) of the participant require evidence beyond the existence of an action log. For some tasks, an imperfect or failed workflow may be useful if it is accurately described. The dataset should make its limitations legible rather than turning every sequence into an example of correct behavior by assumption.

## Document selection and intended use

Define how trajectories enter the candidate dataset. Requiring complete outcomes, for example, may exclude long-running or difficult cases and change the represented population. Record the selection rule, coverage and known omissions. A recipient needs that context to assess whether the collection suits training, evaluation or another permitted purpose. A sequence suitable for one task may be misleading for another.

Use the downloadable event table to discuss structure before exchanging real records. Add references to the source definitions, join policy, timestamp policy and label policy. If the required context cannot be reconstructed or safely included, revise the task or stop the proposal. A [workflow trajectory](/glossary/workflow-trajectory/) is a representation that needs validation, not a quality certificate and not an assurance that a buyer will accept the resulting dataset.

## Before you move forward

- Define the case unit before joining source records.
- Explain timestamp meaning and uncertain ordering.
- Distinguish recorded links from inferred relationships.
- Keep outcome labels and claims about reasoning tied to evidence.

## Sources and scope

NIST describes the AI Risk Management Framework as intended for voluntary use. The scikit-learn documentation warns that allowing test data to influence model development can produce overly optimistic results. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [AI Risk Management Framework - NIST](https://www.nist.gov/itl/ai-risk-management-framework)
- [scikit-learn — Common pitfalls and recommended practices](https://scikit-learn.org/stable/common_pitfalls.html)

[Discuss a possible workflow dataset](/contact/)
