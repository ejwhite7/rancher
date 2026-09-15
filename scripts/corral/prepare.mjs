import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  orchestrate,
  canonicalArticleHash,
  createQaReport,
  renderQaMarkdown,
  validateRancherContract,
} from "./engine.mjs";
import { planSchedule } from "./schedule.mjs";
const root = "content/corral",
  read = async (p) => JSON.parse(await fs.readFile(p, "utf8")),
  write = async (p, v) => {
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(v, null, 2) + "\n");
  };
const manifest = await read(root + "/manifest.json"),
  profile = await read(root + "/rancher-profile.json");
const args = process.argv.slice(2),
  start = args.find((a) => a.startsWith("--start="))?.slice(8);
const schedulePath = root + "/proposed-schedule.json";
let slots;
try {
  slots = await read(schedulePath);
} catch {
  if (!start)
    throw Error(
      "First run requires --start=YYYY-MM-DD for a provisional schedule",
    );
  slots = planSchedule(
    manifest.articles.map((a) => a.content_key),
    { startDay: start },
  );
  await write(schedulePath, slots);
}
const escape = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
const rt = (...strings) =>
  strings.map((text) => ({ type: "paragraph", text, spans: [] }));
function markdown(d) {
  return d.slices
    .map((s) => {
      const p = s.primary;
      if (s.slice_type === "text_section" || s.slice_type === "callout")
        return `## ${p.heading}\n\n${p.body.map((b) => b.text).join("\n\n")}`;
      if (s.slice_type === "comparison_table")
        return `## ${p.caption}\n\n| ${[p.column_1, p.column_2, p.column_3].join(" | ")} |\n| --- | --- | --- |\n${s.items.map((r) => `| ${[r.cell_1, r.cell_2, r.cell_3].join(" | ")} |`).join("\n")}`;
      if (s.slice_type === "checklist")
        return `## ${p.heading}\n\n${s.items.map((i) => "- " + i.text).join("\n")}`;
      if (s.slice_type === "faq")
        return `## ${p.heading}\n\n${s.items.map((i) => `### ${i.question}\n\n${i.answer.map((b) => b.text).join("\n\n")}`).join("\n\n")}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}
async function image(file, title, topic) {
  let lines = [],
    line = "";
  for (const word of title.split(" ")) {
    if ((line + " " + word).length > 29) {
      lines.push(line);
      line = word;
    } else line += (line ? " " : "") + word;
  }
  if (line) lines.push(line);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f7f6ee"/><g transform="translate(64 62) scale(1.65)"><path d="M3 29V6l13-4 13 4v23M3 18l13-4 13 4M10 31V10m12 21V10M3 25l13-4 13 4" fill="none" stroke="#193e34" stroke-width="2.5" stroke-linejoin="round"/></g><text x="130" y="108" font-family="Arial" font-size="34" font-weight="bold" fill="#193e34">rancher</text><text x="68" y="187" font-family="Arial" font-size="22" fill="#536059">THE CORRAL · ${escape(topic.toUpperCase())}</text>${lines.map((l, i) => `<text x="68" y="${276 + i * 70}" font-family="Georgia" font-size="60" fill="#193e34">${escape(l)}</text>`).join("")}<path d="M68 546h1064" stroke="#d9dfd3"/><text x="68" y="589" font-family="Arial" font-size="20" fill="#536059">Practical guidance on business-data licensing for AI</text></svg>`;
  await fs.writeFile(file.replace(".png", ".svg"), svg);
  await sharp(Buffer.from(svg)).png().toFile(file);
}
for (const brief of manifest.articles) {
  const inputPath = `${root}/drafts/${brief.content_key}.json`;
  let draft;
  try {
    draft = await read(inputPath);
  } catch (e) {
    if (e.code === "ENOENT") continue;
    throw e;
  }
  const slot = slots.find((s) => s.content_key === brief.content_key);
  const checkpointDir = `${root}/runs`;
  await fs.mkdir(checkpointDir, { recursive: true });
  const store = {
    load: async (id) => {
      try {
        return await read(`${checkpointDir}/${id}.json`);
      } catch (e) {
        if (e.code === "ENOENT") return;
        throw e;
      }
    },
    save: async (value) => write(`${checkpointDir}/${value.runId}.json`, value),
  };
  const initial = {
    brief,
    draft,
    slot,
    profile,
    renderer_version: "rancher-brand-mark-v2",
    source_ledger: await read(root + "/source-ledger.json"),
  };
  const inputHash = createHash("sha256")
    .update(JSON.stringify(initial))
    .digest("hex")
    .slice(0, 12);
  const run = await orchestrate(initial, {
    runId: `${brief.content_key}-${inputHash}`,
    stages: [
      "brief-validation",
      "rough-draft",
      "deterministic-validation",
      "hero-render",
      "asset-validation",
    ],
    maximumAttemptsPerStage: 1,
    checkpointStore: store,
    handlers: {
      "brief-validation": {
        run: async ({ input }) => {
          if (!input.brief.brief || !input.brief.required_asset)
            throw Error("Incomplete launch brief");
          return input;
        },
      },
      "rough-draft": {
        run: async ({ input }) => {
          const body = `# ${brief.title}\n\n${draft.answer}\n\n${markdown(draft)}\n\n## Sources\n\n${draft.sources.map((s) => `- [${s.source_title}](${s.source_url.url})`).join("\n")}\n\n[${brief.cta}](/contact/)`;
          const article = {
            schema_version: 1,
            content_id: brief.content_key,
            brief_id: brief.content_key + "-brief-v1",
            brand: "rancher",
            profile_version: "1.0.0",
            policy_versions: profile.extends_policies,
            title: brief.title,
            description: draft.excerpt,
            slug: brief.uid,
            canonical_url: `https://www.gorancher.com/blog/${brief.uid}/`,
            body,
            author:
              profile.publishing.authors[0] || "Author pending confirmation",
            published_at: slot.scheduled_at,
            modified_at: slot.scheduled_at,
            claims: draft.claims || [],
            internal_links: [
              { url: "/contact/", anchor: brief.cta, inventory_verified: true },
            ],
            media_requirements: [
              { kind: "image", alt: `The Corral — ${brief.title}` },
            ],
            qa_report_path: `${root}/qa/${brief.content_key}.json`,
            approval: null,
            content_sha256: "",
          };
          article.content_sha256 = canonicalArticleHash(article);
          return { ...input, article };
        },
      },
      "deterministic-validation": {
        run: async ({ input }) => {
          await validateRancherContract("article", input.article);
          const sourceLedger = await read(root + "/source-ledger.json");
          const ledger = {
            schema_version: 1,
            brief_id: input.article.brief_id,
            records: Object.values(sourceLedger)
              .filter((r) =>
                input.article.claims.some((c) =>
                  c.support_ids.includes(r.evidence_id),
                ),
              )
              .map((r) => ({
                ...r,
                supported_claim_ids: input.article.claims
                  .filter((c) => c.support_ids.includes(r.evidence_id))
                  .map((c) => c.claim_id),
              })),
          };
          await validateRancherContract("evidence", ledger);
          await write(`${root}/evidence/${brief.content_key}.json`, ledger);
          const qa = createQaReport(input.article, ledger, profile, {
            generatedAt: new Date().toISOString(),
          });
          await write(
            `${root}/articles/${brief.content_key}.json`,
            input.article,
          );
          await fs.writeFile(
            `${root}/articles/${brief.content_key}.md`,
            input.article.body + "\n",
          );
          await write(`${root}/qa/${brief.content_key}.json`, qa);
          await fs.writeFile(
            `${root}/qa/${brief.content_key}.md`,
            renderQaMarkdown(qa),
          );
          await write(`${root}/reviews/${brief.content_key}.json`, {
            content_key: brief.content_key,
            content_sha256: input.article.content_sha256,
            editorial: null,
            specialist: null,
            required_roles: brief.reviewer_roles,
            source_review:
              "Primary-source research recorded separately; specialist review pending",
            claim_coverage:
              "Attributed source claims are hash-bound in the evidence ledger; transaction-specific interpretations and operational advice require the assigned human review",
          });
          return { ...input, qa };
        },
      },
      "hero-render": {
        run: async ({ input }) => {
          const dir = `${root}/assets/${brief.content_key}`;
          await fs.mkdir(dir, { recursive: true });
          await image(`${dir}/social.png`, brief.title, brief.topic);
          if (draft.download) {
            const csv =
              draft.download.rows
                .map((row) =>
                  row.map((v) => '"' + v.replaceAll('"', '""') + '"').join(","),
                )
                .join("\r\n") + "\r\n";
            await fs.writeFile(`${dir}/worksheet.csv`, csv);
          }
          if (draft.diagram) {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="650"><rect width="1000" height="650" fill="#f7f6ee"/><text x="50" y="65" font-size="32" font-family="Georgia" fill="#193e34">A proposed licensing decision sequence</text>${draft.diagram.map((s, i) => `<rect x="50" y="${105 + i * 100}" width="900" height="70" rx="4" fill="#fffef7" stroke="#d9dfd3"/><text x="80" y="${150 + i * 100}" font-family="Arial" font-size="25" fill="#193e34">${i + 1}. ${escape(s)}</text>`).join("")}</svg>`;
            await fs.writeFile(`${dir}/process.svg`, svg);
            await sharp(Buffer.from(svg)).png().toFile(`${dir}/process.png`);
          }
          return { ...input, assetDirectory: dir };
        },
      },
      "asset-validation": {
        run: async ({ input }) => {
          const files = await fs.readdir(input.assetDirectory);
          const assets = [];
          for (const file of files) {
            const bytes = await fs.readFile(`${input.assetDirectory}/${file}`);
            const asset = {
              path: `${input.assetDirectory}/${file}`,
              sha256: createHash("sha256").update(bytes).digest("hex"),
              bytes: bytes.length,
            };
            if (file.endsWith(".png")) {
              const info = await sharp(bytes).metadata();
              if (!info.width || !info.height) throw Error("Invalid image");
              Object.assign(asset, { width: info.width, height: info.height });
            }
            assets.push(asset);
          }
          await write(`${root}/assets/${brief.content_key}/manifest.json`, {
            content_key: brief.content_key,
            article_sha256: input.article.content_sha256,
            rights:
              "Original editorial diagrams and share cards created for the user’s Rancher site; no third-party photographs or synthetic customer proof.",
            assets,
          });
          return {
            content_key: brief.content_key,
            content_sha256: input.article.content_sha256,
            assets,
            qa: input.qa.validation_summary,
            status: "awaiting_human_review",
          };
        },
      },
    },
  });
  console.log(brief.content_key, run.records.at(-1).output.status);
}
