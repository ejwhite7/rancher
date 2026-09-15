import { readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import {
  createClient,
  createWriteClient,
  createMigration,
} from "@prismicio/client";
import { createClient as createTypes } from "@prismicio/custom-types-client";
import {
  homepageModel,
  formModel,
  sliceModels,
  restructureHomepage,
  restructureForm,
} from "./prismic-sections.mjs";
const repo = process.env.PRISMIC_REPOSITORY_NAME;
if (repo !== "rancher") throw Error("This repair is scoped to rancher.");
const dir = ".prismic-migration/section-redesign/";
const read = async (name) =>
  JSON.parse(await readFile(dir + name + ".json", "utf8"));
const save = async (name, value) =>
  writeFile(dir + name + ".json", JSON.stringify(value, null, 2) + "\n");
const client = createClient(repo, {
  fetch: (input, init) => {
    const url = new URL(input);
    url.searchParams.set("_verification", Date.now());
    return fetch(url, init);
  },
});
const types = createTypes({
  repositoryName: repo,
  token: process.env.PRISMIC_CUSTOM_TYPES_TOKEN,
});
const writer = createWriteClient(repo, {
  writeToken: process.env.PRISMIC_WRITE_TOKEN,
});
const command = process.argv[2] || "prepare";
if (command === "prepare") {
  const homepage = await client.getSingle("homepage");
  const form = await client.getByUID("form", "partnership");
  for (const [name, doc] of [
    ["homepage", homepage],
    ["form", form],
  ]) {
    const before = (await read(name + "-before"))[0];
    if (!isDeepStrictEqual(before.data, doc.data))
      throw Error(name + " changed since backup; inspect before conversion.");
  }
  const legal = await client.getAllByType("legal");
  await save("legal-preserved", legal);
  const allModels = await types.getAllCustomTypes();
  await save("models-preserved", allModels);
  const documents = [
    { ...homepage, data: restructureHomepage(homepage.data) },
    { ...form, data: restructureForm(form.data) },
  ];
  await save("documents-planned", documents);
  console.log(
    JSON.stringify(
      {
        homepage: homepage.id,
        sections: documents[0].data.slices.map((s) => ({
          section: s.slice_type,
          items: s.items.length,
        })),
        form: form.id,
        legalPreserved: legal.map((d) => d.id),
      },
      null,
      2,
    ),
  );
} else if (command === "import") {
  const docs = await read("documents-planned");
  const repository = await client.getRepository();
  if (repository.refs.some((ref) => ref.id === "migration"))
    throw Error(
      "Existing migration release must be inspected before importing.",
    );
  const existing = await types.getAllSharedSlices();
  for (const model of sliceModels) {
    if (existing.some((s) => s.id === model.id))
      await types.updateSharedSlice(model);
    else await types.insertSharedSlice(model);
    console.log("Configured slice: " + model.name);
  }
  await types.updateCustomType(homepageModel);
  await types.updateCustomType(formModel);
  const migration = createMigration();
  for (const doc of docs)
    migration.updateDocument(
      doc,
      doc.type === "homepage" ? "Home" : "Partnership form",
    );
  await writer.migrate(migration, {
    reporter: (e) => {
      if (["documents:updated", "end"].includes(e.type)) console.log(e.type);
    },
  });
  await save("checkpoint", { status: "imported", ids: docs.map((d) => d.id) });
  console.log("Imported updated Home and form into migration release.");
} else if (command === "publish") {
  const state = await read("checkpoint");
  if (state.status !== "imported")
    throw Error("No completed import to publish.");
  const result = await writer.publishMigrationRelease();
  await save("checkpoint", { ...state, status: "publication-requested" });
  console.log(result);
} else if (command === "verify") {
  const planned = await read("documents-planned");
  const matches = (a, b) =>
    Array.isArray(b)
      ? Array.isArray(a) &&
        a.length === b.length &&
        b.every((v, i) => matches(a[i], v))
      : b && typeof b === "object"
        ? a &&
          Object.entries(b)
            .filter(
              ([k]) =>
                !(
                  b.link_type === "Document" &&
                  ["key", "last_publication_date"].includes(k)
                ),
            )
            .every(([k, v]) => matches(a[k], v))
        : a === b;
  for (const expected of planned) {
    const actual = await client.getByID(expected.id);
    if (!matches(actual.data, expected.data))
      throw Error("Published content differs: " + expected.type);
    console.log("Verified published " + expected.type + ": " + actual.id);
    await save(expected.type + "-after", actual);
  }
  const legal = await client.getAllByType("legal");
  const before = await read("legal-preserved");
  for (const doc of before)
    if (!isDeepStrictEqual(legal.find((d) => d.id === doc.id)?.data, doc.data))
      throw Error("Legal content changed: " + doc.id);
  const models = await types.getAllCustomTypes();
  for (const model of await read("models-preserved"))
    if (
      !["homepage", "form"].includes(model.id) &&
      !isDeepStrictEqual(
        models.find((m) => m.id === model.id),
        model,
      )
    )
      throw Error("Unrelated model changed: " + model.id);
  for (const expected of [homepageModel, formModel])
    if (
      !isDeepStrictEqual(
        models.find((m) => m.id === expected.id)?.json,
        expected.json,
      )
    )
      throw Error("Model mismatch: " + expected.id);
  const slices = await types.getAllSharedSlices();
  for (const expected of sliceModels)
    if (
      !isDeepStrictEqual(
        slices.find((s) => s.id === expected.id),
        expected,
      )
    )
      throw Error("Slice model mismatch: " + expected.id);
  await save("checkpoint", {
    status: "verified",
    ids: planned.map((d) => d.id),
    verifiedAt: new Date().toISOString(),
  });
  console.log(
    "All 11 sections, full copy, repeatable items, images, form, models verified. Legal documents and unrelated custom types preserved.",
  );
} else throw Error("Use prepare, import, publish, or verify.");
