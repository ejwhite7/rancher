import sharp from "sharp";
import { database, serverEnv } from "./database";

export const STAGES = [
  ["Lead", 0.05],
  ["Discovery", 0.25],
  ["Introduced", 0.5],
  ["Inventory", 0.8],
  ["Won 🎉", 1],
  ["Lost", 0],
  ["Unqualified", 0],
  ["No Response", 0],
] as const;

type Deal = { id: string; name: string; stage: string; value: number };
type Snapshot = { deals: Deal[] };

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

async function attioDeals(): Promise<Deal[]> {
  const token = serverEnv("ATTIO_API_KEY");
  if (!token) throw new Error("ATTIO_API_KEY is not configured.");
  const deals: Deal[] = [];
  for (let offset = 0; ; offset += 50) {
    const response = await fetch("https://api.attio.com/v2/objects/deals/records/query", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ limit: 50, offset }),
    });
    if (!response.ok) throw new Error(`Attio query failed (${response.status}).`);
    const page = (await response.json()) as { data?: Array<{ id?: { record_id?: string }; values?: Record<string, Array<Record<string, unknown>>> }> };
    for (const record of page.data ?? []) {
      const values = record.values ?? {};
      const first = (key: string): any => values[key]?.[0] ?? {};
      deals.push({
        id: record.id?.record_id ?? "",
        name: String(first("name").value ?? "Unnamed deal"),
        stage: String(first("stage").status?.title ?? first("stage").title ?? "Unknown"),
        value: Number(first("value").currency_value ?? first("value").value ?? 0),
      });
    }
    if ((page.data?.length ?? 0) < 50) break;
  }
  return deals.filter((deal) => deal.id);
}

export function summarize(deals: Deal[]) {
  return STAGES.map(([stage, weight]) => {
    const matching = deals.filter((deal) => deal.stage === stage);
    const value = matching.reduce((sum, deal) => sum + deal.value, 0);
    return { stage, weight, count: matching.length, value, weighted: value * weight };
  });
}

export function describeMovement(previous: Deal[] | undefined, current: Deal[]) {
  if (!previous) return "Baseline established. Future reports will describe movement since the previous run.";
  const before = new Map(previous.map((deal) => [deal.id, deal]));
  const changes = current
    .filter((deal) => before.get(deal.id)?.stage !== deal.stage)
    .map((deal) => {
      const prior = before.get(deal.id);
      return prior ? `${deal.name}: ${prior.stage} → ${deal.stage}` : `${deal.name}: new in ${deal.stage}`;
    });
  const removed = previous.filter((deal) => !current.some(({ id }) => id === deal.id)).map((deal) => `${deal.name}: removed from pipeline`);
  return [...changes, ...removed].join("\n") || "No deal-stage movement since the previous report.";
}

function svg(summary: ReturnType<typeof summarize>, timestamp: Date) {
  const active = summary.filter(({ weight }) => weight > 0);
  const max = Math.max(...active.map(({ value }) => value), 1);
  const gross = active.reduce((sum, row) => sum + row.value, 0);
  const weighted = active.reduce((sum, row) => sum + row.weighted, 0);
  const money = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;
  const rows = active.map((row, index) => {
    const y = 255 + index * 100;
    const width = Math.round((row.value / max) * 610);
    return `<text x="70" y="${y}" class="label">${esc(row.stage)}</text><rect x="250" y="${y - 28}" width="${width}" height="38" rx="6" fill="#9B3A26"/><text x="880" y="${y}" class="value">${row.count} deals · ${money(row.value)} · ${row.weight * 100}% = ${money(row.weighted)}</text>`;
  }).join("");
  return `<svg width="1200" height="760" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="760" fill="#FFFEF7"/><style>.title{font:700 46px Georgia,serif;fill:#23201D}.sub{font:22px Arial,sans-serif;fill:#665F58}.label{font:700 24px Arial,sans-serif;fill:#23201D}.value{font:20px Arial,sans-serif;fill:#23201D}.metric{font:700 34px Georgia,serif;fill:#9B3A26}</style><text x="70" y="80" class="title">Rancher Deal Pipeline</text><text x="70" y="122" class="sub">${esc(timestamp.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "long", timeStyle: "short" }))} ET</text><text x="70" y="185" class="metric">${money(gross)} gross open</text><text x="420" y="185" class="metric">${money(weighted)} weighted open</text>${rows}<text x="70" y="710" class="sub">Weights: Lead 5% · Discovery 25% · Introduced 50% · Inventory 80% · Won 100%</text></svg>`;
}

async function slackChannel(token: string) {
  if (serverEnv("SLACK_PIPELINE_CHANNEL_ID")) return serverEnv("SLACK_PIPELINE_CHANNEL_ID")!;
  let cursor = "";
  do {
    const url = new URL("https://slack.com/api/conversations.list");
    url.searchParams.set("types", "public_channel,private_channel");
    url.searchParams.set("exclude_archived", "true");
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("cursor", cursor);
    const result = await slack(token, url.toString());
    const match = result.channels?.find((channel: { name?: string }) => channel.name === "pipeline-status");
    if (match) return match.id as string;
    cursor = result.response_metadata?.next_cursor ?? "";
  } while (cursor);
  throw new Error("Slack channel #pipeline-status was not found.");
}

async function slack(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, ...init.headers } });
  const result = await response.json();
  if (!result.ok) throw new Error(`Slack API failed: ${result.error}`);
  return result;
}

async function postPng(token: string, channel: string, png: Buffer, comment: string) {
  const params = new URLSearchParams({ filename: "rancher-pipeline.png", length: String(png.length) });
  const upload = await slack(token, `https://slack.com/api/files.getUploadURLExternal?${params}`);
  const sent = await fetch(upload.upload_url, { method: "POST", headers: { "content-type": "image/png" }, body: new Uint8Array(png) });
  if (!sent.ok) throw new Error(`Slack file upload failed (${sent.status}).`);
  await slack(token, "https://slack.com/api/files.completeUploadExternal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ files: [{ id: upload.file_id, title: "Rancher pipeline status" }], channel_id: channel, initial_comment: comment }),
  });
}

export async function publishPipelineReport(now = new Date()) {
  const sql = database();
  const slot = now.toLocaleString("sv-SE", { timeZone: "America/New_York", hour12: false }).slice(0, 13);
  const hour = Number(slot.slice(-2));
  if (![9, 17].includes(hour)) return { skipped: true, reason: "outside reporting hours" };
  const existing = await sql`select 1 from pipeline_report_snapshots where report_slot = ${slot}`;
  if (existing.length) return { skipped: true, reason: "slot already published" };

  const deals = await attioDeals();
  const [prior] = await sql<Snapshot[]>`select deals from pipeline_report_snapshots order by created_at desc limit 1`;
  const summary = summarize(deals);
  const movement = describeMovement(prior?.deals, deals);
  const weighted = summary.filter(({ weight }) => weight > 0).reduce((sum, row) => sum + row.weighted, 0);
  const gross = summary.filter(({ weight }) => weight > 0).reduce((sum, row) => sum + row.value, 0);
  const png = await sharp(Buffer.from(svg(summary, now))).png().toBuffer();
  const token = serverEnv("SLACK_FORM_SUBMISSIONS_BOT_TOKEN");
  if (!token) throw new Error("SLACK_FORM_SUBMISSIONS_BOT_TOKEN is not configured.");
  const channel = await slackChannel(token);
  const comment = `*Rancher pipeline status*\nGross open: *$${gross.toLocaleString("en-US")}* · Weighted open: *$${Math.round(weighted).toLocaleString("en-US")}*\n\n*Movement since last report*\n${movement}`;
  await postPng(token, channel, png, comment);
  await sql`insert into pipeline_report_snapshots (report_slot, deals) values (${slot}, ${sql.json(deals)})`;
  return { skipped: false, gross, weighted, deals: deals.length };
}
