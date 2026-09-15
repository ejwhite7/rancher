// Consumer extension: the upstream package has no Rancher brand contract.
// Only brand enums are extended; evidence, title, and approval gates are retained.
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
export {
  canonicalArticleHash,
  createQaReport,
  renderQaMarkdown,
  publicationPreflight,
  orchestrate,
  deterministicHash,
} from "@ejwhite/content-engine";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.resolve("@ejwhite/content-engine"))),
  "..",
);
export async function validateRancherContract(kind, value) {
  const schema = JSON.parse(
    await fs.readFile(
      path.join(root, "schemas", kind + ".schema.json"),
      "utf8",
    ),
  );
  function extend(node) {
    if (!node || typeof node !== "object") return;
    if (
      Array.isArray(node.enum) &&
      node.enum.includes("media-mix-model") &&
      node.enum.includes("verdant")
    )
      node.enum.push("rancher");
    for (const v of Object.values(node)) if (typeof v === "object") extend(v);
  }
  extend(schema);
  const ajv = new Ajv2020({ allErrors: true, strictTypes: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(value))
    throw Error(`${kind}: ${JSON.stringify(validate.errors)}`);
  return value;
}
