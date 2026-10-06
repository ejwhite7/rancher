import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { database } from "../src/server/database";
import { saveSubmission, SubmissionConflict } from "../src/server/submissions";
import type { Submission } from "../src/lib/submission";

type Sql = ReturnType<typeof database>;

async function verifyMigrationReruns(sql: Sql) {
  const migrations = await Promise.all(
    [
      "001_partnership_submissions.sql",
      "002_record_types_and_history.sql",
      "003_company_size_referral.sql",
      "004_submission_webhook_outbox.sql",
      "005_job_title.sql",
      "006_submission_domain.sql",
      "007_optional_records_description.sql",
      "008_phone_communications_consent.sql",
    ].map((file) => readFile(`db/migrations/${file}`, "utf8")),
  );
  for (let run = 0; run < 2; run++) {
    await sql.begin(async (tx) => {
      await tx.unsafe(migrations[0]);
      await tx.unsafe(migrations[1]);
    });
  }
  for (let run = 0; run < 2; run++) {
    for (const migration of migrations.slice(2)) await sql.unsafe(migration);
  }
}

async function verifyReferralAmounts(sql: Sql, row: Submission) {
  for (const [size, amount] of [
    ["20–49", 8000],
    ["50–199", 14000],
    ["200–499", 28000],
    ["500–999", 42000],
    ["1,000–4,999", 54000],
    ["5,000+", 75000],
  ] as const) {
    const caseId = randomUUID();
    try {
      await saveSubmission({ ...row, idempotencyKey: caseId, size });
      const [saved] =
        await sql`SELECT referral_bonus_usd FROM rancher.partnership_submissions WHERE id = ${caseId}`;
      expect(saved.referral_bonus_usd).toBe(amount);
    } finally {
      await sql`DELETE FROM rancher.partnership_submissions WHERE id = ${caseId}`;
    }
  }
}

async function submitBrowserRequest(page: Page, browserEmail: string) {
  await page.route("https://cal.com/growthcast/discovery", (route) =>
    route.fulfill({ body: "Booking calendar" }),
  );
  await page.goto("/");
  await expect(page.locator("#intake button")).toBeEnabled();
  await page.getByLabel("Your name").fill("Automated browser test");
  await page.getByLabel("Work email").fill(browserEmail);
  await page.getByLabel("Job title").fill("VP of Operations");
  await page
    .getByLabel("Company", { exact: true })
    .fill("Synthetic test company");
  await page.locator('[name="size"]').selectOption("20–49");
  await page.locator('[name="history"]').selectOption("3–5 years");
  await page.getByLabel("Documents & files", { exact: true }).check();
  await page
    .locator('[name="records"]')
    .fill("Synthetic browser persistence test");
  await page.getByRole("button", { name: "Submit & book a call" }).click();
  await expect(page).toHaveURL("https://cal.com/growthcast/discovery");
}

// Opt-in only: this test creates a read-only test role in an isolated local DB.
test.skip(
  process.env.RUN_DATABASE_TESTS !== "1",
  "Run with the isolated local Postgres test environment.",
);
test("Postgres migration, idempotent insertion, server estimates, and RLS", async ({
  page,
}) => {
  expect(new URL(process.env.POSTGRES_URL!).hostname).toBe("127.0.0.1");
  const sql = database();
  const id = randomUUID();
  const browserEmail = `browser-${id}@example.com`;
  const row: Submission = {
    idempotencyKey: id,
    name: "Automated persistence test",
    email: "test@example.com",
    title: "VP of Operations",
    company: "Example'); DROP TABLE rancher.partnership_submissions; --",
    size: "20–49",
    history: "3–5 years",
    records: "",
    recordTypes: ["Documents & files"],
    phone: "+12125550123",
    communicationsConsent: true,
    scenario: { employees: 100, years: 10, country: "Canada" },
  };
  try {
    await verifyMigrationReruns(sql);
    await Promise.all([saveSubmission(row), saveSubmission(row)]);
    const records =
      await sql`SELECT * FROM rancher.partnership_submissions WHERE id = ${id}`;
    expect(records).toHaveLength(1);
    expect(records[0].company).toBe(row.company);
    expect(records[0].referral_bonus_usd).toBe(8000);
    await verifyReferralAmounts(sql, row);
    expect(records[0].calculator_scenario.estimate.low).toBe(287313);
    expect(records[0].phone_e164).toBe("+12125550123");
    expect(records[0].outreach_consent).toBe(true);
    expect(records[0].consent_prechecked).toBe(false);
    expect(records[0].consent_version).toBe("communications-v1-2026-09-19");
    expect(records[0].consent_recorded_at).toBeTruthy();
    await expect(
      saveSubmission({ ...row, company: "Different company" }),
    ).rejects.toBeInstanceOf(SubmissionConflict);
    await sql.unsafe(
      "DO $$ BEGIN CREATE ROLE rancher_test_reader; EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
    );
    await sql`GRANT USAGE ON SCHEMA rancher TO rancher_test_reader`;
    await sql`GRANT SELECT ON rancher.partnership_submissions TO rancher_test_reader`;
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE rancher_test_reader`;
      expect(
        await tx`SELECT * FROM rancher.partnership_submissions`,
      ).toHaveLength(0);
    });
    await submitBrowserRequest(page, browserEmail);
    const browserRows =
      await sql`SELECT * FROM rancher.partnership_submissions WHERE email = ${browserEmail}`;
    expect(browserRows).toHaveLength(1);
    expect(browserRows[0].job_title).toBe("VP of Operations");
    expect(browserRows[0].record_types).toEqual(["Documents & files"]);
    expect(browserRows[0].records_description).toBe(
      "Synthetic browser persistence test",
    );
  } finally {
    await sql`DELETE FROM rancher.partnership_submissions WHERE id = ${id} OR email = ${browserEmail}`;
    // The Playwright worker owns the shared database connection pool.
  }
});
