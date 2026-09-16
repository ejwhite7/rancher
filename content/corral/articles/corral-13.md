# A rights checklist for licensing engineering data

Source code and engineering history require a defined rights and security review before an external AI licensing proposal. A repository can mix company work, contractor contributions, dependencies, customer material, secrets and discussion records. Identify the proposed versions and uses, trace the relevant permissions, and separate code from issues, reviews and attachments. Licensing a defined dataset is also a different transaction from selling a business or its assets.

## Define which engineering material is being considered

An engineering repository is not a single uniform category. It may contain application code, configuration, tests, generated files, documentation, dependencies and historical versions. Pull requests and issue trackers add discussions, attachments and links with their own context. Describe which of these components are actually in scope. A proposal involving one code snapshot should not quietly expand to include every historical artifact associated with it.

Identify the version, branches and period being considered, and explain the recipient’s intended use. A request to evaluate a coding system may differ from a request to train one. The [rights review](/blog/company-data-licensing-rights-checklist/) and preparation plan need that description. Do not begin by sharing broad repository access to discover whether there is interest; a metadata inventory can identify languages, categories, history and unresolved restrictions without exposing the underlying material.

## Trace employee and contractor contributions

Locate the arrangements relevant to contributions from employees, contractors and other participants. Record who is responsible for reviewing them and which material they cover. The company’s ability to access or operate the software does not by itself answer every question about [licensing](/glossary/data-licensing/) it for a new purpose. If documentation is missing or the scope is disputed, preserve that uncertainty instead of assigning a blanket approved status.

Consider changes over time, acquired codebases and work carried out for customers. A repository’s current owner or administrator may not know the origin of every file. Use the inventory to identify areas requiring closer examination. Do not infer unrestricted authority from the fact that a contribution was merged or paid for. The relevant arrangements need to be assessed against the actual proposed dataset and [permitted use](/glossary/permitted-use/).

## Repository rights and scope checklist

| Material | Evidence to locate | Boundary to resolve |
| --- | --- | --- |
| Company-created modules | Contribution and ownership records | Authority for the proposed external use |
| Contractor work | Relevant agreements and covered contributions | Unclear or incomplete arrangements |
| Dependencies and copied content | Origin and applicable conditions | Component-specific permissions and restrictions |
| Secrets and configuration | Security checks across proposed versions | Exclusion and incident-handling needs |
| Customer extensions and artifacts | Customer agreements and source context | Confidentiality and licensing limits |
| Reviews and issue history | Join rules and process definitions | What the observed events actually support |

## Inventory dependencies and imported material

Third-party components can appear as packages, copied snippets, vendored libraries, generated output or documentation. Identify their origin and applicable conditions rather than treating the whole repository as internally created. Different components may require different treatment. The inventory should make those differences visible to the people assessing the proposed license and delivery scope.

Avoid assuming that publicly available code is unrestricted for every intended use or that one repository-level label resolves all included components. Review the actual material and its conditions. Where a component cannot be confidently classified, [exclude](/blog/ai-training-data-exclusions/) it pending investigation or document a clear escalation. The purpose of the checklist is to locate questions and evidence, not to supply a universal interpretation of open-source or other license terms.

## Keep secrets and customer material separate

Repositories and their histories may contain access tokens, private keys, credentials, environment configuration or references to internal services. Define how the proposed scope will be checked and how discoveries will be handled through the company’s security process. Removing a value from the latest snapshot may not address historical versions or copies in related artifacts. Keep the review aligned with the versions actually proposed for delivery.

Customer-specific code and confidential implementation details need separate consideration. A company may maintain them operationally without having unrestricted rights to license them to another recipient. Identify the relevant arrangements and boundaries. The same caution applies to issue descriptions, screenshots and logs supplied by customers. Excluding obvious personal information does not resolve [commercial confidentiality](/glossary/confidential-business-information/) or the origin of the underlying code and documentation.

## Evaluate engineering history as its own dataset

Pull requests, reviews, issues and commits can preserve useful context about changes, but they do not automatically explain why a decision was correct. A review approval is a recorded event with a process meaning; it is not proof that every concern was resolved or that a change improved performance. Document the conventions and limitations of the source rather than turning the history into an assumed expert demonstration.

If the proposed use depends on connecting issues to changes, describe the join evidence. An explicit link is different from a match inferred from text or timing. Missing reviews, force-pushed history, migrated issues and automated commits can affect interpretation. Keep those limitations in the [dataset documentation](/glossary/dataset-documentation/). A tidy event chain should not conceal uncertainty about the relationship between a reported problem, a code change and an eventual outcome.

## Test a fictional repository boundary

Imagine a fictional company proposing one documented snapshot of its internal scheduling tool. The initial scope excludes deployment configuration, third-party packages, customer extensions and discussion attachments. The inventory then identifies contractor-created modules whose documentation needs review. The company holds those modules out of the proposal while the responsible owner investigates the relevant arrangements.

Next, a recipient requests the pull-request history. That changes the scope: discussions, contributor context, customer references and linked artifacts now need separate consideration. The earlier snapshot review should not be reused as automatic clearance for the expanded dataset. This example is a scoping exercise, not a recommended license structure or evidence of a transaction. It illustrates why engineering artifacts should be reviewed at the level actually being offered.

## Separate commercial exploration from an asset sale

A proposal to grant specified permissions over engineering material should not be described casually as selling the company’s code or business. Identify the transaction being considered, the rights retained and the obligations proposed. If the parties are instead discussing an asset sale or broader corporate transaction, that requires its own analysis. The terminology should match the documents and the intended commercial arrangement.

Use the worksheet to record origin, restrictions, security questions and the evidence needed for a go or no-go decision. Keep preparation costs, acceptance conditions and ongoing support separate from any headline payment discussion. No valuation figure or buyer demand is established by completing the inventory. The useful next step may be a narrower proposal, a documentation task or a decision that the material should remain internal.

## Before you move forward

- Define code versions and history before reviewing permissions.
- Inventory third-party and customer contributions separately.
- Check the proposed historical scope for secrets and restricted artifacts.
- Keep workflow evidence distinct from claims about reasoning or quality.

## Sources and scope

The U.S. Copyright Office treats AI training and the copyrightability of AI outputs as separate subjects in its AI initiative. NIST presents its Cybersecurity Framework as a resource for reducing cybersecurity risks. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [Copyright and Artificial Intelligence | U.S. Copyright Office](https://www.copyright.gov/ai/)
- [NIST — Cybersecurity Framework](https://www.nist.gov/cyberframework)

[Discuss engineering-record eligibility](/contact/)
