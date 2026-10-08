import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { HISTORY_RANGES, TEAM_SIZES } from "../lib/submission";
import {
  readSubmissionInput,
  submissionJson as json,
} from "./submission-transport";
import { ensureSheetRow } from "./google-sheets";
import { serverLog } from "./logger";

const range = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/-/g, "–") : value;
const metaLeadSchema = z.object({
  lead_id: z
    .string()
    .trim()
    .regex(/^\d{5,80}$/),
  name: z.string().trim().min(1).max(120),
  email: z
    .email()
    .max(180)
    .transform((value) => value.toLowerCase()),
  company: z.string().trim().max(180).optional().default(""),
  company_size: z.preprocess(range, z.enum(TEAM_SIZES)),
  data_history: z.preprocess(range, z.enum(HISTORY_RANGES)),
  is_business_active: z.boolean().optional(),
  record_types: z
    .array(z.string().trim().max(120))
    .max(9)
    .optional()
    .default([]),
  is_internal_user: z.boolean().optional().default(false),
});

export function metaSheetRow(input: unknown) {
  const lead = metaLeadSchema.parse(input);
  if (lead.is_internal_user) return null;
  return [
    lead.company,
    lead.name,
    lead.email,
    "",
    lead.company_size,
    lead.data_history,
    lead.is_business_active ?? "",
    lead.record_types.join("; "),
    "",
  ];
}

function validateMetaRequest(request: Request, secret: string | undefined) {
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (
    !secret ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return json({ error: "Unauthorized" }, 401);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return json({ error: "Send JSON." }, 415);
}

export async function handleMetaSheet(
  request: Request,
  secret: string | undefined,
  write: typeof ensureSheetRow = ensureSheetRow,
) {
  const invalid = validateMetaRequest(request, secret);
  if (invalid) return invalid;
  const body = await readSubmissionInput(request);
  if (body.error) return body.error;
  let row: ReturnType<typeof metaSheetRow>;
  try {
    row = metaSheetRow(body.input);
  } catch {
    return json({ error: "Invalid Meta lead." }, 400);
  }
  try {
    return json({ result: row ? await write(row) : "excluded" }, 200);
  } catch {
    await serverLog("error", "meta_google_sheets_sync_failed");
    // Non-2xx lets Hookdeck retry only this Sheet destination, not the lead event.
    return json(
      { error: "Sheet synchronization failed. Retry delivery." },
      503,
    );
  }
}
