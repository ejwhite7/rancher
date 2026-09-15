import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  createClient,
  createWriteClient,
  createMigration,
} from "@prismicio/client";
import {
  editorClient,
  auditTracked,
  assertUnchanged,
} from "./glossary-audit.mjs";
import {
  loadDrafts,
  validateDrafts,
  termData,
  indexData,
  relationship,
} from "./glossary-content.mjs";
const command = process.argv[2] || "plan";
if (!["plan", "import"].includes(command))
  throw Error(
    "Use plan or import. Publication is a separate reviewed release action.",
  );
const pilot = process.argv.includes("--pilot");
const repo = process.env.PRISMIC_REPOSITORY_NAME || "rancher";
const lang = process.env.PRISMIC_LOCALE || "en-us";
const path = `.prismic-migration/glossary/${repo}-${lang}-checkpoint.json`;
await mkdir(".prismic-migration/glossary", { recursive: true });
let checkpoint = { repository: repo, lang, documents: {} };
try {
  checkpoint = JSON.parse(await readFile(path, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
if (checkpoint.repository !== repo || checkpoint.lang !== lang)
  throw Error("Checkpoint repository/locale mismatch");
let drafts = await loadDrafts();
if (pilot)
  drafts = drafts.filter((d) =>
    ["data-licensing", "de-identification", "computer-use-agent"].includes(
      d.uid,
    ),
  );
validateDrafts(drafts, { complete: !pilot });
const client = createClient(repo, {
  accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  fetchOptions: { cache: "no-store" },
});
const editor = await editorClient(repo);
const snapshots = await auditTracked(editor, checkpoint, lang);
const [navigation, footer] = await Promise.all([
  client.getSingle("navigation", { lang }),
  client.getSingle("footer", { lang }),
]);
const shared = {
  navigation: relationship(navigation.id, "navigation"),
  footer: relationship(footer.id, "footer"),
};
const planned = [
  ...drafts.map((d) => ({
    key: d.uid,
    title: termData(d, shared).term,
    type: "glossary",
    uid: d.uid,
    draft: d,
  })),
  {
    key: "index",
    title: "AI Training Data & Licensing Glossary",
    type: "glossary-index",
  },
];
console.log(
  JSON.stringify(
    {
      command,
      pilot,
      repository: repo,
      locale: lang,
      create: planned
        .filter((p) => !checkpoint.documents[p.key])
        .map((p) => p.key),
      update: planned
        .filter((p) => checkpoint.documents[p.key])
        .map((p) => p.key),
      publish: false,
    },
    null,
    2,
  ),
);
if (command === "plan") process.exit(0);
const writer = createWriteClient(repo, {
  writeToken: process.env.PRISMIC_WRITE_TOKEN,
  accessToken: process.env.PRISMIC_ACCESS_TOKEN,
});
await writeFile(
  `.prismic-migration/glossary/before-${Date.now()}.json`,
  JSON.stringify({ checkpoint, snapshots }, null, 2),
  { mode: 0o600 },
);
async function save() {
  await writeFile(path, JSON.stringify(checkpoint, null, 2) + "\n", {
    mode: 0o600,
  });
}
// Pass one: establish identities and complete copy, preserving a resumable ID even
// when a later content write fails. No publication call occurs in this script.
for (const item of planned) {
  if (checkpoint.documents[item.key]) continue;
  const data = item.draft ? termData(item.draft, shared) : indexData(shared);
  const migration = createMigration();
  const pending = migration.createDocument(
    { type: item.type, uid: item.uid, lang, data },
    item.title,
  );
  try {
    await writer.migrate(migration);
  } finally {
    if (pending.document.id) {
      checkpoint.documents[item.key] = {
        id: pending.document.id,
        type: item.type,
        uid: item.uid,
        data,
      };
      await save();
    }
  }
  console.log(`Created draft: ${item.title}`);
}
// Pass two: every relationship uses an established real document ID.
const ids = Object.fromEntries(
  Object.entries(checkpoint.documents).map(([key, d]) => [key, d.id]),
);
for (const item of planned) {
  const tracked = checkpoint.documents[item.key];
  const data = item.draft
    ? termData(item.draft, shared, ids)
    : indexData(shared, ids);
  if (JSON.stringify(data) === JSON.stringify(tracked.data)) continue;
  const migration = createMigration();
  migration.updateDocument(
    { id: tracked.id, type: item.type, uid: item.uid, lang, tags: [], data },
    item.title,
  );
  const latest = await editor(`core/documents/${tracked.id}`);
  for (const version of latest.versions)
    assertUnchanged(
      await editor(`core/documents/data/${version.version_id}`),
      { ...tracked.data, ...(tracked.uid ? { uid: tracked.uid } : {}) },
      item.key,
    );
  await writer.migrate(migration);
  tracked.data = data;
  await save();
  console.log(`Linked draft: ${item.title}`);
}
await auditTracked(editor, checkpoint, lang);
console.log(
  `Migration release contains ${Object.keys(checkpoint.documents).length} tracked drafts. Nothing was published.`,
);
