# CRM histories need more than contact records

CRM histories may support a proposed AI use when they contain interpretable process events and the company can establish a suitable scope and authority. Contact information alone is not a complete sales workflow. Stage changes, activities and outcomes need definitions, while personal information, commercial confidentiality and customer restrictions require separate consideration. Begin with a metadata description rather than an unrestricted CRM export.

## Define the sales-process question

A recipient might want to understand stage transitions, evaluate an activity classification or study how a documented process unfolds. Those are different tasks from building a contact list or reviewing confidential commercial negotiations. Ask which task is intended and what unit the dataset would represent: an opportunity, an account, an activity or a [sequence of events](/blog/workflow-trajectory/). A clear unit makes the proposed scope easier to assess.

Describe what the CRM actually records, not what a sales process diagram says should happen. Some teams update stages regularly; others make several changes at once before reporting. Activities may be imported from other tools or entered retrospectively. These practices affect interpretation. A dataset description should explain known recording conventions and gaps so administrative updates are not mistaken for a precise account of every customer interaction.

## Separate process fields from identity and confidential content

Potential process fields include a stable fictionalized opportunity reference, stage transition, coarse event time, activity category and an explained final state. Names, email addresses, personal notes, contract attachments and detailed pricing raise additional questions. Treat them as distinct categories rather than assuming that every field in an opportunity record belongs in the same proposed delivery.

[Commercial confidentiality](/glossary/confidential-business-information/) can matter even when personal names are removed. Discount arrangements, negotiation notes and product commitments may reveal sensitive business information. Identify the relevant agreements and internal restrictions before considering inclusion. A technically available export does not establish that the company can license the contents for a different external purpose. Record those authority questions alongside, but separately from, the assessment of technical usefulness.

## Fictional CRM event chain

| Opportunity and event | Candidate process field | Boundary or interpretation |
| --- | --- | --- |
| DEAL-027 · qualification | Stage transition recorded | Qualification criteria need explanation |
| DEAL-027 · requirements | Activity category recorded | Notes and contact identities excluded |
| DEAL-027 · proposal | Proposal-created event | Pricing and attachments outside initial scope |
| DEAL-027 · closure | Closed-lost state | Reason and cleanup conventions need review |
| DEAL-027 · later update | Record modified after closure | Modification is not automatically a new customer event |

## Follow a fictional deal history

Consider the invented opportunity DEAL-027. The CRM records qualification, a requirements discussion, proposal creation and a closed-lost state. The table illustrates a possible schema using fictional identifiers and event categories. It does not contain actual customer information or demonstrate that a company’s CRM can reconstruct equivalent histories. A real assessment needs to confirm which events and relationships are supported by the source.

The final state needs explanation. Closed-lost might mean an explicit customer decision, an expired proposal, a duplicate opportunity or internal cleanup. A dataset should not label all of these as the same buyer outcome without a documented rule. If the reason is unknown, preserve that uncertainty. A convenient reporting category can otherwise become a misleading training label when moved into a new context.

## Document incomplete stages and changing definitions

Sales stages often reflect a company’s own operating conventions. Explain the criteria for entering and leaving a stage, and identify changes over the proposed history. A stage called qualified may mean something different after a process redesign. Do not combine periods under one label without describing that change. The recipient needs to know whether apparent differences reflect customer behavior, recording practice or a revised definition.

Check for opportunities that skip stages, move backwards, reopen or merge. These cases may be important to the intended use rather than simple errors to remove. State the selection and [exclusion rules](/blog/ai-training-data-exclusions/). If only complete histories are retained, describe what that choice leaves out. A clean sequence of stage names can still provide a distorted account of the business if difficult or unusual cases disappear without explanation.

## Review joins across accounts, contacts and activities

A CRM can connect an opportunity to several contacts, an account, tasks and records imported from other systems. Identify which relationships are needed for the proposed task and how they are established. A contact’s association with an account does not prove participation in every opportunity event. An activity timestamp does not necessarily prove that a decision was made at that moment.

Document many-to-one and many-to-many relationships rather than flattening them without explanation. Duplicated activities can appear when integrations or imports overlap, and merged records may complicate historical joins. The assessment should identify these possibilities and the checks required. No Salesforce, HubSpot or other platform connection is assumed here; the actual source capabilities and export boundaries need to be established for the company’s environment.

## Assess quality against the intended use

[Quality](/glossary/data-quality/) checks might examine missing transition times, inconsistent labels, duplicated activities and the proportion of histories with explained final states. The choice of checks and acceptable thresholds belongs to the proposed task. Do not describe illustrative checks as verified Rancher acceptance standards. A recipient evaluating process order may have different needs from one studying the distribution of broad activity categories.

Keep preparation choices visible. Generalizing time, excluding notes or limiting the history can affect what the recipient can infer. If the useful context disappears under the required boundaries, reconsider the use. A company should not commit to additional preparation merely because the source contains many records. Estimate the work and determine whether the narrower candidate scope still warrants a commercial discussion.

## Prepare a bounded assessment conversation

A first discussion can describe systems, approximate history, event categories, label definitions and known restrictions. It does not require contact details or actual negotiation records. Use the schema worksheet to record the facts and unresolved questions. If a sample is later proposed, define its purpose, recipient, [permitted use](/glossary/permitted-use/) and handling conditions separately before preparing it.

The outcome may be a clearer data dictionary, a narrower scope, a request to resolve an agreement question or a decision not to proceed. None of those outcomes establishes a price or guarantees a buyer. Treat the fictional history as an aid to asking better questions, not evidence about real inventory. The goal is to make a sales-process dataset understandable without confusing access to a CRM with permission to license everything inside it.

## Before you move forward

- Define whether the unit is an opportunity, activity or account.
- Separate process history from contacts and commercial documents.
- Explain stage changes and final-state labels across time.
- Assess the remaining scope after confidentiality and privacy boundaries.

## Sources and scope

The ICO explains that pseudonymised personal data remains subject to data-protection law in the UK. NIST describes the AI Risk Management Framework as intended for voluntary use. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [Pseudonymisation | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)
- [AI Risk Management Framework - NIST](https://www.nist.gov/itl/ai-risk-management-framework)

[Discuss sales-workflow eligibility](/contact/)
