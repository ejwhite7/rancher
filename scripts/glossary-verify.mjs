import { writeFile, mkdir } from "node:fs/promises";
import { editorClient, normalizedContent } from "./glossary-audit.mjs";
import { manifest } from "./glossary-content.mjs";
const repo = process.env.PRISMIC_REPOSITORY_NAME || "rancher";
const lang = process.env.PRISMIC_LOCALE || "en-us";
const editor = await editorClient(repo);
const all = await editor("core/documents/search", {
  customTypes: ["glossary", "glossary-index"],
  limit: 100,
});
if (all.total !== 61 || all.results.length !== 61)
  throw Error(`Expected 60 terms and one index; found ${all.total}`);
const docs = [];
const warnings = [];
const today = new Date().toISOString().slice(0, 10);
for (const doc of all.results) {
  if (doc.locale !== lang) throw Error(`Unexpected locale: ${doc.id}`);
  // Verify the newest working version. Every version is retained in the backup.
  const versions = [...doc.versions].sort(
    (a, b) => b.last_modified_date - a.last_modified_date,
  );
  const data = normalizedContent(
    await editor(`core/documents/data/${versions[0].version_id}`),
  );
  docs.push({ ...doc, data, version: versions[0] });
}
const terms = docs.filter((d) => d.custom_type_id === "glossary");
const indexes = docs.filter((d) => d.custom_type_id === "glossary-index");
if (terms.length !== 60 || indexes.length !== 1)
  throw Error("Incorrect custom type counts");
const ids = new Set(terms.map((t) => t.id));
const uids = new Set();
const metaTitles = new Set();
const metaDescriptions = new Set();
let reviewed = 0;
const errors = [];
for (const doc of terms) {
  const d = doc.data;
  const uid = doc.version.uid;
  const expected = manifest.find((m) => m.uid === uid);
  if (!expected || uids.has(uid)) {
    errors.push(`Unknown or duplicate UID: ${uid}`);
    continue;
  }
  uids.add(uid);
  if (d.term !== expected.term || d.category !== expected.category)
    errors.push(`${uid}: name/category differs from manifest`);
  for (const key of [
    "term",
    "short_definition",
    "definition",
    "how_it_works",
    "licensing_relevance",
    "example",
    "limitations",
    "meta_title",
    "meta_description",
  ])
    if (
      !d[key] ||
      (Array.isArray(d[key]) && !d[key].some((b) => b.text?.trim()))
    )
      errors.push(`${uid}: missing ${key}`);
  metaTitles.add(d.meta_title);
  metaDescriptions.add(d.meta_description);
  const related = (d.related_terms || []).map((r) => r.term?.id);
  if (
    related.length < 3 ||
    related.length > 5 ||
    new Set(related).size !== related.length ||
    related.some((id) => id === doc.id || !ids.has(id))
  )
    errors.push(`${uid}: invalid related terms`);
  if (!d.navigation?.id || !d.footer?.id)
    errors.push(`${uid}: missing shared navigation/footer`);
  if (
    !d.sources?.length ||
    d.sources.some((s) => !s.label || !/^https?:\/\//.test(s.url?.url || ""))
  )
    errors.push(`${uid}: invalid sources`);
  const validDate =
    typeof d.last_reviewed === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.last_reviewed) &&
    !Number.isNaN(Date.parse(d.last_reviewed)) &&
    d.last_reviewed <= today;
  if (d.reviewer_name?.trim() && validDate) reviewed++;
  else warnings.push(`${uid}: actual completed review metadata required`);
}
if (metaTitles.size !== 60 || metaDescriptions.size !== 60)
  errors.push("SEO metadata must be unique");
const index = indexes[0].data;
if (
  !index.title?.[0]?.text ||
  !index.intro?.length ||
  !index.meta_title ||
  !index.meta_description
)
  errors.push("Incomplete index");
if (
  (index.featured_terms || []).length > 6 ||
  (index.featured_terms || []).some((f) => !ids.has(f.term?.id))
)
  errors.push("Invalid featured terms");
const report = {
  checked_at: new Date().toISOString(),
  repository: repo,
  locale: lang,
  terms: terms.length,
  indexes: indexes.length,
  reviewed,
  errors,
  warnings,
  documents: terms.map((d) => ({
    id: d.id,
    uid: d.version.uid,
    title: d.title,
    status: d.version.status,
    reviewer: d.data.reviewer_name || null,
    last_reviewed: d.data.last_reviewed || null,
  })),
};
await mkdir(".prismic-migration/glossary", { recursive: true });
await writeFile(
  ".prismic-migration/glossary/verification.json",
  JSON.stringify(report, null, 2) + "\n",
  { mode: 0o600 },
);
console.log(
  JSON.stringify(
    {
      terms: terms.length,
      indexes: indexes.length,
      reviewed,
      errors,
      publicationReady: errors.length === 0 && reviewed === 60,
    },
    null,
    2,
  ),
);
if (errors.length || (!process.argv.includes("--drafts") && reviewed !== 60))
  process.exitCode = 1;
