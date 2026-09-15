import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
// Read-only editor audit, authenticated exactly as the installed Prismic CLI.
// The Migration API has no read operation; public refs can lag unsaved release changes.
export async function editorClient(repository) {
  const credentials = JSON.parse(
    await readFile(`${homedir()}/.config/prismic/credentials.json`, "utf8"),
  );
  const host = credentials.host || "prismic.io";
  if (host !== "prismic.io") throw Error("Unexpected Prismic CLI host");
  return async (path, body) => {
    const response = await fetch(`https://${repository}.${host}/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Cookie: `prismic-auth=${credentials.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok)
      throw Error(`Prismic editor audit failed (${response.status})`);
    return response.json();
  };
}
export function normalizedContent(value) {
  if (value == null || value === "") return null;
  if (Array.isArray(value))
    return value.length ? value.map(normalizedContent) : null;
  if (typeof value === "object") {
    if (value.kind === "document" || value.link_type === "Document")
      return { id: value.id };
    if (value.kind === "web" || value.link_type === "Web")
      return { url: value.url };
    if (value.type && value.content?.text !== undefined)
      return normalizedContent({ type: value.type, ...value.content });
    const entries = Object.entries(value)
      .filter(
        ([key]) =>
          !/(?:_TYPE|_POSITION|_KEY|_INTERNAL)$/.test(key) &&
          !["direction", "key"].includes(key),
      )
      .map(([key, v]) => [key, normalizedContent(v)])
      .filter(([, v]) => v !== null)
      .sort(([a], [b]) => a.localeCompare(b));
    return entries.length ? Object.fromEntries(entries) : null;
  }
  return value;
}
export function assertUnchanged(actual, expected, label) {
  if (
    JSON.stringify(normalizedContent(actual)) !==
    JSON.stringify(normalizedContent(expected))
  ) {
    const a = normalizedContent(actual) || {},
      e = normalizedContent(expected) || {};
    const fields = [...new Set([...Object.keys(a), ...Object.keys(e)])].filter(
      (k) => JSON.stringify(a[k]) !== JSON.stringify(e[k]),
    );
    throw Error(
      `Unexpected editor changes for ${label}: ${fields.join(", ")}. Refusing overwrite; reconcile the saved checkpoint.`,
    );
  }
}
export async function auditTracked(editor, checkpoint, lang) {
  const response = await editor("core/documents/search", {
    customTypes: ["glossary", "glossary-index"],
    limit: 100,
  });
  if (response.total > response.results.length)
    throw Error("Unexpected audit pagination; refusing incomplete audit");
  const visible = new Set();
  const snapshots = [];
  for (const doc of response.results) {
    if (doc.locale !== lang)
      throw Error("Unexpected glossary locale; reconcile before import");
    const key =
      doc.custom_type_id === "glossary-index" ? "index" : doc.versions[0]?.uid;
    const tracked = checkpoint.documents[key];
    if (!tracked || tracked.id !== doc.id)
      throw Error(
        `Untracked glossary document ${key || doc.id}; refusing overwrite`,
      );
    visible.add(doc.id);
    for (const version of doc.versions) {
      const data = await editor(`core/documents/data/${version.version_id}`);
      assertUnchanged(
        data,
        { ...tracked.data, ...(tracked.uid ? { uid: tracked.uid } : {}) },
        key,
      );
      snapshots.push({ id: doc.id, key, version, data });
    }
  }
  for (const tracked of Object.values(checkpoint.documents))
    if (!visible.has(tracked.id))
      throw Error(
        `Tracked document ${tracked.id} is missing; refusing recreation`,
      );
  return snapshots;
}
