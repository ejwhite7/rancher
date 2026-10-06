import { createSign } from "node:crypto";
import type { ReferralSubmission } from "../lib/referral-submission";
import type { Submission } from "../lib/submission";
import { serverEnv } from "./database";
import { serverLog } from "./logger";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TAB = "Deals";
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
  return body.values || [];
}

export async function writeSheetRow(
  row: number,
  values: string[],
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
  await response.body?.cancel();
  if (!response.ok)
    throw new Error(`Google Sheets update failed (${response.status})`);
}

async function appendRow(values: string[], send: typeof fetch = fetch) {
  const token = await accessToken(send);
  const range = encodeURIComponent(`${TAB}!A:I`);
  const response = await send(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ majorDimension: "ROWS", values: [values] }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  await response.body?.cancel();
  if (!response.ok)
    throw new Error(`Google Sheets append failed (${response.status})`);
}

export const partnershipSheetRow = (submission: Submission) => [
  submission.company,
  submission.name,
  submission.email,
  "",
  submission.size,
  submission.history,
  "",
  [...submission.recordTypes, submission.records].filter(Boolean).join("; "),
  String(submission.isBusinessActive),
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

async function safelyAppend(values: string[]) {
  try {
    await appendRow(values);
  } catch (error) {
    await serverLog("error", "google_sheets_sync_failed", {
      error_code:
        error instanceof Error
          ? error.message.replace(/[^a-zA-Z0-9_ ()-]/g, "").slice(0, 120)
          : "unknown",
    });
  }
}

export const syncPartnershipToSheet = (submission: Submission) =>
  safelyAppend(partnershipSheetRow(submission));
export const syncReferralToSheet = (submission: ReferralSubmission) =>
  safelyAppend(referralSheetRow(submission));
