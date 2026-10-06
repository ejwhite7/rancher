import { normalizedContent } from "../glossary-audit.mjs";
function isTimestamp(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}
function isImage(value) {
  if (!value.url) return false;
  return (value.origin && value.width) || value.dimensions;
}
function normalizeImage(value) {
  return {
    id: value.id || value.origin.id,
    url: value.url,
    alt: value.alt || null,
    dimensions: {
      width: value.dimensions?.width || value.width,
      height: value.dimensions?.height || value.height,
    },
    edit: value.edit || {
      background: "transparent",
      crop: { x: 0, y: 0 },
      zoom: 1,
    },
  };
}
export function normalizeCorral(value) {
  if (isTimestamp(value)) return new Date(value).toISOString();
  if (Array.isArray(value)) return value.map(normalizeCorral);
  if (value && typeof value === "object") return normalizeObject(value);
  return value;
}
function normalizeObject(value) {
  if (value.key?.includes("$") && value.value?.["non-repeat"])
    return normalizeCorral({
      slice_type: value.key.split("$")[0],
      primary: value.value["non-repeat"],
      items: value.value.repeat || [],
    });
  if (isImage(value)) return normalizeImage(value);
  if (value.url && (value.kind === "file" || value.link_type === "Media"))
    return {
      id: value.id,
      url: value.url.replace(
        "https://prismic-io.s3.amazonaws.com/rancher/",
        "https://rancher.cdn.prismic.io/rancher/",
      ),
      name: value.name,
      size: String(value.size),
    };
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, normalizeCorral(v)]),
  );
}
export function assertCorralUnchanged(actual, expected, label) {
  const a = normalizedContent(normalizeCorral(actual)),
    e = normalizedContent(normalizeCorral(expected));
  if (JSON.stringify(a) !== JSON.stringify(e)) {
    const fields = Object.keys({ ...a, ...e }).filter(
      (k) => JSON.stringify(a?.[k]) !== JSON.stringify(e?.[k]),
    );
    throw Error(
      `Unexpected editor changes for ${label}: ${fields.join(", ")}. Reconcile before overwrite.`,
    );
  }
}
