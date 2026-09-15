import { createHash } from "node:crypto";
import type { ContactSubmission } from "../lib/contact-submission";
import { database } from "./database";
import { SubmissionConflict } from "./submissions";
export async function saveContactSubmission(input: ContactSubmission) {
  const sql = database();
  const { idempotencyKey: id, website: _website, ...data } = input;
  const hash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  const rows =
    await sql`INSERT INTO rancher.contact_submissions (id, name, email, message, request_hash)
    VALUES (${id}, ${data.name}, ${data.email}, ${data.message}, ${hash})
    ON CONFLICT (id) DO NOTHING RETURNING id`;
  if (rows.length) return;
  const [existing] =
    await sql`SELECT request_hash FROM rancher.contact_submissions WHERE id = ${id}`;
  if (existing?.request_hash !== hash) throw new SubmissionConflict();
}
