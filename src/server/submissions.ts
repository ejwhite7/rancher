import { createHash } from "node:crypto";
import { calculateEstimate } from "../lib/estimate";
import { CONSENT_TEXT, type Submission } from "../lib/submission";
import { REFERRAL_BONUS_USD } from "./referral";
import { database } from "./database";

export async function saveSubmission(input: Submission): Promise<void> {
  const sql = database();
  const { idempotencyKey: id, website: _website, ...data } = input;
  const hash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  const scenario = data.scenario
    ? {
        ...data.scenario,
        estimate: calculateEstimate(
          data.scenario.employees,
          data.scenario.years,
          data.scenario.country,
        ),
        benchmark: "handshake-2026-09-12",
      }
    : null;
  const rows = await sql`
    INSERT INTO rancher.partnership_submissions (
      id, name, email, job_title, company, team_size, data_history, records_description, record_types,
      outreach_consent, consent_text, calculator_scenario, request_hash, referral_bonus_usd
    ) VALUES (
      ${id}, ${data.name}, ${data.email}, ${data.title}, ${data.company}, ${data.size}, ${data.history}, ${data.records}, ARRAY(SELECT jsonb_array_elements_text(${sql.typed(JSON.stringify(data.recordTypes), 25)}::jsonb)),
      ${data.outreachConsent}, ${CONSENT_TEXT}, ${scenario === null ? null : sql.json(scenario)}, ${hash}, ${REFERRAL_BONUS_USD[data.size]}
    ) ON CONFLICT (id) DO NOTHING RETURNING id
  `;
  if (rows.length) return;
  const [existing] =
    await sql`SELECT request_hash FROM rancher.partnership_submissions WHERE id = ${id}`;
  if (existing?.request_hash !== hash) throw new SubmissionConflict();
}
export class SubmissionConflict extends Error {}
