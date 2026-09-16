# What happens during a business-data assessment?

A business-data assessment should begin by describing candidate records, not by transferring an unrestricted export. A useful sequence identifies systems, history, categories, owners, restrictions and the recipient’s intended use. Any later sample or delivery needs its own decisions about authority, handling and scope. The process below is an illustrative approach to organize diligence, not a claim about a verified Rancher operating procedure.

## Give the assessment a question to answer

Decide what the company wants to learn before collecting information. It might be whether a particular operational history can support a proposed AI task, whether the relevant agreements can be located, or whether preparation effort is likely to be manageable. A focused question helps the team distinguish an assessment from a broad exercise in exporting everything it owns. Record the decision that the assessment is meant to support.

Name a business sponsor and a system owner. The sponsor can explain the intended commercial outcome and limits on internal effort. The system owner can explain how records are created, changed and retained. Other participants may need to address legal, privacy, security or finance questions, but they should receive a defined scope rather than an unexplained request to approve data sharing. Assign an owner to each unresolved question.

## Build a metadata-only inventory

For each candidate source, describe the application or repository, record categories, approximate volume, period of history and known limitations. Use descriptions and estimates rather than real customer records. A useful inventory might say that a support system contains issue categories, action timestamps and closure states for a certain period. It should also say whether messages, attachments or linked systems are outside the initial assessment.

Mark estimates as estimates and record how they were obtained. A count from a dashboard may differ from a count of distinct usable cases. Historical migrations, retention settings and duplicate imports can affect coverage. The purpose is to make the next conversation more precise, not to create a definitive [quality](/glossary/data-quality/) claim before the source has been examined. Keep access credentials and unrestricted download links out of the inventory document.

## Metadata-first assessment inventory

| Inventory item | Describe without transferring records | Question to resolve |
| --- | --- | --- |
| Source systems | Application names and accountable owners | Which sources are actually in scope? |
| Coverage | Approximate cases and historical periods | Where are gaps or migrations? |
| Record meaning | Field definitions and state changes | Which outcomes are independently explained? |
| Restrictions | Excluded categories and agreement references | Who can resolve each permission question? |
| Preparation | Proposed tasks and responsible teams | What effort is justified before acceptance? |

## Explain how the records became meaningful

Ask the system owner to describe important fields in ordinary language. What creates a record? What changes its state? Can multiple events belong to one case? Does a closure timestamp represent completion, archival or an administrative action? These questions expose interpretation gaps that a list of column names would miss. Include known changes in field meaning across products, teams or time periods.

Describe joins between systems without supplying the identifiers themselves. For example, a case identifier may connect a support event to a product issue, but the connection might be optional or available only for part of the history. Record that limitation. An assessment should distinguish what can be reconstructed from what people assume happened. Observed workflow history is not automatically a verified account of the reasoning behind every action.

## Identify restrictions before requesting examples

Create a separate list of material that is excluded, restricted or unresolved. Consider [customer confidential information](/glossary/confidential-business-information/), workforce records, third-party content, secrets, privileged material and attachments. Identify the documents and decision owners needed to review those categories. Ordinary-looking operational fields also need consideration; narrowing the scope is not a declaration that the remaining records are free of obligations or identification risk.

If a recipient asks to see examples, treat that request as a new gate. Clarify the purpose, exact fields, recipient, access controls, retention and [permitted use](/glossary/permitted-use/) of the sample. A sample may still contain sensitive or restricted information. A clearly labeled synthetic row can sometimes explain a schema while substantive questions are being resolved, but it must not be used to claim real quality, coverage or performance that has not been established.

## Evaluate utility against a bounded use

A proposed use helps determine which limitations matter most. A dataset intended to evaluate routing may need reliable categories and a defensible split policy. A proposal involving workflow sequences may depend on stable case joins, action order and explained outcomes. Ask the recipient to identify its minimum information needs and the evidence it would use to assess suitability. Avoid treating a general expression of interest as acceptance.

Compare those needs with the permitted scope after exclusions. If a crucial link would have to be removed, document the resulting trade-off. The outcome may be a narrower use, a request for better documentation or a stop decision. Keep utility findings separate from the [rights and privacy findings](/blog/company-data-licensing-rights-checklist/). A dataset can be technically interesting and still unsuitable for the proposed transfer, or permissible in principle yet unable to support the task.

## Estimate the work before committing to it

List the activities that would be required to prepare a candidate delivery: locating agreements, documenting fields, defining exclusions, implementing transformations, validating joins and checking quality. Identify internal and external owners and distinguish one-time work from ongoing obligations. The assessment should make these tasks visible before they become an informal commitment attached to a commercial conversation.

Use a fictional example to test the estimate. A team with consistent case IDs but undocumented closure codes might need interpretation work before it needs engineering work. Another team may understand its fields but lack a defensible way to separate excluded content. These are different preparation problems. Avoid presenting a single readiness score that obscures them or suggests a guaranteed timeline, fee or [licensing outcome](/blog/license-business-data-for-ai/).

## Close with a documented next step

An assessment should finish with a scoped decision: continue metadata discussions, investigate specified issues, prepare a separately authorized sample, revise the candidate scope or stop. Record the evidence supporting the decision and the conditions that would change it. Assign owners and due dates only where the work has actually been agreed. A list of unresolved questions can be a useful result if it prevents an uninformed transfer.

The downloadable inventory includes evidence-reference and decision columns so the team can preserve context as the proposal develops. Keep the inventory version aligned with the dataset description. If a recipient changes its intended use or requests another source system, revisit the affected questions. Completing the worksheet does not establish eligibility or earnings. It should help the company decide whether the next defined step is justified.

## Before you move forward

- Start with descriptions rather than sample records.
- Separate interpretation gaps from engineering work.
- Require a defined purpose and handling decision for any sample.
- End with a specific next action or an explicit stop.

## Sources and scope

The ICO explains that pseudonymised personal data remains subject to data-protection law in the UK. NIST describes the AI Risk Management Framework as intended for voluntary use. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [Pseudonymisation | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)
- [AI Risk Management Framework - NIST](https://www.nist.gov/itl/ai-risk-management-framework)

[Describe your systems; do not send data](/contact/)
