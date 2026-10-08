import { serverEnv } from "./database";
import { readDealsSheet } from "./google-sheets";

const ATTIO_API = "https://api.attio.com/v2";
const STATUS_TO_STAGE: Record<string, string> = {
  introduced: "Introduced",
  inventory: "Inventory",
  rejected: "Unqualified",
  "closed lost": "Lost",
  "closed won": "Won 🎉",
};

type AttioRecord = {
  id?: { record_id?: string };
  values?: Record<string, Array<Record<string, unknown>>>;
};

export function stageForSheetStatus(value: unknown) {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  return Object.hasOwn(STATUS_TO_STAGE, normalized)
    ? STATUS_TO_STAGE[normalized]
    : null;
}

export const stageForSheetRow = (row: unknown[]) => stageForSheetStatus(row[8]);

async function attio(path: string, init: RequestInit, send: typeof fetch) {
  const key = serverEnv("ATTIO_API_KEY");
  if (!key) throw new Error("Attio API key is not configured");
  const response = await send(`${ATTIO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json()) as {
    data?: AttioRecord | AttioRecord[];
  };
  if (!response.ok)
    throw new Error(`Attio request failed (${response.status})`);
  return body.data;
}

function associatedDealIds(person: AttioRecord) {
  const deals = person.values?.associated_deals || [];
  return [
    ...new Set(
      deals
        .map((value) => value.target_record_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
}

function currentStageTitle(deal: AttioRecord | undefined) {
  const current = deal?.values?.stage?.[0]?.status;
  if (!current || typeof current !== "object") return "";
  const title = "title" in current ? current.title : undefined;
  return typeof title === "string" ? title : "";
}

async function dealForEmail(email: string, send: typeof fetch) {
  const people = (await attio(
    "/objects/people/records/query",
    {
      method: "POST",
      body: JSON.stringify({ filter: { email_addresses: email }, limit: 2 }),
    },
    send,
  )) as AttioRecord[] | undefined;
  if (!people || people.length !== 1)
    return people?.length ? "ambiguous" : "missing";
  const dealIds = associatedDealIds(people[0]);
  if (dealIds.length !== 1) return dealIds.length ? "ambiguous" : "missing";
  const deal = (await attio(
    `/objects/deals/records/${dealIds[0]}`,
    { method: "GET" },
    send,
  )) as AttioRecord | undefined;
  return { id: dealIds[0], stage: currentStageTitle(deal) };
}

async function syncOne(
  email: string,
  desiredStage: string,
  send: typeof fetch,
  dryRun = false,
) {
  const deal = await dealForEmail(email, send);
  if (typeof deal === "string") return deal;
  const currentStage = deal.stage;
  if (!currentStage) return "missing";
  if (currentStage === desiredStage) return "unchanged";
  if (dryRun) return "wouldUpdate";
  await attio(
    `/objects/deals/records/${deal.id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        data: { values: { stage: [{ status: desiredStage }] } },
      }),
    },
    send,
  );
  return "updated";
}

export async function syncSheetStages(
  send: typeof fetch = fetch,
  dryRun = false,
) {
  const rows = await readDealsSheet(send);
  const candidates = rows.slice(1).flatMap((row) => {
    const email = typeof row[2] === "string" ? row[2].trim().toLowerCase() : "";
    const stage = stageForSheetRow(row);
    return email && stage ? [{ email, stage }] : [];
  });
  const counts = {
    scanned: candidates.length,
    updated: 0,
    wouldUpdate: 0,
    unchanged: 0,
    missing: 0,
    ambiguous: 0,
  };
  for (let index = 0; index < candidates.length; index += 4) {
    const results = await Promise.all(
      candidates
        .slice(index, index + 4)
        .map(({ email, stage }) => syncOne(email, stage, send, dryRun)),
    );
    for (const result of results) counts[result] += 1;
  }
  return counts;
}
