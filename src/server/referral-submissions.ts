import { createHash } from "node:crypto";
import type { ReferralSubmission } from "../lib/referral-submission";
import { database } from "./database";
import { SubmissionConflict } from "./submissions";
export async function saveReferralSubmission(input: ReferralSubmission) {
  const sql = database();
  const { idempotencyKey: id, website: _website, attribution, ...data } = input;
  const hash = createHash("sha256")
    .update(JSON.stringify({ ...data, attribution }))
    .digest("hex");
  await sql.begin(async (tx) => {
    await tx`SELECT rancher.record_submission_attribution(
      ${data.referrer_email}, ${id}, 'referral', ${tx.json(attribution.first)}, ${tx.json(attribution.last)}
    )`;
    const rows =
      await tx`INSERT INTO rancher.referral_submissions (id, referrer_first_name, referrer_last_name, referrer_email, referral_first_name, referral_last_name, referral_email, company_size, industry, request_hash)
      VALUES (${id}, ${data.referrer_first_name}, ${data.referrer_last_name}, ${data.referrer_email}, ${data.referral_first_name}, ${data.referral_last_name}, ${data.referral_email}, ${data.company_size}, ${data.industry}, ${hash})
      ON CONFLICT (id) DO NOTHING RETURNING id`;
    if (rows.length) return;
    const [existing] =
      await tx`SELECT request_hash FROM rancher.referral_submissions WHERE id = ${id}`;
    if (existing?.request_hash !== hash) throw new SubmissionConflict();
  });
}
