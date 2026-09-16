# What to exclude from an AI training dataset

Start a licensing proposal with explicit exclusions. Credentials, privileged material, sensitive workforce records, customer confidential content and third-party material should not slip into a delivery because they share a source system with ordinary workflow events. Classify categories as excluded, restricted or requiring escalation, then document how that decision is implemented and checked. An exclusions matrix organizes review; it does not declare the remaining data safe.

## Set boundaries before selecting an export

A source application is a container, not a [rights](/blog/company-data-licensing-rights-checklist/) or safety category. A support tool can hold customer text, internal notes, attachments, credentials pasted during troubleshooting and links to other systems. An engineering repository can include code, configuration, issue discussions and imported dependencies. Describe these categories separately before deciding what a candidate dataset would contain.

Begin with the narrowest scope that can support the proposed discussion. If the recipient only needs to understand the schema, metadata and clearly labeled fictional examples may be enough for that stage. Do not include every available field on the assumption that someone else will remove unsuitable content later. Assign responsibility for defining and enforcing exclusions before a sample or production delivery is prepared.

## Keep secrets and access material out

Credentials, tokens, private keys and other access material do not become acceptable merely because they appear in a historical record. Define how candidate sources will be checked for them and what happens when they are found. The appropriate response may involve security handling beyond removing a value from the proposed export. Route discoveries to the organization’s established security process rather than copying them into the assessment worksheet.

Consider indirect access paths as well as obvious secret strings. An attachment URL, shared-drive link or embedded configuration can expose additional material or reveal information about an environment. Inventory references and attachments separately. Record the checking method and its limitations, including unsupported formats. A tool reporting no matches is evidence about that check, not proof that every possible secret or access path has been eliminated.

## Initial exclusions and escalation matrix

| Category | Initial handling | Evidence or decision needed |
| --- | --- | --- |
| Credentials and access material | Exclude and route discoveries to security | Document checks and response process |
| Privileged or legal material | Hold outside candidate scope | Responsible legal review |
| Workforce records | Separate for specific consideration | Purpose, geography and applicable arrangements |
| Customer confidential content | Restrict pending scope review | Relevant agreement and content assessment |
| Third-party code or documents | Identify origin before inclusion | Permissions and restrictions for proposed use |
| Attachments and embedded links | Treat as separate sources | Inventory, review and enforceable export boundary |

## Separate privileged and confidential material

Material involving legal advice or legal matters needs an appropriate review before inclusion is considered. The person preparing a dataset should not decide that a document has lost sensitivity simply because it is old, summarized or stored in a general-purpose system. Mark the category for the responsible legal team and keep the candidate scope from expanding while that question remains unresolved.

[Customer confidential information](/glossary/confidential-business-information/) also needs attention beyond personal identifiers. Product roadmaps, commercial negotiations, pricing arrangements and business plans can remain sensitive even when individual names are removed. Identify the agreements and context relevant to the material. A transformation that reduces identification risk does not necessarily satisfy confidentiality obligations. Record the distinction so one type of review is not mistaken for a decision on another.

## Treat workforce and regulated categories deliberately

Personnel records, performance discussions and workplace communications may require a different analysis from routine product events. Identify the category, purpose, geography and relevant arrangements before considering inclusion. Avoid placing the burden on a keyword filter to determine whether the material is appropriate for the proposed use. The decision should be made at the scope level and supported by a method that can be checked.

The same principle applies when records may involve regulated or otherwise sensitive information. Flag the category and involve the responsible specialists without assuming that a generic export process covers it. The matrix should identify what is known and what needs escalation. It is not a catalog of every applicable law or a statement that an ordinary business record is automatically unrestricted if it falls outside a named category.

## Check third-party content and mixed records

A record can combine material with different origins. An employee may paste vendor documentation into a ticket, attach a customer spreadsheet or reference third-party code in an issue. Identify those sources where possible and determine what restrictions need review. Possession of the combined record does not resolve the permissions associated with every component or every proposed external use.

Use a fictional mixed ticket to test the process: a structured issue category, a message body, an attached screenshot and a link to a diagnostic file. The proposed scope might retain the explained category while excluding all attachments and links. That is a scoping choice for review, not proof that the retained field is anonymous or licensable. Record how the export will enforce the boundary so the original mixed record is not accidentally delivered alongside the selected fields.

## Validate exclusions as a process

Translate each decision into an implementation rule and a check. A field-level exclusion may be straightforward when the source schema is stable, while free-text or attachment decisions may need more investigation. Identify the person responsible for implementing the rule and the person responsible for evaluating the result. Keep a versioned record of what was excluded and why.

Test the process against known edge cases, not only typical records. Changes in format, nested files, historical imports or newly added fields can create gaps. Document those gaps and the treatment of exceptions. If a rule cannot be enforced with sufficient confidence for the proposed transfer, change the scope or stop. Do not replace an implementation problem with a broader marketing statement that the dataset has been cleaned.

## Make the remaining scope understandable

After exclusions, update the field dictionary, coverage description and known limitations. A recipient needs to understand which relationships, outcomes or periods are missing because of preparation decisions. Removing an entire category can affect interpretation even when the remaining rows are well formed. Explain that effect without exposing the excluded material itself.

The downloadable matrix provides places for owners, evidence and decisions. Use references to controlled documents rather than copying secrets, personal records or confidential examples into it. Reassess the matrix when a source system, intended use or recipient changes. The useful outcome is a reproducible boundary and a clear next decision. Excluding some risky categories is progress, but it is not a blanket approval of everything left behind.

## Before you move forward

- Assign an owner to every exclusion and unresolved category.
- Check nested content and links rather than only visible columns.
- Record how each rule was implemented and tested.
- Update utility and coverage descriptions after material is removed.

## Sources and scope

The ICO explains that pseudonymised personal data remains subject to data-protection law in the UK. NIST presents its Cybersecurity Framework as a resource for reducing cybersecurity risks. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [Pseudonymisation | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)
- [NIST — Cybersecurity Framework](https://www.nist.gov/cyberframework)

[Map an initial excluded scope](/contact/)
