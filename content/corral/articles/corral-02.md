# Can your company license its data?

A company can consider licensing data only after it can explain its authority over the proposed records, the intended use and the restrictions that travel with the material. System access is not the same as permission to license. Start with a narrow description, assign unresolved questions to the right owners, and use yes, no or escalate decisions before preparing any transfer.

## Begin with the material, not the company

A company does not pass one universal eligibility test that clears every record it holds. A proposed dataset may combine information created internally, supplied by customers, licensed from vendors and contributed by contractors. Define which categories are actually under consideration. Record the source system, period of history, intended recipient and proposed use. A statement such as “all customer operations data” is too broad to support a useful decision.

Choose a business owner who understands why the material was collected and a system owner who knows what an export would contain. Ask them to describe the records without attaching examples. This first description should distinguish structured fields from messages, documents and attachments. An apparently simple row can contain a link to a much larger body of material. Mark linked content separately so an initial scope does not quietly expand during preparation.

## Trace the authority behind each category

Build a [chain-of-rights](/glossary/chain-of-rights/) inventory rather than assuming that paying for a software account settles ownership or licensing questions. List the agreements and arrangements that may govern each category. These might include customer contracts, vendor terms, employee documentation, contractor assignments and restrictions attached to imported material. The inventory is a way to locate evidence for review; it should not turn uncertain interpretations into an automatic green light.

For each item, record an evidence reference, the person responsible for interpreting it, and the specific proposed use being assessed. “Contract reviewed” is incomplete if the reviewer considered internal analytics but the current proposal involves an external recipient training a model. When the relevant document cannot be located, record that gap explicitly. Access permissions, a manager’s recollection and an old sales presentation are not interchangeable with the underlying [agreement](/blog/ai-data-licensing-agreement-terms/).

## Rights and readiness gates

| Question | Evidence to locate | Decision route |
| --- | --- | --- |
| Who can authorize the proposed use? | Relevant agreements and responsible owner | Escalate until the authority is explained |
| Are customer restrictions covered? | Contract versions and affected record categories | Exclude or resolve restricted categories |
| Are workforce records involved? | Purpose, geography and applicable arrangements | Separate for dedicated review |
| Does third-party material remain? | Source and license inventory | Resolve each material restriction |
| Is the scope useful after exclusions? | Field dictionary and limitations | Assess utility without a revenue promise |

## Separate customer and workforce questions

Customer information can involve confidentiality promises, limits on [onward sharing](/glossary/onward-sharing/) and purposes that differ from the new proposal. Identify which customers and contract versions are represented. If the dataset spans a change in terms, distinguish the affected periods rather than applying the newest terms backwards without analysis. A restriction might require excluding a category or stopping the proposal; the checklist does not decide that interpretation.

Employee records deserve their own review. Messages, personnel information and workplace activity can raise questions different from product telemetry or aggregated operational counts. Identify geography, notice, context and the nature of the proposed processing for the appropriate reviewers. Removing a name does not settle these questions. Keep workforce material outside the candidate scope until its inclusion has been deliberately considered, documented and authorized for the actual use.

## Test a bounded fictional proposal

Imagine a fictional repair company considering maintenance-event records. Its proposed fields are equipment category, action type, timestamps and completion status. Customer messages, technician notes, addresses and photographs are initially excluded. Even that narrower set needs investigation: an unusual equipment configuration or a precise timestamp might reveal something about a customer, while a completion flag may mean administrative closure rather than successful repair.

The company prepares a field dictionary and identifies the agreements governing the source records. It discovers that records from one acquired business have incomplete documentation. Instead of treating the acquisition as proof of unrestricted rights, the owner separates that history and records a question for review. The example illustrates how a scope can become smaller as evidence improves. It does not establish that the remaining fields are anonymous, transferable or valuable to a buyer.

## Use yes, no and escalate precisely

A yes should mean that a named question has been resolved for a defined scope, supported by recorded evidence. It should not mean that a participant is generally comfortable with the opportunity. A no means the current proposal should not proceed in that form. Escalate means someone needs to resolve a specific uncertainty before the associated activity continues. Keeping these meanings consistent makes the checklist useful across teams.

Give each escalation an owner and a next action. For example, the commercial owner can clarify the recipient’s intended use while counsel reviews a disputed permission and a privacy specialist evaluates indirect identifiers. These tasks can inform each other without substituting for each other. If an unresolved issue affects the whole candidate dataset, pause the whole transfer. If it affects a separable category, document the exclusion and reassess the remaining proposal.

## Assess readiness after rights, not instead of rights

A technically tidy dataset can still have unresolved [licensing](/glossary/data-licensing/) boundaries. Conversely, a dataset with a plausible rights position may be poorly documented or unsuitable for the recipient’s intended task. Keep a separate readiness assessment for field meaning, history, missing values, outcome labels and preparation effort. This avoids presenting quality work as evidence that the company has permission to license the material.

Ask whether the useful scope survives the necessary exclusions. If removing messages and attachments leaves only ambiguous status codes, further documentation may be required before a recipient can assess utility. Estimate that work before commissioning it. The company should understand both the unresolved conditions and the cost of investigating them. Completion of the checklist is not a promise of qualification, a transaction or a particular payment.

## Preserve the decision as the scope changes

Version the checklist against a specific dataset description. A later request for another year of history, an additional system or a different use should trigger a review of the affected decisions. Do not simply copy every previous yes into the new version. Record what changed, which evidence still applies and which questions have reopened.

Use the downloadable worksheet as a register of decisions and evidence references, not a place to store sensitive records. The useful output is a bounded next step: continue a metadata discussion, investigate a documented question, remove a category or stop. A company that decides not to proceed has still learned where its boundaries are. Preserve that reasoning so the next conversation does not restart with an unsupported assumption of eligibility.

## Before you move forward

- Define the recipient and permitted use before asking for clearance.
- Give every yes an evidence reference and an accountable owner.
- Keep unreviewed categories outside any proposed transfer.
- Record no and escalate decisions as clearly as yes decisions.

## Sources and scope

The U.S. Copyright Office treats AI training and the copyrightability of AI outputs as separate subjects in its AI initiative. The ICO explains that pseudonymised personal data remains subject to data-protection law in the UK. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [Copyright and Artificial Intelligence | U.S. Copyright Office](https://www.copyright.gov/ai/)
- [Pseudonymisation | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)

[Discuss eligibility without uploading records](/contact/)
