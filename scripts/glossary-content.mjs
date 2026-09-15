import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
export const manifest = JSON.parse(
  await readFile(new URL("../prismic/glossary/manifest.json", import.meta.url)),
);
export const sourceCatalog = JSON.parse(
  await readFile(new URL("../prismic/glossary/sources.json", import.meta.url)),
);
export const aliases = {
  "data-exclusivity": ["Exclusive licensing"],
  "synthetic-training-data": ["Synthetic data"],
  "rl-environment": ["Reinforcement learning environment"],
  "personally-identifiable-information": [
    "Personally identifying information",
    "PII",
  ],
  "rlhf-data": ["Reinforcement learning from human feedback data", "RLHF"],
  "egocentric-video": ["First-person video"],
  "content-provenance-c2pa": ["C2PA", "Content credentials"],
};
export const rich = (text) =>
  text
    .split("\n\n")
    .filter(Boolean)
    .map((text) => ({ type: "paragraph", text, spans: [] }));
export const relationship = (id, type) => ({ link_type: "Document", id, type });
export async function loadDrafts() {
  const files = (
    await readdir(new URL("../prismic/glossary/drafts/", import.meta.url))
  )
    .filter((f) => f.endsWith(".mjs"))
    .sort();
  const entries = (
    await Promise.all(
      files.map(
        async (file) =>
          (
            await import(
              new URL(`../prismic/glossary/drafts/${file}`, import.meta.url)
            )
          ).default,
      ),
    )
  ).flat();
  return entries;
}
export function termData(draft, shared, ids = {}) {
  const entry = manifest.find((m) => m.uid === draft.uid);
  if (!entry) throw Error(`Unknown draft UID ${draft.uid}`);
  return {
    ...shared,
    term: entry.term,
    short_definition: draft.short,
    definition: rich(draft.definition),
    category: entry.category,
    aliases: (aliases[entry.uid] || []).map((alias) => ({ alias })),
    how_it_works: rich(draft.how),
    licensing_relevance: rich(draft.relevance),
    example: rich(draft.example),
    limitations: rich(draft.limitations),
    review_questions: draft.questions.map((question) => ({ question })),
    related_terms: draft.related
      .filter((uid) => ids[uid])
      .map((uid) => ({ term: relationship(ids[uid], "glossary") })),
    sources: draft.sources.map((key) => {
      const source = sourceCatalog[key];
      if (!source) throw Error(`Unknown source ${key}`);
      return {
        label: source.label,
        url: { link_type: "Web", url: source.url },
        accessed_on: "2026-09-15",
      };
    }),
    reviewer_name: draft.reviewer_name || "",
    reviewer_role: draft.reviewer_role || "",
    last_reviewed: draft.last_reviewed || null,
    show_cta: draft.show_cta || false,
    meta_title: `${entry.term}: Meaning & Licensing Context | Rancher`,
    meta_description: draft.short,
    social_image: {},
  };
}
export function indexData(shared, ids = {}) {
  return {
    ...shared,
    title: [
      {
        type: "heading1",
        text: "AI Training Data & Licensing Glossary",
        spans: [],
      },
    ],
    intro: rich(
      "Understand the terms behind AI training data and business data licensing—from workflows and model evaluation to privacy, provenance, and usage rights. Clear explanations to help you understand how data is used and what to consider before licensing yours.",
    ),
    search_placeholder: "Search glossary terms",
    empty_state_title: "No matching terms",
    empty_state_body: rich(
      "Try another term, an acronym, or a broader phrase. You can also clear your filters to browse the full glossary.",
    ),
    featured_terms: [
      "data-licensing",
      "operational-data",
      "de-identification",
      "data-provenance",
      "ai-training-data",
      "computer-use-agent",
    ]
      .filter((uid) => ids[uid])
      .map((uid) => ({ term: relationship(ids[uid], "glossary") })),
    cta_heading: "Explore whether your business data could be a fit.",
    cta_body: rich(
      "Start with a description of your systems—not a data upload.",
    ),
    cta_label: "Talk to Rancher",
    cta_link: { link_type: "Web", url: "https://www.gorancher.com/#contact" },
    meta_title: "AI Training Data & Licensing Glossary | Rancher",
    meta_description:
      "Explore clear definitions of AI training data, business workflows, licensing rights, privacy, and model evaluation. Search 60 terms in the Rancher glossary.",
    social_image: {},
  };
}
export function validateDrafts(
  drafts,
  { complete = false, reviewed = false } = {},
) {
  const seen = new Set();
  const known = new Set(manifest.map((m) => m.uid));
  const errors = [];
  for (const d of drafts) {
    if (!known.has(d.uid) || seen.has(d.uid))
      errors.push(`${d.uid}: unknown or duplicate`);
    seen.add(d.uid);
    for (const field of [
      "short",
      "definition",
      "how",
      "relevance",
      "example",
      "limitations",
    ])
      if (!d[field]?.trim()) errors.push(`${d.uid}: empty ${field}`);
    if (!/fictional example:/i.test(d.example || ""))
      errors.push(`${d.uid}: label the fictional example`);
    if (!d.sources?.length || d.sources.some((k) => !sourceCatalog[k]))
      errors.push(`${d.uid}: invalid sources`);
    if (
      !d.related ||
      d.related.length < 3 ||
      d.related.length > 5 ||
      new Set(d.related).size !== d.related.length ||
      d.related.some((uid) => uid === d.uid || !known.has(uid))
    )
      errors.push(`${d.uid}: invalid related terms`);
    if (!d.questions?.length)
      errors.push(`${d.uid}: missing practical questions`);
    if (
      reviewed &&
      (!d.reviewer_name?.trim() ||
        !d.last_reviewed ||
        d.last_reviewed > new Date().toISOString().slice(0, 10))
    )
      errors.push(`${d.uid}: completed review required`);
  }
  if (complete && seen.size !== 60)
    errors.push(`Expected 60 entries; found ${seen.size}`);
  if (errors.length) throw Error(errors.join("\n"));
}
if (process.argv[1]?.endsWith("glossary-content.mjs")) {
  const drafts = await loadDrafts();
  validateDrafts(drafts, {
    complete: process.argv.includes("--complete"),
    reviewed: process.argv.includes("--reviewed"),
  });
  await mkdir("prismic/glossary", { recursive: true });
  await writeFile(
    "prismic/glossary/entries.json",
    JSON.stringify(
      drafts.map((d) => ({
        uid: d.uid,
        ...termData(
          d,
          {},
          Object.fromEntries(manifest.map((m) => [m.uid, m.uid])),
        ),
      })),
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Validated ${drafts.length} original drafts; ${drafts.filter((d) => d.reviewer_name && d.last_reviewed).length} completed reviews.`,
  );
}
