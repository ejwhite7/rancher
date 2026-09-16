import fs from "node:fs/promises";
import { editorClient } from "../glossary-audit.mjs";
import { assertCorralUnchanged } from "./audit.mjs";
import { deterministicHash } from "./engine.mjs";
const cp = JSON.parse(
    await fs.readFile(".prismic-migration/corral/checkpoint.json"),
  ),
  manifest = JSON.parse(await fs.readFile("content/corral/manifest.json"));
const editor = await editorClient("rancher");
const report = [];
for (const [key, d] of Object.entries(cp.documents)) {
  const meta = await editor("core/documents/" + d.id);
  for (const v of meta.versions.filter((v) => v.status === "release"))
    assertCorralUnchanged(
      await editor("core/documents/data/" + v.version_id),
      { ...d.data, ...(d.uid ? { uid: d.uid } : {}) },
      key,
    );
  const b = manifest.articles.find((b) => b.content_key === key);
  if (b) {
    b.workflow_state = meta.versions.some((v) => v.status === "published")
      ? "published"
      : "imported_draft";
    b.prismic_id = d.id;
    const a = JSON.parse(
      await fs.readFile(`content/corral/articles/${key}.json`),
    );
    b.content_sha256 = a.content_sha256;
    const review = JSON.parse(
      await fs.readFile(`content/corral/reviews/${key}.json`),
    );
    review.cms_payload_sha256 = deterministicHash(d.data);
    await fs.writeFile(
      `content/corral/reviews/${key}.json`,
      JSON.stringify(review, null, 2) + "\n",
    );
  }
  report.push({
    key,
    id: d.id,
    state: meta.versions.map((v) => v.status),
    reconciled: true,
    slices: d.data.slices?.length,
    source_count: d.data.sources?.length,
    unresolved_related_keys:
      b?.related_keys.filter((k) => !cp.documents[k]) || [],
  });
}
await fs.writeFile(
  "content/corral/reconciliation/report.json",
  JSON.stringify(report, null, 2) + "\n",
);
await fs.writeFile(
  "content/corral/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    documents: report.length,
    reconciled: true,
    published: report.filter(
      (r) => r.key.startsWith("corral-") && r.state.includes("published"),
    ).length,
  }),
);
