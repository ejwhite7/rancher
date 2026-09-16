import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  createClient,
  createWriteClient,
  createMigration,
} from "@prismicio/client";
import { createClient as typesClient } from "@prismicio/custom-types-client";
import { editorClient, assertUnchanged } from "../glossary-audit.mjs";
import { assertCorralUnchanged } from "./audit.mjs";
const root = "content/corral",
  privateRoot = ".prismic-migration/corral",
  read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const manifest = await read(root + "/manifest.json"),
  execute = process.argv.includes("--execute");
const keys = process.argv
  .find((a) => a.startsWith("--keys="))
  ?.slice(7)
  .split(",") || ["corral-01", "corral-04", "corral-20"];
const briefs = manifest.articles.filter((a) => keys.includes(a.content_key));
if (briefs.length !== keys.length) throw Error("Unknown key");
let checkpoint;
try {
  checkpoint = await read(privateRoot + "/checkpoint.json");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  checkpoint = { assets: {}, documents: {} };
}
const save = () =>
  fs.writeFile(
    privateRoot + "/checkpoint.json",
    JSON.stringify(checkpoint, null, 2) + "\n",
    { mode: 0o600 },
  );
const editor = await editorClient("rancher"),
  client = createClient("rancher");
const inventory = await editor("core/documents/search", { limit: 100 });
if (inventory.total !== inventory.results.length)
  throw Error("Incomplete inventory");
for (const d of inventory.results.filter((d) =>
  ["blog", "blog-index", "authors"].includes(d.custom_type_id),
)) {
  if (!Object.values(checkpoint.documents).some((v) => v.id === d.id))
    throw Error("Untracked blog document requires reconciliation");
}
const types = typesClient({
  repositoryName: "rancher",
  token: process.env.PRISMIC_CUSTOM_TYPES_TOKEN,
});
const models = await types.getAllCustomTypes();
const original = await read(privateRoot + "/public-inventory.json");
for (const id of ["blog", "blog-index", "authors"]) {
  const local = await read(`customtypes/${id}/index.json`),
    live = models.find((m) => m.id === id);
  if (live && JSON.stringify(live.json) !== JSON.stringify(local.json)) {
    const old =
      id === "blog"
        ? await read(privateRoot + "/previous-blog-model.json")
        : original.models.find((m) => m.id === id);
    if (!old) throw Error("Untracked blog model");
    assertUnchanged(live, old, id + " model");
  }
  if (execute) {
    if (live) await types.updateCustomType(local);
    else await types.insertCustomType(local);
  }
}
if (!execute) {
  console.log(
    JSON.stringify({
      mode: "dry-run",
      models: ["blog", "blog-index", "authors"],
      creates: ["blog-index", ...keys].filter((k) => !checkpoint.documents[k]),
      tracked: Object.keys(checkpoint.documents),
      publication: false,
    }),
  );
  process.exit(0);
}
const writer = createWriteClient("rancher", {
  writeToken: process.env.PRISMIC_WRITE_TOKEN,
});
async function asset(file, alt) {
  const bytes = await fs.readFile(file),
    hash = createHash("sha256").update(bytes).digest("hex");
  if (checkpoint.assets[hash]) return checkpoint.assets[hash];
  const migration = createMigration();
  const pending = migration.createAsset(
    new File([bytes], path.basename(file), {
      type: file.endsWith(".png") ? "image/png" : "text/csv",
    }),
    `corral-${hash.slice(0, 12)}-${path.basename(file)}`,
    {
      alt,
      notes: "Original Rancher Corral editorial asset. " + file,
      tags: ["corral"],
    },
  );
  await writer.migrate(migration);
  if (!pending.asset) throw Error("Asset upload missing result");
  checkpoint.assets[hash] = pending.asset;
  await save();
  return pending.asset;
}
const image = (a) => ({
  id: a.id,
  url: a.url,
  dimensions: { width: a.width, height: a.height },
  alt: a.alt,
  copyright: null,
});
const [navigation, footer] = await Promise.all([
  client.getSingle("navigation"),
  client.getSingle("footer"),
]);
const shared = {
  navigation: { link_type: "Document", id: navigation.id, type: "navigation" },
  footer: { link_type: "Document", id: footer.id, type: "footer" },
};
function addInlineSources(draft) {
  for (const s of draft.slices) {
    for (const block of s.primary.body || []) {
      for (const src of draft.sources) {
        const label = src.source_url.url.includes("ico.org")
          ? "ICO"
          : src.source_url.url.includes("nist.gov")
            ? "NIST"
            : src.source_url.url.includes("copyright.gov")
              ? "Copyright Office"
              : null;
        if (!label) continue;
        const at = block.text.indexOf(label);
        if (at >= 0 && !block.spans.some((span) => span.type === "hyperlink"))
          block.spans.push({
            type: "hyperlink",
            start: at,
            end: at + label.length,
            data: src.source_url,
          });
      }
    }
  }
  return draft;
}
async function upsert(key, type, uid, data, title) {
  const existing = checkpoint.documents[key];
  if (existing) {
    const meta = await editor("core/documents/" + existing.id);
    if (meta.versions.some((v) => v.status === "published"))
      throw Error("This draft importer never updates published articles");
    for (const v of meta.versions)
      assertCorralUnchanged(
        await editor("core/documents/data/" + v.version_id),
        { ...existing.data, ...(uid ? { uid } : {}) },
        key + " draft",
      );
    if (JSON.stringify(existing.data) === JSON.stringify(data)) {
      console.log(key + ": unchanged");
      return existing.id;
    }
  }
  const m = createMigration();
  const d = { type, lang: "en-us", ...(uid ? { uid } : {}), data };
  const pending = existing
    ? m.updateDocument({ ...d, id: existing.id }, title)
    : m.createDocument(d, title);
  let complete = false;
  try {
    await writer.migrate(m);
    complete = true;
  } finally {
    if (pending.document.id) {
      checkpoint.documents[key] = {
        id: pending.document.id,
        type,
        uid,
        data: complete ? data : existing?.data || {},
      };
      await save();
    }
  }
  return pending.document.id;
}
const authorPolicy = (await read(root + "/publishing-policy.json")).author;
if (authorPolicy.bio_status !== "approved")
  throw Error("Author bio is not approved");
const authorID = await upsert(
  "author-edward-white",
  "authors",
  "edward-white",
  {
    name: authorPolicy.name,
    title: authorPolicy.title,
    bio: [{ type: "paragraph", text: authorPolicy.proposed_bio, spans: [] }],
    socials: authorPolicy.socials || [],
  },
  authorPolicy.name,
);
for (const b of briefs) {
  const draft = addInlineSources(
      await read(`${root}/drafts/${b.content_key}.json`),
    ),
    article = await read(`${root}/articles/${b.content_key}.json`);
  const hero = image(
    await asset(
      `${root}/assets/${b.content_key}/social.png`,
      `The Corral — ${b.title}`,
    ),
  );
  const slices = [...draft.slices];
  if (draft.diagram) {
    const diagram = image(
      await asset(
        `${root}/assets/${b.content_key}/process.png`,
        "Metadata inventory, authority review, risk assessment, utility assessment and written terms.",
      ),
    );
    slices.splice(1, 0, {
      slice_type: "image_caption",
      primary: {
        image: diagram,
        caption:
          "Illustrative decision sequence, not a verified Rancher operating procedure.",
      },
      items: [],
    });
  }
  if (draft.download) {
    const file = await asset(
      `${root}/assets/${b.content_key}/worksheet.csv`,
      draft.download.name,
    );
    slices.push({
      slice_type: "downloadable_asset",
      primary: {
        heading: draft.download.name,
        description: [
          {
            type: "paragraph",
            text: "Download this editable worksheet. Use metadata and evidence references only; do not put credentials or personal records in it.",
            spans: [],
          },
        ],
        asset: {
          link_type: "Media",
          id: file.id,
          url: file.url,
          name: file.filename,
          kind: file.kind,
          size: String(file.size),
        },
        link_label: "Download CSV worksheet",
      },
      items: [],
    });
  }
  const data = {
    ...shared,
    content_key: b.content_key,
    title: [{ type: "heading1", text: b.title, spans: [] }],
    excerpt: draft.excerpt,
    answer_summary: [{ type: "paragraph", text: draft.answer, spans: [] }],
    topic: b.topic,
    published_at: article.published_at.replace(/\.\d{3}Z$/, "+0000"),
    updated_at: null,
    author: {
      link_type: "Document",
      id: authorID,
      type: "authors",
      uid: "edward-white",
    },
    reviewer_name: null,
    reviewer_role: null,
    slices,
    sources: draft.sources,
    related_articles: b.related_keys
      .filter((k) => checkpoint.documents[k])
      .map((k) => ({
        article: {
          link_type: "Document",
          id: checkpoint.documents[k].id,
          type: "blog",
          uid: checkpoint.documents[k].uid,
        },
      })),
    cta_label: b.cta,
    cta_link: { link_type: "Web", url: "/contact/" },
    meta_title: b.title,
    meta_description: draft.excerpt,
    meta_image: hero,
  };
  await upsert(b.content_key, "blog", b.uid, data, b.title);
}
for (const b of briefs) {
  const tracked = checkpoint.documents[b.content_key];
  const related = b.related_keys
    .filter((k) => checkpoint.documents[k])
    .map((k) => ({
      article: {
        link_type: "Document",
        id: checkpoint.documents[k].id,
        type: "blog",
        uid: checkpoint.documents[k].uid,
      },
    }));
  await upsert(
    b.content_key,
    "blog",
    b.uid,
    { ...tracked.data, related_articles: related },
    b.title,
  );
}
const indexFile = `${root}/assets/index.png`;
try {
  await fs.access(indexFile);
} catch {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f7f6ee"/><text x="70" y="110" font-family="Arial" font-size="40" fill="#193e34">rancher</text><text x="70" y="290" font-family="Georgia" font-size="100" fill="#193e34">The Corral</text><text x="70" y="410" font-family="Arial" font-size="32" fill="#536059">Practical guidance on business-data licensing for AI.</text></svg>';
  await sharp(Buffer.from(svg)).png().toFile(indexFile);
}
const social = image(
  await asset(
    indexFile,
    "The Corral — practical guidance on business-data licensing for AI",
  ),
);
const index = {
  ...shared,
  title: "The Corral",
  introduction: [
    {
      type: "paragraph",
      text: "Practical guidance on business-data licensing for AI. Explore rights, preparation, use cases and the decisions that come before sharing records.",
      spans: [],
    },
  ],
  featured_heading: "Start here",
  library_heading: "Explore the library",
  empty_state: "New articles are on the way.",
  featured_articles: ["corral-01", "corral-04", "corral-20"]
    .filter((k) => checkpoint.documents[k])
    .map((k) => ({
      article: {
        link_type: "Document",
        id: checkpoint.documents[k].id,
        type: "blog",
        uid: checkpoint.documents[k].uid,
      },
    })),
  meta_title: "The Corral | AI Data Licensing Insights | Rancher",
  meta_description:
    "Explore practical guides to licensing business data for AI, including eligibility, privacy, valuation, contracts, and dataset preparation.",
  meta_image: social,
};
await upsert("blog-index", "blog-index", null, index, "The Corral");
await fs.mkdir(`${root}/reconciliation`, { recursive: true });
await fs.writeFile(
  `${root}/reconciliation/documents.json`,
  JSON.stringify(
    Object.fromEntries(
      Object.entries(checkpoint.documents).map(([k, v]) => [
        k,
        { id: v.id, type: v.type, uid: v.uid },
      ]),
    ),
    null,
    2,
  ) + "\n",
);
console.log("Drafts imported. No publication or schedule was activated.");
