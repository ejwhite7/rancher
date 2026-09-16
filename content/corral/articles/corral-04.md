# 12 terms to review in an AI data license

Review an AI data license as a set of permissions, restrictions and measurable obligations. Identify the material and permitted uses, then examine recipients, security, retention, fees and remedies together. This term-review table is a discussion aid for counsel, not a contract template or a conclusion that a proposed use is lawful.

## Describe the deal before debating individual clauses

Write a short statement of the proposed transaction in ordinary language: the supplying entity, intended recipient, covered records, allowed use and expected commercial exchange. If those five points are ambiguous, individual clauses can appear precise while referring to different assumptions. Keep the dataset version and exclusions attached to that statement.

Separate the authority to provide material from the buyer’s contractual permission to use it. A license from your company cannot resolve rights your company does not hold. The U.S. Copyright Office’s AI materials are useful background on training and copyright; they do not establish ownership or permission for your dataset. Ask counsel which underlying agreements and jurisdictions govern the proposed scope.

## Twelve terms to review with counsel

| Term | Question to resolve | Evidence or operational detail |
| --- | --- | --- |
| Parties | Who grants rights and which legal entity receives them? | Entity names, authority to sign and affiliate access |
| Scope | Which records and versions are included or excluded? | Dataset inventory, dates, fields and exclusion schedule |
| Rights | What authority supports the grant? | Relevant agreements, assignments and third-party restrictions |
| Permitted purposes | Are training, evaluation and other uses distinguished? | Specific use definitions and controls for each purpose |
| Exclusivity | Which uses, territories and periods restrict other deals? | A precise boundary and a record of existing obligations |
| Onward sharing | Can recipients share with vendors, affiliates or others? | Approved recipient classes and corresponding obligations |
| Security | What controls and evidence apply before and after transfer? | Access, transfer, logging and incident procedures |
| Retention | How long can each category of material be kept? | Retention schedule and treatment of backups |
| Deletion | Which copies can be removed and how is completion shown? | Deletion scope, exceptions and confirmation process |
| Derived artifacts | What happens to trained artifacts and other outputs? | Technical description of artifacts, permitted retention and use |
| Fees | What triggers payment and who bears preparation costs? | Acceptance conditions, milestones, deductions and disputes |
| Remedies | What happens after breach, termination or disagreement? | Escalation, suspension, enforcement and survival provisions |

## Make permitted use testable

Broad phrases such as “AI purposes” leave substantial room for disagreement. A proposed use might involve training, fine-tuning, held-out evaluation or another activity. Ask the recipient to describe the actual workflow and which people or services receive the material. Counsel can then assess whether the permissions and controls align.

For a fictional evaluation-only arrangement, the business question is whether the records can also enter model-development systems. A label saying “evaluation” does not answer that question. Discuss separation, access and evidence of compliance. The correct controls depend on the actual workflow, not this hypothetical example.

## Do not collapse retention, deletion and model behavior

Source files, backups, intermediate datasets, logs, model checkpoints and evaluation reports are not the same object. Ask for a category-by-category account of what is retained, who controls it, and what can be removed. If a recipient offers a deletion promise, clarify its scope and exceptions before relying on it.

A requirement to delete supplied files should not be read as a guarantee that an already trained model forgets their contents. Ask for technical evidence about any broader claim and legal advice about the wording. Avoid promising your own customers a result that the recipient cannot demonstrate.

## Privacy review remains separate

The ICO’s UK guidance distinguishes pseudonymisation from anonymisation and explains that pseudonymised information remains personal data. Contract language and removal of names do not eliminate the need to examine applicable privacy obligations. The guidance is jurisdiction-specific and currently marked as under review.

## Connect acceptance and payment conditions

Specify whether a fee is due on signing, delivery, acceptance or another event. Ask who decides whether delivery meets the agreed criteria, how objections are documented, and what happens if preparation reveals that the usable scope is smaller than expected. Keep the decision criteria tied to the versioned dataset description.

Also consider the interaction between fees and restrictions. A proposal with limited payment certainty and broad exclusivity may have a different cost to the business from a narrowly scoped non-exclusive proposal. This is a commercial question for the actual deal; no generic table can determine an appropriate fee or allocation of risk.

## Prepare for the review meeting

- Bring a metadata inventory and a list of material explicitly excluded from the proposal.
- Identify existing licenses, confidentiality commitments and unresolved rights questions.
- Ask the recipient for a plain-language account of its intended uses and retained artifacts.
- Assign owners to security, privacy, technical, finance and legal questions.
- Record unresolved terms and avoid transferring records while required decisions remain open.

## Keep the review record with the dataset version

Save the final scope, approval record and executed terms together with the dataset version identifier. If later refreshes add fields, records, recipients or purposes, revisit the relevant questions instead of treating the first review as unlimited permission. The table is useful only when it points to the evidence and decisions for the actual transaction.

## Walk one proposed use through the agreement

Read the draft agreement against a concrete, fictional example. Suppose a recipient wants historical support records to evaluate a model that categorizes incoming requests. Trace that proposed use from receipt to final deletion: who receives the files, where copies are stored, which team performs the evaluation, what outputs are retained and whether another party can access them. The exercise is a way to identify questions for the negotiating team, not a substitute for interpreting the agreement.

Now change one fact at a time. What if the recipient wants to train a model rather than evaluate it? What if an affiliate takes over the work, or an external contractor runs the evaluation? What if the recipient asks for monthly updates instead of a one-time delivery? Each variation should have a clear treatment in the proposed scope. If the answer depends on informal assurances that do not appear in the draft, record the mismatch for resolution before signing.

Distinguish the material delivered from the results created with it. A contract might refer separately to source records, transformed datasets, annotations, evaluation reports and model artifacts. Ask the parties to use consistent names and explain what permissions apply to each category. Broad phrases such as derived data can hide different expectations. A shared example often makes a disagreement visible sooner than another abstract definition.

## Make acceptance and change requests operational

An acceptance clause needs a procedure that the people doing the work can follow. Identify the delivery format, the checks the recipient will perform, the period for reporting problems and the process for resolving a disputed rejection. Consider how the parties would handle missing fields, duplicate records or a misunderstanding about historical coverage. This is a checklist for negotiation; it does not prescribe which party should bear a particular cost or risk.

Clarify the boundary between correcting a delivery and expanding the project. Replacing an unreadable file may be different from adding a new source system or supplying a longer period of history. Record how additional work is requested, scoped and priced, and who can authorize it. Otherwise, a limited delivery can become an open-ended preparation obligation without either party making that decision explicitly.

Before final approval, assemble the documents that the agreement depends on: the dataset description, exclusions, permitted-use schedule, security requirements and payment milestones. Check that version names and references match. Assign someone to keep the executed documents and the delivery record together. After signing, operational teams need the agreed boundaries in a form they can use; a contract stored away from the people preparing the data will not answer their day-to-day questions.

## Sources

- [U.S. Copyright Office — Copyright and Artificial Intelligence](https://www.copyright.gov/ai/)
- [ICO — Pseudonymisation guidance (UK)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)

[Discuss licensing boundaries](/contact/)
