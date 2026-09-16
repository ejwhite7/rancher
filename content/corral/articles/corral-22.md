# Security questions before any data transfer

A security review should establish who will receive the material, how access and transfer are controlled, what other parties are involved and what happens after the permitted use ends. Ask for evidence relevant to the actual arrangement, not broad assurances. Resolve the scope and responsibilities before any sample or delivery. This questionnaire does not certify a provider or establish a universally approved transfer method.

## Define the information and the proposed path

Security questions become more useful when the dataset and transfer are described. Identify the record categories, [exclusions](/blog/ai-training-data-exclusions/), volume assumptions, intended recipient and permitted use. Explain whether the proposal concerns a metadata discussion, a sample or a larger delivery. These are different activities and should not be covered by an ambiguous approval for data sharing in general.

Map where the material would go and which people or services would interact with it. Include preparation environments, intermediate copies and external providers where relevant. The map does not need to expose secrets or infrastructure details to everyone in the project, but the responsible reviewers need enough information to evaluate the actual path. A claim that data is handled securely cannot replace that understanding.

## Ask who can access the material

Request a description of access roles, how access is granted, how it is reviewed and how it ends. Identify whether access is limited to named teams or includes contractors, affiliates or other parties. Ask how the proposed permissions correspond to the [permitted use](/glossary/permitted-use/). A broad commercial relationship should not silently become unrestricted access for every person associated with the recipient.

Discuss authentication and account handling at the level needed for the arrangement. Avoid sending shared credentials or granting source-system administration merely to simplify an initial assessment. If the recipient proposes a specific access mechanism, ask the security owner to assess it and the evidence supporting it. The appropriate method depends on the information and environment; this article does not designate a particular tool as approved.

## Pre-transfer security questionnaire

| Area | Question to ask | Evidence to request |
| --- | --- | --- |
| Access | Who can receive and use this specific material? | Role scope, authorization and offboarding process |
| Transfer and storage | How are delivery and copies protected? | Relevant technical description and control scope |
| Other providers | Which additional parties receive information? | Provider inventory and change process |
| Logging and incidents | How would access or an incident be investigated? | Logging scope, contacts and response responsibilities |
| Retention and deletion | What happens to each category of artifact? | Retention schedule and deletion evidence limits |
| Assurance | Does the evidence cover this actual arrangement? | Current documents with their scope and limitations |

## Review transfer and storage evidence

Ask how the proposed transfer will be authorized, verified and limited to the agreed recipient. Discuss how copies are protected in transit and at rest, where they are stored and which controls apply to the relevant environment. A statement that encryption is used is a starting point for questions, not a complete account of access, key handling or operational responsibility.

Request evidence that is current and relevant to the service and scope being proposed. A certification, policy document or audit statement may have boundaries that differ from the actual arrangement. Have the responsible reviewer assess those boundaries rather than treating the presence of a logo as universal proof. Do not claim a Rancher certification, integration or transfer method unless the specific capability and evidence have been established.

## Identify subprocessors and onward sharing

Determine whether the recipient plans to involve other organizations or services, and what information they would receive. Ask how those parties are selected, authorized and governed within the proposed arrangement. The company should understand whether a change in provider or processing location would require notice, review or another decision under the actual terms.

Keep technical access and contractual permission aligned. A provider may be able to pass data to another service without the company having agreed that use. Conversely, a [contract](/blog/ai-data-licensing-agreement-terms/) can describe a boundary that needs practical implementation. Record both the proposed obligation and how it will be carried out. Unexplained onward sharing is a material question to resolve before a sample is transferred, not merely before a final production delivery.

## Clarify logging and incident responsibilities

Ask which relevant actions are logged, who can review the records and how the company would obtain information about an issue affecting its material. Define the operational contacts and the process for reporting and responding to incidents. The parties should understand their responsibilities and communication path before an event creates urgency. This guide does not prescribe legal notification periods or substitute for the applicable requirements.

Discuss the limits of the proposed evidence. A log may demonstrate a particular access event without proving every later use of a copy. A policy may describe intended behavior without establishing how a specific incident would be investigated. The review should distinguish controls, monitoring and contractual obligations, and should record uncertainties that affect the company’s willingness to proceed with the proposed scope.

## Separate retention and deletion by artifact

Identify the source files, working copies, transformed datasets, backups, evaluation outputs and trained artifacts that may exist. Ask how long each is retained, what triggers deletion and what evidence can be provided. A single statement that data will be deleted can conceal important differences between these categories. The technical and contractual descriptions should use consistent terms.

Do not assume deleting source records reverses an earlier training activity. Ask the recipient to explain the treatment of resulting artifacts and have the relevant obligations reviewed before transfer. If the proposed use creates consequences the company is not willing to accept, the decision may be to narrow or decline it. A later deletion request should not be the first time these limits are discussed.

## Record a decision for the actual arrangement

Use the questionnaire to connect each answer to evidence, an owner and a decision. Mark unsupported claims or unanswered questions explicitly. The review can identify a conditional next step, require changes or stop the proposal. It should not convert a list of answered questions into a blanket approval for every dataset, recipient and future use.

Revisit the record when the scope, provider, access model or intended activity changes. A small sample can still contain restricted information, and a later full delivery may require additional consideration. Keep the review tied to the version being discussed. The result should help the company understand what is known about the proposed handling, what remains uncertain and whether the defined next step is justified.

## Before you move forward

- Define the recipient and path before choosing a transfer method.
- Request evidence tied to the proposed environment and service.
- Separate source-file deletion from treatment of resulting artifacts.
- Reopen the review when the scope or participating parties change.

## Sources and scope

NIST presents its Cybersecurity Framework as a resource for reducing cybersecurity risks. The ICO explains that pseudonymised personal data remains subject to data-protection law in the UK. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [NIST — Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Pseudonymisation | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)

[Discuss security requirements](/contact/)
