import fs from "node:fs/promises";
import { homedir } from "node:os";
import { editorClient } from "../glossary-audit.mjs";
// Materialize current migration edits in the preview API; never publish.
const execute = process.argv.includes("--execute");
const cp = JSON.parse(
  await fs.readFile(".prismic-migration/corral/checkpoint.json", "utf8"),
);
const editor = await editorClient("rancher");
const releases = new Set();
for (const doc of Object.values(cp.documents)) {
  const meta = await editor("core/documents/" + doc.id);
  for (const version of meta.versions) {
    if (version.status === "release" && version.release_id)
      releases.add(version.release_id);
  }
}
if (execute) {
  const credentials = JSON.parse(
    await fs.readFile(`${homedir()}/.config/prismic/credentials.json`, "utf8"),
  );
  for (const id of releases) {
    const response = await fetch(
      `https://rancher.prismic.io/core/releases/${encodeURIComponent(id)}/refresh`,
      {
        method: "POST",
        headers: {
          Cookie: `prismic-auth=${credentials.token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
    if (!response.ok)
      throw Error(`Preview refresh failed (${response.status})`);
  }
}
console.log(
  JSON.stringify({
    mode: execute ? "refresh-preview" : "dry-run",
    releases: releases.size,
    published: false,
  }),
);
