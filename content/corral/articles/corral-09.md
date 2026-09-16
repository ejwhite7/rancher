# Can support tickets be licensed for AI training?

Support tickets may be candidates for AI licensing when the company can establish the relevant authority, define a permitted scope and document records that suit a recipient’s intended task. A ticket archive is not automatically a usable or transferable dataset. Customer obligations, free text, attachments, missing context and unreliable closure labels all need attention before a proposed sample or delivery.

## Start with the task, not the ticket count

A recipient interested in support records may be considering different tasks: classifying an incoming issue, suggesting a next action, reconstructing a workflow or evaluating whether a proposed response is appropriate. Each task requires different information. Ask which decision the records are meant to support and what evidence would demonstrate usefulness. A large number of tickets does not answer those questions by itself.

Define the unit being offered. Is it a complete case, an individual message, a sequence of actions or a set of structured fields? Explain whether the material contains the initial issue, later escalations and a documented outcome. If only the final state is available, avoid describing the export as a complete support journey. The data dictionary should make those boundaries understandable before the recipient begins interpreting the records.

## Separate the useful structure from unrestricted text

Structured fields can describe issue categories, event times, action types, routing decisions and closure states. Message bodies and attachments can add context, but they can also contain [customer confidential information](/glossary/confidential-business-information/), personal information or material copied from other sources. Treat them as separate categories in the proposed scope. Do not assume that exporting a ticket grants permission to use every component it contains.

Identify internal notes, external messages, attachments and embedded references explicitly. Some systems distinguish them clearly; historical exports may not. Record what the source can actually separate and what remains uncertain. If an exclusion cannot be enforced reliably, change the candidate scope rather than relying on a general promise to remove sensitive content later. The first assessment can remain metadata-only while those implementation questions are investigated.

## Fictional ticket-to-resolution sequence

| Time and case | Recorded event | Interpretation limit |
| --- | --- | --- |
| 09:00 · CASE-014 | Issue category recorded | Category meaning needs a documented definition |
| 09:12 · CASE-014 | Assigned to specialist queue | Assignment is not evidence of immediate review |
| 10:05 · CASE-014 | Linked to ISSUE-031 | A relationship is recorded, not proven causation |
| 11:20 · CASE-014 | Action code changed to workaround | Action text is outside this illustrative scope |
| Next day · CASE-014 | Status changed to resolved | Resolution requires an explained label policy |

## Describe the chain of events in a fictional case

Consider the invented case CASE-014. An issue is opened, routed to a specialist, connected to ISSUE-031 and later marked resolved. The table below shows a minimal illustrative chain, not a real customer record. Stable fictional identifiers make the relationships visible without implying that a company has already reconstructed comparable histories from its systems.

Ask what each event proves. A routing event shows a recorded assignment, not that the assignee read the case immediately. A linked issue shows a recorded relationship, not that the issue caused the customer’s problem. A resolved status shows a state change whose meaning must be explained. The dataset becomes more understandable when these distinctions are documented rather than replaced with a story about what the support team must have thought.

## Review customer obligations and linked material

Locate the agreements and arrangements relevant to the proposed records and use. Customer confidentiality, restrictions on [onward sharing](/glossary/onward-sharing/) and the origin of attached material may affect the scope. A support organization’s operational access is not the same as authority to license the content for an external AI task. The review needs a defined recipient and purpose, not just the general phrase business data.

Pay attention to records that cross organizational boundaries. A ticket may include a vendor’s instructions, a customer’s internal document or messages involving several entities. Removing obvious names does not resolve those questions. Identify the categories, evidence references and responsible reviewers. Where the history contains different contract versions or acquired systems, record those distinctions rather than assuming one permission applies uniformly to the whole archive.

## Treat resolution as a label that needs evidence

A closure field may reflect a solved problem, an abandoned conversation, a duplicate case or an administrative cleanup. Determine how the source system uses the field and whether that meaning changed over time. If the intended task depends on successful resolution, identify the evidence that supports that interpretation. A convenient status code should not silently become a stronger outcome label in the delivered documentation.

Include exceptions such as reopened cases, transferred cases and missing final events in the [quality](/glossary/data-quality/) review. Explain how they are represented or excluded. Removing every difficult case can make the remaining collection easier to handle while changing what it represents. The recipient should know the selection rule and its consequences. Do not claim a success rate or improvement metric from an illustrative schema or a limited preparation exercise.

## Check history, joins and duplication

Evaluate whether events can be connected consistently across the proposed period. Case merges, migrations, changed identifiers and duplicate imports can affect a [workflow trajectory](/blog/workflow-trajectory/). Document the join rules and distinguish a confirmed relationship from an inferred one. If a link is unavailable for part of the history, report that coverage limit rather than filling the gap with an assumption.

Consider whether multiple rows describe the same underlying exchange. A message may appear in an email export, a ticket event and a linked issue discussion. Those copies can affect counts and the separation of training and [evaluation data](/glossary/evaluation-data/). The appropriate deduplication and split policy depends on the intended use, but the existence of overlapping representations should be visible. A recipient cannot make an informed assessment if copied events are presented as independent cases.

## Decide what can be discussed next

A useful initial conversation can describe record categories, historical coverage, field meanings and known restrictions without sending ticket content. If there is a plausible fit, define the questions that a separately reviewed sample would need to answer. Agree the handling arrangements before preparing that sample. A small file can still contain the very material that the initial [exclusions](/blog/ai-training-data-exclusions/) were meant to protect.

The downloadable schema is an editable starting point for documenting a candidate scope. It does not imply a Rancher connection to Zendesk, Intercom or another platform, and it does not establish that a particular archive qualifies. The next decision may be to clarify labels, narrow the scope, investigate rights or stop. Treat those outcomes as legitimate results of an assessment rather than obstacles to a promised transaction.

## Before you move forward

- Define whether the unit is a message, event or complete case.
- Separate text and attachments from structured fields.
- Document closure meanings and reopened-case handling.
- Keep fictional examples distinct from evidence about real inventory.

## Sources and scope

The ICO explains that pseudonymised personal data remains subject to data-protection law in the UK. NIST describes the AI Risk Management Framework as intended for voluntary use. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [Pseudonymisation | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)
- [AI Risk Management Framework - NIST](https://www.nist.gov/itl/ai-risk-management-framework)

[Discuss support-record eligibility](/contact/)
