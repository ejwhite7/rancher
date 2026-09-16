# Preserve workflow context while reducing privacy risk

Preserving workflow context while reducing privacy risk requires deliberate choices about identifiers, ordering, joins, text and exclusions. Stable replacement IDs can retain relationships, but those same relationships can create linkage risk. Describe the intended task, transform only within an authorized scope, and validate both residual risk and remaining usefulness. Replacing names alone is not a complete preparation method or a guarantee of anonymity.

## Define which context the task actually needs

Start by asking what a recipient must understand to perform the proposed task. A workflow dataset might need event order, action categories and a documented outcome while not needing exact times, participant names or full message bodies. Another task may depend on details that cannot be safely or permissibly included. Write those requirements down before choosing transformations, so the process has a defined purpose rather than a generic goal of cleaning data.

Distinguish essential relationships from convenient extras. A case-to-event link may be needed to reconstruct a sequence, while a person-to-all-cases link may not be necessary for the same task. Keeping every available join can preserve more context than the proposal requires. The preparation plan should explain why each retained relationship is needed and what risks or restrictions must be considered before including it.

## Use stable identifiers within a defined boundary

A replacement identifier can keep events associated with the same case after the original identifier is removed from the candidate delivery. Define the scope over which that replacement remains stable: one dataset version, one recipient arrangement or some other reviewed boundary. Do not make the choice implicitly through a convenient implementation. Stability affects both usefulness and the ability to connect records across releases.

Keep any mapping back to original identifiers under separately defined controls. Ask whether the recipient could predict or obtain the mapping, or connect the replacement values to other information. [Pseudonymization](/glossary/pseudonymization/) can reduce exposure of direct identifiers while preserving meaningful links. That is why the design needs a context-specific assessment. A stable token is a technical representation, not evidence that the linked records have become anonymous.

## Synthetic preparation choices for CASE-014

| Before preparation — fictional | Proposed representation | Question to validate |
| --- | --- | --- |
| Participant named Alex Example | Stable case token CASE-014 | Does the task need a person-level relationship? |
| Exact event timestamp | Sequence number within the case | Does losing elapsed time prevent the intended analysis? |
| Detailed troubleshooting note | Documented action category only | What meaning is lost with the text excluded? |
| Link to an attached document | Attachment outside the candidate scope | Can the remaining sequence still be interpreted? |
| Closed state after several actions | Explained closure label retained | Does the source support a successful-outcome claim? |

## Preserve order without retaining unnecessary precision

If the task depends on sequence rather than clock time, consider whether the documentation can describe order without every original timestamp. Any change must be assessed against the intended use and the privacy questions. Generalization can reduce precision but may also hide delays, simultaneous activity or other information needed for interpretation. Record what was changed and what conclusions the resulting representation no longer supports.

Explain the original timestamp semantics before transforming them. A system ingestion time is not necessarily the time an action occurred. If different sources disagree, preserve the uncertainty or apply a documented reconciliation rule. Do not create a smooth-looking sequence that suggests more precision than the source supports. A recipient should be able to distinguish an observed ordering from an ordering imposed during preparation.

## Read the synthetic before-and-after example

The table uses invented records for CASE-014. The initial representation includes a named participant, an exact time and a detailed note. The proposed prepared representation uses a case token, an event sequence and an action category, with the note excluded. This is an illustration of choices to assess, not a recommended transformation for every support dataset and not evidence about a real customer.

The prepared version still reveals relationships: several actions concern the same case, and a particular action precedes a recorded closure state. Those links may be necessary for a workflow task, but they remain part of the risk assessment. If an unusual event pattern makes a case recognizable, removing a name may have accomplished less than expected. Document residual questions instead of treating the after column as automatically safe.

## Review free text and attachments separately

Free text can carry the context that makes a workflow intelligible, but it can also contain personal information, confidential details, third-party material and embedded access information. Define whether text is in scope and how it would be assessed. Do not assume that a structured-field transformation covers the prose stored beside it. Attachments, quoted histories and links may require their own source inventory and treatment.

If text is excluded, describe the effect on utility. An action category without the surrounding explanation may support one task while being insufficient for another. If selected text is retained, document the selection and validation process, including its limitations. The team should understand which contexts were removed, which remain and which cases were dropped entirely. Preparation choices should not disappear from the [dataset documentation](/glossary/dataset-documentation/) once the file looks cleaner.

## Validate privacy and utility as separate outcomes

A dataset can retain a valid schema while losing the relationships needed for the task. It can also preserve a rich [trajectory](/blog/workflow-trajectory/) while retaining unacceptable identifying detail. Test both sides explicitly. For utility, inspect whether case joins, event order and outcome definitions still work. For privacy and confidentiality, assess the information and relationships that remain under the actual proposed release conditions.

Use edge cases rather than only typical sequences. Rare events, long conversations, merged cases and unusual attachments may expose weaknesses that routine examples miss. Record what was tested and which populations or formats were not covered. If a transformation changes the result of an acceptance check, explain why. The goal is a documented assessment of the prepared scope, not a blanket claim that a processing pipeline has made every record suitable.

## Keep a transformation record with the delivery

For each version, document the source scope, selected fields, transformations, [exclusions](/blog/ai-training-data-exclusions/), join rules and known limitations. Identify the owners of the preparation and validation decisions. If a later version uses a different token policy or includes another source, state that change rather than presenting the new file as equivalent to the old one. Consistency of file format does not guarantee consistency of meaning.

Use the worksheet to connect each preparation choice to the question it addresses and the utility it may affect. Keep sensitive source values out of that worksheet. The next decision may be to adjust the intended task, narrow the records, investigate another method or stop. A defensible process preserves enough context to evaluate the proposal while being honest about the risks and limitations that preparation cannot eliminate automatically.

## Before you move forward

- Justify retained relationships against the intended task.
- Review token stability and mapping access explicitly.
- Test information loss as well as residual disclosure risk.
- Version transformation rules alongside dataset documentation.

## Sources and scope

The ICO explains that pseudonymised personal data remains subject to data-protection law in the UK. NIST describes the AI Risk Management Framework as intended for voluntary use. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [Pseudonymisation | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)
- [AI Risk Management Framework - NIST](https://www.nist.gov/itl/ai-risk-management-framework)

[Discuss preparation requirements](/contact/)
