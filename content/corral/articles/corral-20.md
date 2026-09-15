# A practical data-card template for AI buyers

A data card is a structured description of a dataset and the conditions for evaluating or using it. Record its origin, version, scope, transformations, exclusions, limitations, split policy and permitted uses. The card supports review; it is not proof of ownership, consent, anonymity, quality or commercial availability.

## Document the decision a buyer needs to make

A buyer needs to understand what the records represent, what is missing and what uses are permitted before deciding whether evaluation makes sense. A table of column names alone cannot establish that. Organize the card around questions that can be answered with evidence, and name an owner for unresolved items.

NIST’s AI Risk Management Framework is a voluntary reference for incorporating trustworthiness considerations into AI work. The template here is an original practical aid, not an official NIST form or a claim of compliance. Adapt it to the actual dataset, buyer requirements and specialist advice.

## A practical data-card structure

| Section | What to record | Evidence to reference |
| --- | --- | --- |
| Identity and origin | Dataset name, version, owner and source systems | Inventory and version record |
| Authority and allowed uses | Reviewed scope of permissions and unresolved limits | Applicable agreements and approval record |
| Coverage and history | Dates, categories, inclusion rules and known gaps | Collection history and field definitions |
| Transformations | Filtering, joining, pseudonymisation and other changes | Versioned transformation record and validation |
| Exclusions | Removed records, fields and attachments, with reasons | Approved exclusion list |
| Quality and limitations | Missingness, duplicates, label reliability and known biases | Checks, results, exceptions and review owner |
| Split policy | Training/evaluation separation and leakage controls | Split definition, grouping keys and overlap checks |
| Handling and contact | Access, transfer, retention and responsible contact | Agreed controls and named accountable owner |

## Use the blank template before discussing a sample

The downloadable CSV contains prompts and empty response fields. Keep sensitive material out of the card: describe a category rather than attaching records, include an evidence reference rather than credentials, and use an accountable contact rather than an unrestricted system login. Record “unknown” where a fact has not been established.

For each answer, include an evidence location, responsible role and review state. A concise, bounded answer is more useful than a confident claim with no supporting record. If permissions have not been reviewed, say so explicitly; do not turn “not yet checked” into “unrestricted.”

## Fictional example only

The example below is invented for explanation. It is not a Rancher customer, available dataset, completed assessment or statement of licensing eligibility. It contains no real customer records.

## Fictional filled example

| Field | Illustrative entry | Limit that still needs review |
| --- | --- | --- |
| Dataset identity | Fictional Support Events v0.1 | Training use is not approved |
| Origin | Invented issue and resolution events from Fictional Company A | No real system or integration is represented |
| Coverage | Fictional cases CASE-001 through CASE-006 | Small invented sample; no claim of representativeness |
| Transformations | Invented names replaced by stable fictional actor IDs | This demonstrates linkage, not validated anonymisation |
| Exclusions | Message text and attachments omitted | Omission can remove relevant context |
| Outcomes | Resolved, reopened or unresolved as stated in the fictional events | A status is not proof that the customer’s problem was solved |
| Split policy | Keep events for each fictional case in a single split | Production grouping and leakage tests remain unspecified |
| Allowed use | Review this illustration only | No underlying operational dataset is offered |

## Preserve the difference between evidence and interpretation

A field named “resolved” might record an agent action, an automated close rule or a confirmed customer outcome. State which interpretation is supported by the source and which remains an assumption. Similarly, an event timestamp might reflect creation, update or ingestion. The card should define those meanings rather than leave a buyer to guess.

Describe known missingness and selection effects. If the proposed scope contains only completed cases, a buyer should not infer that it represents unresolved work. If attachments were removed, explain which parts of the workflow can no longer be reconstructed. These limitations may affect suitability even when the remaining records are internally consistent.

## Treat transformations as reviewable changes

List transformations in order, with their purpose, version and validation evidence. A stable replacement ID may preserve joins while creating linkage risks across records. The ICO’s UK guidance explains that pseudonymisation does not make personal data anonymous. Do not mark a privacy field “safe” merely because direct names were removed.

Document who reviewed the residual risk for the intended recipients and context. A card can point to that assessment without including the sensitive information it discusses. Keep technical validation, legal authority and permitted-use decisions separate so that a later change can be routed to the right owner.

## Check the card before sharing it

- Confirm that the version matches the proposed dataset and its exclusions.
- Separate verified facts, illustrative examples and open questions.
- Check that permission descriptions match reviewed agreements rather than assumptions.
- Describe outcome definitions, gaps and limitations in reader-facing language.
- Record split boundaries and unresolved contamination risks.
- Use a metadata-only card until the appropriate transfer conditions are agreed.

## Update the card when a meaningful fact changes

A new export date alone is not evidence of new editorial or specialist review. Update the card when its scope, transformations, permissions, limitations or supporting checks change, and preserve the previous version. Ask reviewers to assess the changed facts rather than silently copying an earlier approval to a materially different package.

## Sources

- [NIST — AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [ICO — Pseudonymisation guidance (UK)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)

[Discuss buyer documentation needs](/contact/)
