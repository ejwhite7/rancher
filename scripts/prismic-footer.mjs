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
const dir = ".prismic-migration/footer/";
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
  const [models, slices, home, legal, footer, form] = await Promise.all([
    t.getAllCustomTypes(),
    t.getAllSharedSlices(),
    c.getSingle("homepage"),
    c.getAllByType("legal"),
    c.getAllByType("footer").catch((e) => {
      if (e.status === 400) return [];
      throw e;
    }),
    c.getAllByType("form"),
  ]);
  if (footer.length || models.some((m) => m.id === "footer"))
    throw Error("Footer already exists; inspect before migration.");
  const source = home.data.slices.find((s) => s.slice_type === "footer");
  if (!source) throw Error("No footer source slice.");
  const navigation = await c.getAllByType("navigation");
  const before = { models, slices, home, legal, form, navigation };
  await writeFile(dir + "before.json", JSON.stringify(before, null, 2), {
    flag: "wx",
  });
  await save("footer-data", source.primary);
  console.log(
    JSON.stringify({
      types: models.map((m) => m.id),
      homepage: home.id,
      legal: legal.map((d) => d.id),
      fields: Object.keys(source.primary).length,
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
  for (const id of ["footer", "homepage", "legal"]) {
    const model = await read(`customtypes/${id}/index.json`);
    if (id === "footer") await t.insertCustomType(model);
    else {
      const original = before.models.find((m) => m.id === id);
      const next = structuredClone(original);
      next.json.Main.footer = model.json.Main.footer;
      if (id === "homepage") delete next.json.Main.slices.config.choices.footer;
      await t.updateCustomType(next);
    }
  }
  const migration = createMigration();
  const nav = migration.createDocument(
    {
      type: "footer",
      lang: before.home.lang,
      data: await read(dir + "footer-data.json"),
    },
    "Site footer",
  );
  for (const doc of [before.home, ...before.legal]) {
    const data = { ...doc.data, footer: nav };
    if (doc.type === "homepage")
      data.slices = data.slices.filter((s) => s.slice_type !== "footer");
    migration.updateDocument(
      { ...doc, data },
      doc.type === "homepage" ? "Home" : doc.data.title,
    );
  }
  await w.migrate(migration);
  await save("checkpoint", {
    status: "imported",
    footerId: nav.document.id,
  });
  console.log(
    "Imported footer singleton and linked Homepage and both legal pages.",
  );
} else if (command === "publish") {
  const state = await read(dir + "checkpoint.json");
  if (state.status !== "imported") throw Error("No completed import.");
  console.log(await w.publishMigrationRelease());
  await save("checkpoint", { ...state, status: "publication-requested" });
} else if (command === "verify") {
  const before = await read(dir + "before.json");
  const state = await read(dir + "checkpoint.json");
  const nav = await c.getSingle("footer");
  if (nav.id !== state.footerId) throw Error("Unexpected footer singleton.");
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
  if (!match(nav.data, await read(dir + "footer-data.json")))
    throw Error("Footer content mismatch.");
  for (const doc of [before.home, ...before.legal]) {
    const actual = await c.getByID(doc.id);
    if (actual.data.footer?.id !== nav.id || actual.data.footer.isBroken)
      throw Error("Broken footer link: " + doc.id);
    const { footer, ...data } = actual.data;
    const expected = structuredClone(doc.data);
    if (doc.type === "homepage")
      expected.slices = expected.slices.filter(
        (s) => s.slice_type !== "footer",
      );
    if (!match(data, expected)) throw Error("Other content changed: " + doc.id);
  }
  for (const doc of [...before.form, ...before.navigation]) {
    const actual = await c.getByID(doc.id);
    if (!isDeepStrictEqual(actual.data, doc.data))
      throw Error("Form or navigation content changed.");
  }
  const models = await t.getAllCustomTypes();
  if (models.find((m) => m.id === "footer")?.repeatable !== false)
    throw Error("Footer is not a singleton.");
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
    "Verified footer " +
      nav.id +
      ", all footer copy and dialog content preserved, three page relationships, and all remaining page/form content preserved.",
  );
} else throw Error("Use prepare, import, publish, verify.");
