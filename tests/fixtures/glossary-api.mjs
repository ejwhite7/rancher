import http from "node:http";
import fs from "node:fs";
import {
  loadDrafts,
  termData,
  indexData,
} from "../../scripts/glossary-content.mjs";
// Isolated local API fixture. These reviewer values never enter migration content.
const drafts = await loadDrafts();
const ids = Object.fromEntries(drafts.map((d) => [d.uid, d.uid]));
const shared = {
  navigation: {
    link_type: "Document",
    id: "snapshot-navigation",
    type: "navigation",
  },
  footer: { link_type: "Document", id: "snapshot-footer", type: "footer" },
};
const document = (id, type, data, uid = null) => ({
  id,
  type,
  data,
  uid,
  lang: "en-us",
  tags: [],
  url: null,
  href: "",
  alternate_languages: [],
  linked_documents: [],
  first_publication_date: "2026-09-15T00:00:00+0000",
  last_publication_date: "2026-09-15T00:00:00+0000",
});
const seed = (name) => JSON.parse(fs.readFileSync(`prismic/seed/${name}.json`));
const sharedDocs = [
  document("homepage", "homepage", seed("homepage")),
  document("snapshot-navigation", "navigation", seed("navigation")),
  document("snapshot-footer", "footer", seed("footer")),
  document("snapshot-form", "form", seed("form"), "partnership"),
];
// Use the form ID referenced by the existing homepage snapshot.
sharedDocs[3].id = sharedDocs[0].data.slices.find(
  (s) => s.slice_type === "contact",
).primary.form.id;
let state = {};
let requests = [];
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:4334");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/__test/state") {
    let body = "";
    for await (const part of req) body += part;
    state = body ? JSON.parse(body) : {};
    requests = [];
    res.end("{}");
    return;
  }
  if (url.pathname === "/__test/requests") {
    res.end(JSON.stringify(requests));
    return;
  }
  if (url.pathname === "/api/v2") {
    res.end(
      JSON.stringify({
        refs: [
          {
            id: "master",
            ref: "published-ref",
            label: "Master",
            isMasterRef: true,
          },
        ],
        types: {
          homepage: "Homepage",
          glossary: "Glossary",
          "glossary-index": "Glossary Index",
        },
        languages: [{ id: "en-us", name: "English" }],
        tags: [],
      }),
    );
    return;
  }
  const ref = url.searchParams.get("ref");
  const preview = ref === "draft-ref";
  const query = url.searchParams.get("q") || "";
  const page = Number(url.searchParams.get("page") || 1);
  const size = Number(url.searchParams.get("pageSize") || 20);
  requests.push({ ref, query, page, size });
  if (ref === "expired-ref") {
    res.statusCode = 400;
    res.end(
      JSON.stringify({ type: "api_validation_error", message: "Invalid ref" }),
    );
    return;
  }
  let terms = drafts.map((d) =>
    document(
      d.uid,
      "glossary",
      {
        ...termData(d, shared, ids),
        reviewer_name: preview ? "" : "Fixture Reviewer",
        last_reviewed: preview ? null : "2026-09-01",
      },
      d.uid,
    ),
  );
  const blankAlias = terms.find((d) => d.uid === "dark-data");
  blankAlias.data.aliases = [{ alias: null }];
  if (!preview && state.unpublished)
    terms = terms.filter((d) => d.uid !== state.unpublished);
  if (preview)
    terms = terms.map((d) =>
      d.uid === "data-licensing"
        ? { ...d, data: { ...d.data, term: "Draft data licensing" } }
        : d,
    );
  if (state.broken)
    terms[0].data.related_terms = [
      { term: { link_type: "Document", id: "missing" } },
    ];
  if (state.malformed) terms[0].data.sources[0].url.url = "javascript:alert(1)";
  if (state.special)
    terms = terms.map((d) =>
      d.uid === "data-licensing"
        ? {
            ...d,
            data: {
              ...d.data,
              term: "Data </script><script>alert(1)</script> & licensing",
            },
          }
        : d,
    );
  let all = [
    ...sharedDocs,
    ...(state.missingIndex
      ? []
      : [document("index", "glossary-index", indexData(shared, ids))]),
    ...(state.empty ? [] : terms),
  ];
  const type = query.match(/at\(document.type, "([^"]+)"\)/)?.[1];
  if (type) all = all.filter((d) => d.type === type);
  const uid = query.match(/at\(my.glossary.uid, "([^"]+)"\)/)?.[1];
  if (uid) all = all.filter((d) => d.uid === uid);
  const id = query.match(/at\(document.id, "([^"]+)"\)/)?.[1];
  if (id) all = all.filter((d) => d.id === id);
  // getByID uses an in(document.id, [...]) predicate in some SDK versions.
  const inIDs = query.match(/in\(document.id, \[(.*?)\]\)/)?.[1];
  if (inIDs) {
    const ids = JSON.parse(`[${inIDs}]`);
    all = all.filter((d) => ids.includes(d.id));
  }
  const result = all.slice((page - 1) * size, page * size);
  const totalPages = Math.ceil(all.length / size);
  const next = new URL(url);
  next.searchParams.set("page", String(page + 1));
  res.end(
    JSON.stringify({
      results: result,
      results_size: result.length,
      results_per_page: size,
      page,
      total_results_size: all.length,
      total_pages: totalPages,
      next_page: page < totalPages ? next.href : null,
      prev_page: null,
    }),
  );
});
server.listen(4334, "127.0.0.1");
