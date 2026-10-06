import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const directory = new URL("../brand_atomic_system/agent/visual/tokens/", import.meta.url);
const source = new URL("tokens.json", directory);
const tokens = JSON.parse(await readFile(source, "utf8"));

for (const file of await readdir(directory)) {
  if (file.startsWith("generated-") && file.endsWith(".md")) {
    await unlink(new URL(file, directory));
  }
}

function scalar(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object" && "value" in value && "unit" in value) {
    return `${value.value}${value.unit}`;
  }
  return String(value);
}

function slug(path) {
  return path
    .join("-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .toLowerCase();
}

async function walk(node, path = [], inheritedType) {
  const type = node.$type ?? inheritedType;
  if (Object.hasOwn(node, "$value")) {
    const name = path.join(".");
    const value = scalar(node.$value);
    const description = node.$description ?? `Canonical Rancher ${name} token.`;
    const frontmatter = [
      "---",
      `name: ${JSON.stringify(name)}`,
      `value: ${JSON.stringify(value)}`,
      `type: ${JSON.stringify(type ?? "other")}`,
      `description: ${JSON.stringify(description)}`,
      "---",
      "",
      `# ${name}`,
      "",
      `${description} Canonical value: \`${value}\`.`,
      "",
    ].join("\n");
    await writeFile(new URL(`generated-${slug(path)}.md`, directory), frontmatter);
    return 1;
  }
  let count = 0;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") || !child || typeof child !== "object") continue;
    count += await walk(child, [...path, key], type);
  }
  return count;
}

const count = await walk(tokens);
console.log(`Generated ${count} BrandKit token specimens in ${join(directory.pathname)}.`);
