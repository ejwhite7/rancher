import postgres from "postgres";
import { readFile } from "node:fs/promises";
const connection = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connection)
  throw new Error(
    "Set POSTGRES_URL or DATABASE_URL before running migrations.",
  );
const host = new URL(connection).hostname;
const sql = postgres(connection, {
  max: 1,
  prepare: false,
  ssl: ["localhost", "127.0.0.1", "[::1]"].includes(host) ? false : "require",
});
try {
  const migration = await readFile(
    new URL(
      "../db/migrations/001_partnership_submissions.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await sql.begin(async (transaction) => {
    await transaction.unsafe(migration);
  });
  console.log("Rancher submissions migration applied.");
} finally {
  await sql.end();
}
