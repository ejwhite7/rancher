import { createHash } from "node:crypto";
import { calculateEstimate } from "../lib/estimate";
import {
  CONSENT_TEXT,
  CONSENT_VERSION,
  type Submission,
} from "../lib/submission";
import { REFERRAL_BONUS_USD } from "./referral";
import { database } from "./database";

export type SubmissionConsentEvidence = {
  consentVersion: string;
  consentRecordedAt: string | null;
};

type ConsentEvidenceRow = {
  consent_version: string | null;
  consent_recorded_at: Date | string | null;
};

const consentEvidence = (row: ConsentEvidenceRow): SubmissionConsentEvidence => ({
  consentVersion: row.consent_version || CONSENT_VERSION,
  consentRecordedAt:
    row.consent_recorded_at instanceof Date
      ? row.consent_recorded_at.toISOString()
      : row.consent_recorded_at,
});

export async function saveSubmission(
  input: Submission,
): Promise<SubmissionConsentEvidence> {
  const sql = database();
  const { idempotencyKey: id, website: _website, attribution, ...data } = input;
  const hash = createHash("sha256")
    .update(JSON.stringify({ ...data, attribution }))
    .digest("hex");
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
  return await sql.begin(async (tx) => {
    await tx`SELECT rancher.record_submission_attribution(
      ${data.email}, ${id}, 'partnership', ${tx.json(attribution.first)}, ${tx.json(attribution.last)}
    )`;
    const rows = await tx`
      INSERT INTO rancher.partnership_submissions (
        id, name, email, job_title, company, team_size, data_history, records_description, record_types,
        outreach_consent, consent_text, consent_version, consent_prechecked,
        consent_recorded_at, phone_e164, calculator_scenario, request_hash, referral_bonus_usd
      ) VALUES (
        ${id}, ${data.name}, ${data.email}, ${data.title}, ${data.company}, ${data.size}, ${data.history}, ${data.records}, ARRAY(SELECT jsonb_array_elements_text(${tx.typed(JSON.stringify(data.recordTypes), 25)}::jsonb)),
        ${data.communicationsConsent}, ${CONSENT_TEXT}, ${CONSENT_VERSION}, false,
        CASE WHEN ${data.communicationsConsent} THEN now() ELSE NULL END,
        ${data.phone}, ${scenario === null ? null : tx.json(scenario)}, ${hash}, ${REFERRAL_BONUS_USD[data.size]}
      ) ON CONFLICT (id) DO NOTHING
      RETURNING consent_version, consent_recorded_at
    `;
    if (rows.length)
      return consentEvidence(rows[0] as unknown as ConsentEvidenceRow);
    const [existing] = await tx`
      SELECT request_hash, consent_version, consent_recorded_at
      FROM rancher.partnership_submissions WHERE id = ${id}
    `;
    if (existing?.request_hash !== hash) throw new SubmissionConflict();
    return consentEvidence(existing as unknown as ConsentEvidenceRow);
  });
}
export class SubmissionConflict extends Error {}
