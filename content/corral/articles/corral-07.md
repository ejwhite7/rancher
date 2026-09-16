# De-identification and anonymization are different

De-identification describes efforts to reduce identifying information; it should not be treated as a universal legal status or a guarantee of anonymity. Replacing names may leave people identifiable through context, rare events or links to other information. For a licensing proposal, describe the actual transformations, assess the recipient and release conditions, and obtain the relevant jurisdiction-specific analysis before making claims about the result.

## Describe the transformation instead of relying on a label

A phrase such as de-identified data can refer to very different preparation steps. One team may remove a name column, another may generalize timestamps, and another may exclude free text entirely. Ask for a field-level explanation of what changed and why. The description should distinguish material removed from material replaced, generalized or retained. It should also identify what remains unknown about the result.

Avoid treating [de-identification](/glossary/de-identification/), pseudonymisation and anonymization as interchangeable promises. Their practical and legal implications depend on the context in which they are used. In a proposed transaction, the useful question is what a recipient could learn or link using the delivered material and other information available to it. A confident label without that explanation can conceal important limitations from both the company and the prospective recipient.

## Look beyond direct identifiers

Names, email addresses and account numbers are obvious candidates for review, but indirect identifiers can matter as well. Precise times, locations, unusual job roles, rare incidents and combinations of otherwise ordinary fields may narrow the set of possible people or organizations. Free-text messages can contain information that does not appear in a structured identity column. Attachments and embedded links can introduce additional material.

Review the proposed dataset as a whole rather than approving columns independently. A field that appears unremarkable alone may become revealing when joined to another field or an external record. Document which combinations and release conditions the assessment considered. An analysis of one small sample does not automatically establish the characteristics of a larger archive, particularly when the source systems or record categories vary across the history.

## Techniques and residual questions

| Preparation step | Information it changes | Question that remains |
| --- | --- | --- |
| Remove direct identifiers | Deletes specified identity fields | Can context or another field identify the subject? |
| Use replacement identifiers | Preserves selected links with substituted values | Who can connect those values to other information? |
| Generalize time or location | Reduces selected precision | Does a rare combination remain identifying? |
| Review free text | Identifies passages requiring treatment | What formats and edge cases were not reliably checked? |
| Exclude records or fields | Removes defined material from the delivery | Does the remaining scope support the intended task? |

## Understand what stable replacement identifiers preserve

A stable pseudonymous identifier can make it possible to follow one case or participant across events without displaying the original identifier. That can preserve useful workflow context, but it also preserves relationships. If a recipient can connect the replacement identifier to other information, the linkage may reveal more than the individual rows suggest. Treat the join structure as part of the privacy assessment.

Ask who holds any mapping back to original identifiers, whether the recipient can access it and how it is protected. Do not distribute a mapping key alongside a dataset merely because the visible names have been replaced. Also ask whether the replacement values are predictable or shared across releases. The appropriate design depends on the proposed use and threat model; this article does not prescribe a universal transformation that makes records safe.

## Test a fictional workflow before and after preparation

Consider a fictional support history containing a named customer, a precise incident time, a distinctive product configuration and an unusual resolution. Replacing the customer name with a case token leaves the other details intact. A person familiar with the incident might still recognize it. The example shows why reviewing direct identifiers alone can miss context that matters to identifiability.

A revised proposal might generalize time, remove the distinctive configuration or exclude the case. Each choice can reduce information useful for reconstructing the workflow. Document that trade-off rather than assuming every transformation improves the dataset. If the intended use requires the very detail that creates the risk, the team may need to narrow the use or stop. The example is synthetic and is not a claim about a real Rancher dataset.

## Match validation to the release conditions

A privacy assessment should explain who is expected to receive the material, what additional information may be available and how access will be controlled. A limited recipient arrangement and an unrestricted public release are different contexts to analyze. Keep those assumptions explicit. If the recipient, use or [onward-sharing](/glossary/onward-sharing/) conditions change, revisit the conclusions rather than carrying the earlier label into a new situation.

Validate across the relevant record types and edge cases. Rare events, unusually detailed messages and inconsistent source formats may deserve particular attention. Record the method, limitations and unresolved findings. An automated scan can support this work without proving that every sensitive passage has been identified. A report should say what was tested and what was not, so a commercial discussion does not convert a limited check into a guarantee.

## Keep authority and confidentiality in the decision

Reducing identifiability does not answer every licensing question. Customer confidentiality, third-party rights, contractual restrictions and the authority to make the proposed material available may remain relevant. A transformation project should therefore sit alongside the [rights review](/blog/company-data-licensing-rights-checklist/), not replace it. The team needs to understand both the information being retained and the obligations associated with its origin and intended use.

Be precise about jurisdiction. The ICO guidance cited below concerns the UK framework and explicitly distinguishes pseudonymised information from anonymous information. Its application should not be generalized into a claim that every jurisdiction uses the same test. Identify the jurisdictions and arrangements that matter to the proposal, and have the appropriate questions considered in that context. A glossary definition is a starting point for discussion, not transaction-specific clearance.

## Document residual risk and the stop condition

Write a preparation record that describes the source scope, transformations, retained relationships, [exclusions](/blog/ai-training-data-exclusions/), validation and release assumptions. Include limitations in the dataset documentation that accompanies a permitted delivery. If the documentation cannot support the claim being made about anonymity or safety, revise the claim or the proposal. It is better to preserve an honest uncertainty than to hide it behind a broad assurance.

Use the worksheet to compare techniques and the questions each leaves open. The decision might be to investigate further, use a more limited scope or decline the proposed sharing. No single row in the table authorizes a transfer. The goal is a traceable explanation of what has changed, what can still be inferred and why the selected next step is appropriate for the actual circumstances.

## Before you move forward

- Describe actual transformations rather than promising anonymity.
- Assess joins, rare events and free text alongside identity fields.
- Record release assumptions and jurisdiction-specific questions.
- Revisit the assessment when the recipient or scope changes.

## Sources and scope

The ICO explains that pseudonymised personal data remains subject to data-protection law in the UK. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [Pseudonymisation | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)

[Discuss exclusions and review needs](/contact/)
