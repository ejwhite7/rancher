import { createSign } from "node:crypto";
import { serverEnv } from "./database";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
let tokenCache: { value: string; expiresAt: number } | undefined;

const base64url = (value: string | Buffer) =>
  Buffer.from(value).toString("base64url");

async function accessToken(send: typeof fetch = fetch) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000)
    return tokenCache.value;
  const email = serverEnv("GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL");
  const privateKey = serverEnv("GOOGLE_SHEETS_PRIVATE_KEY")?.replace(/\\n/g, "\n");
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

export async function readDealsSheet(send: typeof fetch = fetch) {
  const spreadsheetId = serverEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
  if (!spreadsheetId)
    throw new Error("Google Sheets spreadsheet is not configured");
  const token = await accessToken(send);
  const range = encodeURIComponent("Deals!A:H");
  const response = await send(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?majorDimension=ROWS`,
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
