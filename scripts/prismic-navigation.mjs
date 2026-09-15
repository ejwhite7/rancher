import { readFile, writeFile, mkdir } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import {
  createClient,
  createWriteClient,
  createMigration,
} from "@prismicio/client";
import { createClient as createTypes } from "@prismicio/custom-types-client";
const repo = process.env.PRISMIC_REPOSITORY_NAME;
if (repo !== "rancher") throw Error("Migration scoped to rancher.");
const dir = ".prismic-migration/navigation/";
await mkdir(dir, { recursive: true });
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const save = async (p, v) =>
  writeFile(dir + p + ".json", JSON.stringify(v, null, 2) + "\n");
const c = createClient(repo, {
  fetch: (input, init) => {
    const u = new URL(input);
    u.searchParams.set("_verification", Date.now());
    return fetch(u, init);
  },
});
const t = createTypes({
  repositoryName: repo,
  token: process.env.PRISMIC_CUSTOM_TYPES_TOKEN,
});
const w = createWriteClient(repo, {
  writeToken: process.env.PRISMIC_WRITE_TOKEN,
});
const command = process.argv[2];
if (command === "prepare") {
  const [models, slices, home, legal, navigation, form] = await Promise.all([
    t.getAllCustomTypes(),
    t.getAllSharedSlices(),
    c.getSingle("homepage"),
    c.getAllByType("legal"),
    c.getAllByType("navigation").catch((e) => {
      if (e.status === 400) return [];
      throw e;
    }),
    c.getAllByType("form"),
  ]);
  if (navigation.length || models.some((m) => m.id === "navigation"))
    throw Error("Navigation already exists; inspect before migration.");
  const source = home.data.slices.find((s) => s.slice_type === "navigation");
  if (!source) throw Error("No navigation source slice.");
  const before = { models, slices, home, legal, form };
  await writeFile(dir + "before.json", JSON.stringify(before, null, 2), {
    flag: "wx",
  });
  await save("navigation-data", { ...source.primary, items: source.items });
  console.log(
    JSON.stringify({
      types: models.map((m) => m.id),
      homepage: home.id,
      legal: legal.map((d) => d.id),
      links: source.items.length,
    }),
  );
} else if (command === "import") {
  const before = await read(dir + "before.json");
  for (const doc of [before.home, ...before.legal]) {
    const current = await c.getByID(doc.id);
    if (!isDeepStrictEqual(current.data, doc.data))
      throw Error("Content changed since backup: " + doc.id);
  }
  const refs = (await c.getRepository()).refs;
  if (refs.some((r) => r.id !== "master"))
    throw Error("Inspect existing release before migration.");
  for (const id of ["navigation", "homepage", "legal"]) {
    const model = await read(`customtypes/${id}/index.json`);
    if (id === "navigation") await t.insertCustomType(model);
    else {
      const original = before.models.find((m) => m.id === id);
      const next = structuredClone(original);
      next.json.Main.navigation = model.json.Main.navigation;
      if (id === "homepage")
        delete next.json.Main.slices.config.choices.navigation;
      await t.updateCustomType(next);
    }
  }
  const migration = createMigration();
  const nav = migration.createDocument(
    {
      type: "navigation",
      lang: before.home.lang,
      data: await read(dir + "navigation-data.json"),
    },
    "Site navigation",
  );
  for (const doc of [before.home, ...before.legal]) {
    const data = { ...doc.data, navigation: nav };
    if (doc.type === "homepage")
      data.slices = data.slices.filter((s) => s.slice_type !== "navigation");
    migration.updateDocument(
      { ...doc, data },
      doc.type === "homepage" ? "Home" : doc.data.title,
    );
  }
  await w.migrate(migration);
  await save("checkpoint", {
    status: "imported",
    navigationId: nav.document.id,
  });
  console.log(
    "Imported navigation singleton and linked Homepage and both legal pages.",
  );
} else if (command === "publish") {
  const state = await read(dir + "checkpoint.json");
  if (state.status !== "imported") throw Error("No completed import.");
  console.log(await w.publishMigrationRelease());
  await save("checkpoint", { ...state, status: "publication-requested" });
} else if (command === "verify") {
  const before = await read(dir + "before.json");
  const state = await read(dir + "checkpoint.json");
  const nav = await c.getSingle("navigation");
  if (nav.id !== state.navigationId)
    throw Error("Unexpected navigation singleton.");
  const match = (a, b) =>
    Array.isArray(b)
      ? Array.isArray(a) &&
        a.length === b.length &&
        b.every((v, i) => match(a[i], v))
      : b && typeof b === "object"
        ? a &&
          Object.entries(b)
            .filter(([k]) => !(b.link_type && k === "key"))
            .every(([k, v]) => match(a[k], v))
        : a === b;
  if (!match(nav.data, await read(dir + "navigation-data.json")))
    throw Error("Navigation content mismatch.");
  for (const doc of [before.home, ...before.legal]) {
    const actual = await c.getByID(doc.id);
    if (
      actual.data.navigation?.id !== nav.id ||
      actual.data.navigation.isBroken
    )
      throw Error("Broken navigation link: " + doc.id);
    const { navigation, ...data } = actual.data;
    const expected = structuredClone(doc.data);
    if (doc.type === "homepage")
      expected.slices = expected.slices.filter(
        (s) => s.slice_type !== "navigation",
      );
    if (!match(data, expected)) throw Error("Other content changed: " + doc.id);
  }
  for (const doc of before.form) {
    const actual = await c.getByID(doc.id);
    if (!isDeepStrictEqual(actual.data, doc.data))
      throw Error("Form content changed.");
  }
  const models = await t.getAllCustomTypes();
  if (models.find((m) => m.id === "navigation")?.repeatable !== false)
    throw Error("Navigation is not a singleton.");
  for (const model of before.models)
    if (
      !["homepage", "legal"].includes(model.id) &&
      !isDeepStrictEqual(
        models.find((m) => m.id === model.id),
        model,
      )
    )
      throw Error("Unrelated model changed.");
  await save("checkpoint", { ...state, status: "verified" });
  console.log(
    "Verified navigation " +
      nav.id +
      ", four unchanged links, three page relationships, and all remaining page/form content preserved.",
  );
} else throw Error("Use prepare, import, publish, verify.");
