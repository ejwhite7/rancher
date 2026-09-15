import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createClient } from "@prismicio/client";
import { createClient as createTypes } from "@prismicio/custom-types-client";
import {
  homepageModel,
  formModel,
  navigationModel,
  footerModel,
  contactModel,
  referralModel,
  legalModel,
  sliceModels,
} from "./prismic-models.mjs";
const command = process.argv[2] || "plan";
const json = async (p) => JSON.parse(await readFile(p, "utf8"));
if (command === "plan") {
  const documents = await Promise.all(
    [
      "homepage",
      "navigation",
      "footer",
      "form",
      "privacy-policy",
      "terms-of-use",
    ].map(async (name) => ({
      name,
      data: await json(`prismic/seed/${name}.json`),
    })),
  );
  await writeFile(
    "prismic/migration-plan.json",
    JSON.stringify(
      {
        models: [
          homepageModel,
          formModel,
          navigationModel,
          footerModel,
          contactModel,
          referralModel,
          await json("customtypes/legal/index.json"),
        ],
        slices: sliceModels,
        documents,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Prepared models, 9 shared slices, and content snapshots. No remote writes.",
  );
} else {
  const repositoryName = process.env.PRISMIC_REPOSITORY_NAME;
  if (!repositoryName) throw Error("Set PRISMIC_REPOSITORY_NAME.");
  const client = createClient(repositoryName, {
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
    fetchOptions: { cache: "no-store" },
  });
  if (command === "verify") {
    // Validate editorial content, not equality with a snapshot that editors can change.
    const home = await client.getSingle("homepage");
    const slices = home.data.slices;
    if (
      !Array.isArray(slices) ||
      slices.length !== 9 ||
      new Set(slices.map((s) => s.slice_type)).size !== 9
    )
      throw Error("Homepage must contain all 9 unique sections.");
    for (const model of sliceModels) {
      const value = slices.find((s) => s.slice_type === model.id);
      if (!value) throw Error("Missing section " + model.id);
      const variation = model.variations[0];
      for (const key of Object.keys(variation.primary))
        if (value.primary[key] == null)
          throw Error(`Missing ${model.id}.${key}`);
      if (Object.keys(variation.items).length && !value.items.length)
        throw Error("Empty items: " + model.id);
      console.log(
        `${model.name}: ${Object.keys(value.primary).length} fields, ${value.items.length} items`,
      );
    }
    const navigation = await client.getSingle("navigation");
    const footer = await client.getSingle("footer");
    if (home.data.footer?.id !== footer.id || !footer.data.dialog_body?.length)
      throw Error("Invalid shared footer.");
    if (
      home.data.navigation?.id !== navigation.id ||
      !navigation.data.items?.length
    )
      throw Error("Invalid shared navigation.");
    const relation = slices.find((s) => s.slice_type === "contact").primary
      .form;
    const form = await client.getByID(relation.id);
    if (form.type !== "form") throw Error("Invalid form relationship");
    for (const key of Object.keys(formModel.json.Main).filter(
      (k) => k !== "uid",
    ))
      if (!form.data[key]) throw Error("Missing form field: " + key);
    for (const uid of ["privacy-policy", "terms-of-use"]) {
      const doc = await client.getByUID("legal", uid);
      if (doc.data.navigation?.id !== navigation.id)
        throw Error("Missing navigation on " + uid);
      if (doc.data.footer?.id !== footer.id)
        throw Error("Missing footer on " + uid);
      if (!doc.data.body?.length) throw Error("Missing legal content: " + uid);
    }
    console.log(
      "Published Home, linked form, and both legal pages are populated.",
    );
  } else if (command === "inspect" || command === "push") {
    if (!process.env.PRISMIC_CUSTOM_TYPES_TOKEN)
      throw Error("Set PRISMIC_CUSTOM_TYPES_TOKEN.");
    const types = createTypes({
      repositoryName,
      token: process.env.PRISMIC_CUSTOM_TYPES_TOKEN,
    });
    const models = await types.getAllCustomTypes();
    const shared = await types.getAllSharedSlices();
    await mkdir(".prismic-migration", { recursive: true });
    await writeFile(
      `.prismic-migration/${repositoryName}-inspection.json`,
      JSON.stringify({ models, slices: shared }, null, 2),
    );
    if (command === "inspect")
      console.log(
        JSON.stringify(
          {
            types: models.map((m) => ({
              id: m.id,
              format: m.format,
              repeatable: m.repeatable,
              tabs: Object.keys(m.json),
            })),
            slices: shared.map((s) => ({ id: s.id, name: s.name })),
          },
          null,
          2,
        ),
      );
    else {
      for (const model of sliceModels) {
        if (shared.some((s) => s.id === model.id))
          await types.updateSharedSlice(model);
        else await types.insertSharedSlice(model);
      }
      for (const model of [
        homepageModel,
        formModel,
        navigationModel,
        footerModel,
        contactModel,
        referralModel,
        legalModel,
      ]) {
        if (models.some((m) => m.id === model.id))
          await types.updateCustomType(model);
        else await types.insertCustomType(model);
      }
      console.log(
        "Updated Homepage, Form, Navigation, Footer, Legal, and 9 slice models.",
      );
    }
  } else if (command === "migrate" || command === "publish")
    throw Error(
      "Initial migration is complete. The section repair uses scripts/prismic-redesign.mjs with its own inspected backup and checkpoint. Do not overwrite published editorial changes with seed content.",
    );
  else throw Error("Use plan, inspect, push, or verify.");
}
