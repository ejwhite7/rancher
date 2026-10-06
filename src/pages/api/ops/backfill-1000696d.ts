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
  const values = [
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
  ];
  const existing = rows.findIndex((row) => row[2] === submission.email);
  const empty = rows.findIndex(
    (row, index) => index > 0 && row.slice(0, 9).every((value) => !value),
  );
  const row = (empty < 0 ? rows.length : empty) + 1;
  if (existing === row - 1)
    return Response.json({ found: true, row: existing + 1 });
  await writeSheetRow(row, values);
  if (existing >= 0)
    await writeSheetRow(existing + 1, Array<string>(9).fill(""));
  return Response.json({ moved: existing >= 0, row });
};
