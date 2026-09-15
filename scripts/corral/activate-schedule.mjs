// Uses the same repository endpoints and millisecond dates as the inspected
// Prismic Page Builder. Endpoint contract captured 2026-09-15; verify on upgrade.
// No publication capability is enabled until all exact-content review gates pass.
import fs from "node:fs/promises";
import os from "node:os";
import {
  canonicalArticleHash,
  deterministicHash,
  publicationPreflight,
} from "./engine.mjs";
import { inPublishingWindow } from "./schedule.mjs";
import { assertCorralUnchanged as assertUnchanged } from "./audit.mjs";
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const root = "content/corral";
const manifest = await read(root + "/manifest.json"),
  profile = await read(root + "/rancher-profile.json"),
  slots = await read(root + "/proposed-schedule.json");
const execute = process.argv.includes("--execute");
const failures = [],
  items = [];
if (manifest.articles.length !== 24 || slots.length !== 24)
  failures.push("Expected exactly 24 articles and slots");
const keys = new Set(),
  uids = new Set(),
  dates = new Set();
for (const b of manifest.articles) {
  if (keys.has(b.content_key) || uids.has(b.uid))
    failures.push("Duplicate article identity");
  keys.add(b.content_key);
  uids.add(b.uid);
  const slot = slots.find((s) => s.content_key === b.content_key);
  if (
    !slot ||
    !inPublishingWindow(slot.scheduled_at) ||
    Date.parse(slot.scheduled_at) < Date.now() + 600000
  )
    failures.push(b.content_key + ": future weekday slot required");
  if (slot) {
    if (dates.has(slot.scheduled_at)) failures.push("Duplicate slot");
    dates.add(slot.scheduled_at);
  }
  try {
    const article = await read(`${root}/articles/${b.content_key}.json`),
      qa = await read(`${root}/qa/${b.content_key}.json`),
      review = await read(`${root}/reviews/${b.content_key}.json`);
    if (article.published_at !== slot?.scheduled_at)
      failures.push(b.content_key + ": article date differs from schedule");
    if (
      review.content_sha256 !== canonicalArticleHash(article) ||
      !review.editorial?.by ||
      !review.editorial?.at ||
      !review.specialist?.by ||
      !review.specialist?.at ||
      review.specialist.required_roles !== b.reviewer_roles
    )
      failures.push(
        b.content_key +
          ": exact-hash editorial and assigned specialist approvals required",
      );
    const preflight = await publicationPreflight({
      article,
      qaReport: qa,
      profile,
      execute: false,
      adapter: {
        id: "prismic-corral",
        canPublish: false,
        preflight: async () => [],
        publish: async () => {
          throw Error(
            "Direct engine publication disabled; use verified scheduled releases",
          );
        },
      },
    });
    failures.push(...preflight.errors.map((e) => b.content_key + ": " + e));
    items.push({ brief: b, article, slot });
  } catch (e) {
    failures.push(b.content_key + ": package incomplete");
  }
}
const report = {
  mode: execute ? "execute" : "dry-run",
  ready: failures.length === 0,
  failures,
  timezone: "America/New_York",
  schedule: slots,
};
await fs.writeFile(
  root + "/schedule-preflight.json",
  JSON.stringify(report, null, 2) + "\n",
);
if (failures.length) {
  console.log(
    JSON.stringify({
      ready: false,
      failures: failures.length,
      report: root + "/schedule-preflight.json",
    }),
  );
  if (execute) process.exitCode = 1;
  process.exit();
}
if (!execute) {
  console.log(
    JSON.stringify({ ready: true, articles: items.length, publication: false }),
  );
  process.exit();
}
const credentials = await read(
  os.homedir() + "/.config/prismic/credentials.json",
);
if (credentials.host && credentials.host !== "prismic.io")
  throw Error("Unexpected editor host");
async function editor(path, body, method = body ? "POST" : "GET") {
  const r = await fetch("https://rancher.prismic.io/core/" + path, {
    method,
    headers: {
      Cookie: `prismic-auth=${credentials.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw Error(`Prismic schedule action failed (${r.status})`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
const checkpoint = await read(".prismic-migration/corral/checkpoint.json");
let scheduled;
try {
  scheduled = await read(".prismic-migration/corral/scheduled.json");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  scheduled = {};
}
const save = () =>
  fs.writeFile(
    ".prismic-migration/corral/scheduled.json",
    JSON.stringify(scheduled, null, 2) + "\n",
    { mode: 0o600 },
  );
// Verify the entire library before creating any timed release.
for (const { brief, article } of items) {
  const d = checkpoint.documents[brief.content_key];
  if (!d) throw Error("Missing Prismic document " + brief.content_key);
  const review = await read(`${root}/reviews/${brief.content_key}.json`);
  if (review.cms_payload_sha256 !== deterministicHash(d.data))
    throw Error("CMS payload is not bound to the reviewed package");
  if (
    d.data.author_name !== article.author ||
    Date.parse(d.data.published_at) !== Date.parse(article.published_at)
  )
    throw Error("Prismic metadata differs from approved article");
  if (d.data.related_articles.length !== brief.related_keys.length)
    throw Error("Unresolved related articles");
  const meta = await editor("documents/" + d.id);
  if (meta.versions.some((v) => v.status === "published"))
    throw Error("Article is already live");
  for (const v of meta.versions)
    assertUnchanged(
      await editor("documents/data/" + v.version_id),
      { ...d.data, uid: brief.uid },
      brief.content_key,
    );
}
async function move(key, releaseId) {
  const d = checkpoint.documents[key];
  if (!d) throw Error("Missing launch document " + key);
  const meta = await editor("documents/" + d.id);
  const version =
    meta.versions.find(
      (v) => v.status === "release" && v.release_id === releaseId,
    ) || meta.versions.find((v) => v.status === "release");
  if (!version) throw Error("No release draft for " + key);
  assertUnchanged(
    await editor("documents/data/" + version.version_id),
    { ...d.data, ...(d.uid ? { uid: d.uid } : {}) },
    key + " scheduled draft",
  );
  if (version.release_id !== releaseId)
    await editor(
      `documents/${d.id}/release`,
      { status: `release:${releaseId}`, release_id: version.release_id },
      "PATCH",
    );
}
for (let i = 0; i < items.length; i++) {
  const { brief, slot } = items[i];
  let release = scheduled[brief.content_key];
  if (!release) {
    release = await editor("releases", {
      label: `The Corral — ${brief.content_key}`,
    });
    scheduled[brief.content_key] = {
      id: release.id,
      scheduled_at: slot.scheduled_at,
      state: "created",
    };
    await save();
  }
  await move(brief.content_key, release.id);
  if (i === 0)
    for (const key of ["blog-index", "navigation", "footer"])
      await move(key, release.id);
  const permissions = await editor(`releases/${release.id}/permissions`);
  if (!permissions.canPublish)
    throw Error("Release publishing permission missing");
  const size = await editor(`releases/${release.id}/size`);
  if (size.documentsCount !== (i === 0 ? 4 : 1))
    throw Error("Unexpected release contents");
  await editor(`releases/${release.id}/schedule`, {
    date: Date.parse(slot.scheduled_at),
  });
  scheduled[brief.content_key].state = "scheduled";
  await save();
}
const releases = await editor("releases?include_migration_releases=true");
for (const { brief, slot } of items) {
  const r = releases.results.find(
    (r) => r.id === scheduled[brief.content_key].id,
  );
  if (r?.timestamp !== Date.parse(slot.scheduled_at))
    throw Error("Schedule readback differs");
}
console.log("Verified 24 native Prismic scheduled releases.");
