// Current schema source. Historical migration converters retain their original models.
import { readFile } from "node:fs/promises";
const json = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
export const [
  homepageModel,
  formModel,
  navigationModel,
  legalModel,
  footerModel,
  contactModel,
] = await Promise.all(
  ["homepage", "form", "navigation", "legal", "footer", "contact"].map((id) =>
    json(`../customtypes/${id}/index.json`),
  ),
);
export const sliceModels = await Promise.all(
  Object.keys(homepageModel.json.Main.slices.config.choices).map((id) =>
    json(`../prismic/slices/${id}/model.json`),
  ),
);
