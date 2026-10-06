import type { APIRoute } from "astro";
import { database } from "../../../server/database";
import {
  readDealsSheet,
  writeSheetRow,
} from "../../../server/google-sheets";

export const prerender = false;

export const POST: APIRoute = async () => {
  const [submission] = await database()`
    SELECT company, name, email, team_size, data_history, business_active,
      records_description, record_types
    FROM rancher.partnership_submissions
    WHERE id = '1000696d-6d0e-497b-85dd-5b2b0821c8bf'
  `;
  if (!submission) return Response.json({ error: "missing" }, { status: 404 });
  const rows = await readDealsSheet();
  const existing = rows.findIndex((row) => row[2] === submission.email);
  if (existing >= 0) return Response.json({ found: true, row: existing + 1 });
  const row = rows.length + 1;
  await writeSheetRow(row, [
    submission.company,
    submission.name,
    submission.email,
    "",
    submission.team_size,
    submission.data_history,
    "",
    [...submission.record_types, submission.records_description]
      .filter(Boolean)
      .join("; "),
    String(submission.business_active),
  ]);
  return Response.json({ found: false, added: true, row });
};
