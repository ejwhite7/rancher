import fs from "node:fs/promises";
import {
  createClient,
  createWriteClient,
  createMigration,
} from "@prismicio/client";
import { editorClient, assertUnchanged } from "../glossary-audit.mjs";
const execute = process.argv.includes("--execute"),
  client = createClient("rancher"),
  editor = await editorClient("rancher");
const cp = JSON.parse(
  await fs.readFile(".prismic-migration/corral/checkpoint.json", "utf8"),
);
const migration = createMigration(),
  updates = [];
for (const type of ["navigation", "footer"]) {
  const live = await client.getSingle(type);
  const meta = await editor("core/documents/" + live.id);
  const target = {
    ...live.data,
    items: live.data.items.some((i) => i.link?.url === "/blog/")
      ? live.data.items
      : [
          ...live.data.items,
          { label: "The Corral", link: { link_type: "Web", url: "/blog/" } },
        ],
  };
  for (const v of meta.versions) {
    const expected =
      v.status === "published"
        ? live.data
        : cp.documents[type]?.data || live.data;
    assertUnchanged(
      await editor("core/documents/data/" + v.version_id),
      expected,
      type + " " + v.status,
    );
  }
  if (
    cp.documents[type] &&
    JSON.stringify(cp.documents[type].data) === JSON.stringify(target)
  )
    continue;
  updates.push(type);
  if (execute) {
    migration.updateDocument(
      { ...live, data: target },
      type === "navigation" ? "Navigation" : "Footer",
    );
    cp.documents[type] = { id: live.id, type, uid: null, data: target };
  }
}
if (execute && updates.length) {
  await createWriteClient("rancher", {
    writeToken: process.env.PRISMIC_WRITE_TOKEN,
  }).migrate(migration);
  await fs.writeFile(
    ".prismic-migration/corral/checkpoint.json",
    JSON.stringify(cp, null, 2) + "\n",
    { mode: 0o600 },
  );
}
console.log(
  JSON.stringify({
    mode: execute ? "draft" : "dry-run",
    updates,
    publication: false,
  }),
);
