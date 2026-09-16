# Training and evaluation data need different rules

Training data influences a model’s behavior or parameters, while evaluation data is used to assess behavior against a defined task or criterion. The distinction changes how data should be separated, documented and permitted under a license. Evaluation access should not be assumed to include training permission, and a held-out label does not by itself prevent contamination or prove that an assessment is independent.

## Begin with the actual activity

Ask the recipient to describe what it intends to do, not merely which label it uses for the project. Training can include activities intended to adapt a model, while evaluation can include testing responses, comparing systems or measuring performance on a defined task. A workflow that begins as evaluation may later involve development decisions or a request to reuse records for another purpose. Those transitions need to be visible.

Translate the activity into a dataset description and a permitted-use discussion. Identify the records, people and systems involved, the intended outputs and what will be retained. A broad reference to AI use can conceal important differences. The commercial and technical teams should be able to explain the proposal in consistent terms before relying on a license label or accepting a delivery.

## Explain what training permission is meant to cover

If a recipient proposes fine-tuning or another training activity, clarify which material will influence the process and what rights are being requested. Ask about access, copies, transformations, [onward sharing](/glossary/onward-sharing/) and trained artifacts. The answers should inform the relevant contractual review rather than being inferred from the presence of a training folder or a generic technical description.

Keep the source records distinct from outputs and artifacts created during the work. Deleting a source copy does not necessarily describe what happens to every resulting artifact. Ask technically specific questions about retention and use rather than assuming one deletion statement covers all of them. This article does not prescribe contract language; it identifies the categories that the parties should understand when defining the actual arrangement.

## Training and evaluation comparison

| Dimension | Training proposal | Evaluation proposal |
| --- | --- | --- |
| Primary activity | Use material to influence model development | Assess behavior against a defined task |
| Permission question | Which adaptation uses and artifacts are covered? | Which tests, recipients and retained results are covered? |
| Data boundary | Document sources, transformations and allowed reuse | Document held-out selection and exposure |
| Leakage concern | Avoid using reserved evaluation information in development | Explain known prior use and related-record overlap |
| Change request | New sources or uses require defined review | A later training request is not automatically permitted |

## Define evaluation as a controlled question

An evaluation needs a task, an input, a criterion and a process for interpreting the result. A collection of records does not become a useful benchmark merely because it is labeled [evaluation data](/glossary/evaluation-data/). Explain what behavior is being assessed and which limitations affect the conclusion. A support-resolution dataset, for example, needs a defensible account of what counts as a resolution before it can support an outcome-based assessment.

Document how evaluation records were selected and whether the collection represents the intended setting. Cases chosen because they are complete and easy to interpret may support a different conclusion from a broader operational sample. Preserve difficult or missing-context cases where the task requires them, or explain their exclusion. An evaluation result should not be presented as evidence about circumstances that the underlying collection does not meaningfully cover.

## Keep held-out information out of development decisions

The separation between training and evaluation is more than a directory structure. Related records, duplicated content, later versions and preparation choices can carry information across the intended boundary. Decide what unit must remain together when assigning splits. Depending on the task, that might be a case, a document family, a time period or another documented grouping rather than an individual row.

Record known prior use of the material. If evaluation content has already informed prompts, model selection or preparation rules, the recipient should understand that context before treating a result as independent evidence. The scikit-learn [documentation](/blog/ai-data-card-template/) illustrates how test-data involvement in preprocessing can create optimistic estimates. The broader lesson is to make information flow visible, not to assume that a single split operation proves contamination cannot occur.

## Work through a fictional change of purpose

Imagine a fictional recipient initially requesting a bounded set of support cases to compare two response systems. The proposed permission covers that evaluation, with an agreed handling process and a documented label policy. After reviewing the material, the recipient asks to use the same cases for [fine-tuning](/glossary/fine-tuning/). That is a new proposed activity requiring review of the permission, scope and obligations.

The company should not treat technical possession as approval for the new use. Nor should the recipient assume that a successful evaluation makes training rights automatic. Record the change request, identify the affected records and revisit the relevant decisions. The example is illustrative; it does not establish that either activity is permissible for a particular archive or that an evaluation arrangement has any standard commercial terms.

## Document purpose-specific preparation and controls

The same source can produce different candidate datasets for different purposes. An evaluation set may need stable task definitions and carefully controlled exposure, while a training proposal may raise different questions about breadth, repeated use and resulting artifacts. The relevant requirements should be agreed for the actual project. Avoid treating either category as uniformly more valuable, safer or easier to prepare.

Explain transformations and exclusions in both cases. If a preparation choice changes label meaning or removes context needed for the task, document the effect. Identify who can access the material and whether other parties participate in the work. These controls and descriptions should match the licensed activity rather than a generic template that no one has checked against the recipient’s actual workflow.

## Make changes in use explicit

A practical [agreement](/blog/ai-data-licensing-agreement-terms/) and operating process should provide a way to identify and review changes in purpose, recipients or scope. Keep a record of dataset versions and the permissions associated with each. If the parties decide to consider another use, define that proposal separately rather than letting it emerge through informal technical experimentation. Clear boundaries help both sides understand what has and has not been agreed.

Use the comparison worksheet to prepare the discussion with technical, commercial and legal owners. The output should identify the intended activity, the required evidence and unresolved questions. It should not promise that a license prevents every form of contamination or that a dataset will improve a model. A sound decision makes the [permitted use](/glossary/permitted-use/) and the limits of the evidence understandable before the material is transferred.

## Before you move forward

- Describe the actual activity rather than relying on a project label.
- Document split units and known prior use.
- Separate source files from outputs and trained artifacts.
- Review a change from evaluation to training as a new proposed use.

## Sources and scope

The scikit-learn documentation warns that allowing test data to influence model development can produce overly optimistic results. The U.S. Copyright Office treats AI training and the copyrightability of AI outputs as separate subjects in its AI initiative. These sources inform the questions above; they do not establish rights, safety, commercial value or acceptance for a particular dataset. The worksheet is a decision aid, not a clearance certificate.

## Sources

- [scikit-learn — Common pitfalls and recommended practices](https://scikit-learn.org/stable/common_pitfalls.html)
- [Copyright and Artificial Intelligence | U.S. Copyright Office](https://www.copyright.gov/ai/)

[Discuss training or evaluation requirements](/contact/)
