import { createSign } from "node:crypto";
import type { ReferralSubmission } from "../lib/referral-submission";
import type { Submission } from "../lib/submission";
import { database, serverEnv } from "./database";
import { sanitizedErrorCode, serverLog } from "./logger";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TAB = "Deals";
type SheetCell = string | boolean;
export const DEALS_HEADERS = [
  "Company Name",
  "Contact Name",
  "Contact Email",
  "Industry",
  "Peak FTE",
  "Operating History (years)",
  "Operational (Y/N)",
  "Data Sources",
  "Status",
];
let tokenCache: { value: string; expiresAt: number } | undefined;

const base64url = (value: string | Buffer) =>
  Buffer.from(value).toString("base64url");

async function accessToken(send: typeof fetch = fetch) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000)
    return tokenCache.value;
  const email = serverEnv("GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL");
  const privateKey = serverEnv("GOOGLE_SHEETS_PRIVATE_KEY")?.replace(
    /\\n/g,
    "\n",
  );
  if (!email || !privateKey)
    throw new Error("Google Sheets credentials are not configured");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64url(signer.sign(privateKey))}`;
  const response = await send(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!response.ok || !body.access_token)
    throw new Error("Google token request failed");
  tokenCache = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in || 3600) * 1000,
  };
  return tokenCache.value;
}

function spreadsheetId() {
  const id = serverEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
  if (!id) throw new Error("Google Sheets spreadsheet is not configured");
  return id;
}

export async function readDealsSheet(send: typeof fetch = fetch) {
  const token = await accessToken(send);
  const range = encodeURIComponent(`${TAB}!A:I`);
  const response = await send(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${range}?majorDimension=ROWS`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    },
  );
  const body = (await response.json()) as { values?: unknown[][] };
  if (!response.ok)
    throw new Error(`Google Sheets read failed (${response.status})`);
  const rows = body.values || [];
  if (!DEALS_HEADERS.every((header, index) => rows[0]?.[index] === header))
    throw new Error("Deals headers do not match the configured sheet schema");
  return rows;
}

async function writeSheetRow(
  row: number,
  values: SheetCell[],
  send: typeof fetch = fetch,
) {
  const token = await accessToken(send);
  const range = encodeURIComponent(`${TAB}!A${row}:I${row}`);
  const response = await send(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${range}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ majorDimension: "ROWS", values: [values] }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    const body = (await response.json()) as { error?: { message?: string } };
    throw new Error(
      `Google Sheets update failed (${response.status}): ${body.error?.message || "unknown"}`,
    );
  }
  await response.body?.cancel();
}

const canonical = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export function sheetRowTarget(rows: unknown[][], values: SheetCell[]) {
  const existing = rows
    .slice(1)
    .some(
      (row) =>
        canonical(row[2]) === canonical(values[2]) &&
        canonical(row[0]) === canonical(values[0]),
    );
  if (existing) return null; // Never reset an existing deal’s manually maintained status.
  const empty = rows.findIndex(
    (row, index) =>
      index > 0 &&
      [...row.slice(0, 6), row[7], row[8]].every((value) => !value),
  );
  return empty < 0 ? rows.length + 1 : empty + 1;
}

export async function ensureSheetRow(
  values: SheetCell[],
  send: typeof fetch = fetch,
) {
  if (canonical(values[2]) === "ewhite@growthcast.app") return "excluded";
  // ponytail: one lock per spreadsheet; split by tab if write throughput grows.
  return database().begin(async (sql) => {
    await sql`SELECT pg_advisory_xact_lock(hashtextextended(${`rancher:sheet:${spreadsheetId()}`}, 0))`;
    const rows = await readDealsSheet(send);
    const row = sheetRowTarget(rows, values);
    if (row === null) return "existing";
    await writeSheetRow(row, values, send);
    return "added";
  });
}

export const partnershipSheetRow = (submission: Submission) => [
  submission.company,
  submission.name,
  submission.email,
  "",
  submission.size,
  submission.history,
  submission.isBusinessActive,
  [...submission.recordTypes, submission.records].filter(Boolean).join("; "),
  "",
];

export const referralSheetRow = (submission: ReferralSubmission) => [
  "Add manually",
  `${submission.referral_first_name} ${submission.referral_last_name}`,
  submission.referral_email,
  submission.industry,
  submission.company_size,
  "Add manually",
  "",
  "",
  "",
];

async function safelyAppend(values: SheetCell[]) {
  try {
    await ensureSheetRow(values);
  } catch (error) {
    await serverLog("error", "google_sheets_sync_failed", {
      error_code: sanitizedErrorCode(error),
    });
  }
}

export const syncPartnershipToSheet = (submission: Submission) =>
  safelyAppend(partnershipSheetRow(submission));
export const syncReferralToSheet = (submission: ReferralSubmission) =>
  safelyAppend(referralSheetRow(submission));
