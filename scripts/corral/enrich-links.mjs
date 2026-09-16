import fs from "node:fs/promises";
import { createClient } from "@prismicio/client";
const root = "content/corral";
const manifest = JSON.parse(await fs.readFile(`${root}/manifest.json`, "utf8"));
const glossary = await createClient("rancher").getAllByType("glossary");
const phrases = {
  "01": ["licensing process", "data licensing", "licensing outcome"],
  "02": [
    "rights review",
    "rights and readiness",
    "rights and privacy findings",
    "rights",
  ],
  "03": ["valuation", "pricing"],
  "04": ["agreement", "contract"],
  "05": ["exclusivity"],
  "06": ["metadata inventory", "assessment"],
  "07": ["de-identification", "pseudonymisation"],
  "08": ["exclusions", "exclusion rules", "exclude"],
  "09": ["support tickets", "support records"],
  10: ["workflow trajectory", "trajectory", "sequence of events"],
  11: ["communications", "messages"],
  12: ["CRM", "sales-process"],
  13: ["source code", "repository"],
  14: ["repeat licensing", "repeat-licensing", "non-exclusive"],
  15: ["transformations", "identifiers"],
  16: ["quality checks", "data quality", "quality"],
  17: ["evaluation data", "evaluation"],
  18: ["data partner", "partner"],
  19: ["questions", "FAQ"],
  20: ["data card", "dataset documentation", "documentation"],
  21: ["workflow assessment", "assessment"],
  22: ["security review", "security"],
  23: ["stop decision", "blockers", "readiness"],
  24: ["readiness plan", "readiness"],
};
const report = [];
for (const b of manifest.articles.filter(
  (b) => b.workflow_state !== "published",
)) {
  const file = `${root}/drafts/${b.content_key}.json`;
  const d = JSON.parse(await fs.readFile(file, "utf8"));
  const blocks = d.slices.flatMap((s) => [
    ...(s.primary.body || []),
    ...s.items.flatMap((i) => i.answer || []),
  ]);
  for (const block of blocks) {
    block.text = block.text.replace(
      "A apparently simple row",
      "An apparently simple row",
    );
    block.spans = block.spans.filter(
      (s) =>
        !(
          s.type === "hyperlink" &&
          /^\/(blog|glossary)\//.test(s.data?.url || "")
        ),
    );
  }
  const links = [];
  function add(terms, url, kind) {
    for (const term of terms) {
      const re = new RegExp(
        `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "ig",
      );
      for (const block of blocks) {
        if (
          block.text.startsWith("The scikit-learn documentation") ||
          block.text.startsWith("The ICO explains") ||
          block.text.startsWith("NIST describes") ||
          block.text.startsWith("The U.S. Copyright Office") ||
          block.spans.some((s) => s.type === "hyperlink") ||
          (d.claims || []).some((c) =>
            block.text.includes(c.statement || c.claim_text || "___NONE___"),
          )
        )
          continue;
        const match = re.exec(block.text);
        re.lastIndex = 0;
        if (!match) continue;
        block.spans.push({
          type: "hyperlink",
          start: match.index,
          end: match.index + match[0].length,
          data: { link_type: "Web", url },
        });
        links.push({ url, anchor: match[0], kind });
        return true;
      }
    }
    return false;
  }
  for (const key of b.related_keys) {
    if (links.filter((l) => l.kind === "article").length >= 3) break;
    const target = manifest.articles.find((a) => a.content_key === key);
    add(phrases[target.id] || [], `/blog/${target.uid}/`, "article");
  }
  const aliases = {
    "confidential-business-information": [
      "Customer confidential information",
      "commercial confidentiality",
    ],
    "data-exclusivity": ["exclusivity"],
    "non-exclusive-licensing": ["non-exclusive licensing", "Non-exclusive"],
    pseudonymization: ["pseudonymisation"],
    "re-identification-risk": ["re-identification"],
    "permitted-use": ["permitted uses"],
    "data-ownership": ["ownership"],
    "data-quality": ["quality"],
    "data-licensing": ["licensing"],
    "data-minimization": ["minimization"],
  };
  const terms = glossary
    .map((g) => ({
      uid: g.uid,
      terms: [g.uid.replaceAll("-", " "), g.uid, ...(aliases[g.uid] || [])],
    }))
    .sort((a, b) => b.terms[0].length - a.terms[0].length);
  for (const t of terms) {
    if (links.filter((l) => l.kind === "glossary").length >= 4) break;
    add(t.terms, `/glossary/${t.uid}/`, "glossary");
  }
  if (
    !links.some((l) => l.kind === "article") ||
    !links.some((l) => l.kind === "glossary")
  )
    throw Error(`Missing contextual links: ${b.content_key}`);
  d.internal_links = links.map(({ url, anchor, kind }) => ({
    url,
    anchor,
    inventory_verified:
      kind === "glossary" ||
      manifest.articles.some(
        (a) => a.workflow_state === "published" && url === `/blog/${a.uid}/`,
      ),
  }));
  await fs.writeFile(file, JSON.stringify(d, null, 2) + "\n");
  report.push({ content_key: b.content_key, links });
}
await fs.writeFile(
  `${root}/internal-links.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    report.map((r) => ({
      key: r.content_key,
      articles: r.links.filter((l) => l.kind === "article").length,
      glossary: r.links.filter((l) => l.kind === "glossary").length,
    })),
  ),
);
