import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { database } from '../src/server/database';
import { saveSubmission, SubmissionConflict } from '../src/server/submissions';
import type { Submission } from '../src/lib/submission';

// Opt-in only: this test creates a read-only test role in an isolated local DB.
test.skip(process.env.RUN_DATABASE_TESTS !== '1', 'Run with the isolated local Postgres test environment.');
test('Postgres migration, idempotent insertion, server estimates, and RLS', async ({ page }) => {
  expect(new URL(process.env.POSTGRES_URL!).hostname).toBe('127.0.0.1');
  const sql = database();
  const id = randomUUID();
  const browserEmail = `browser-${id}@example.com`;
  const row: Submission = {
    idempotencyKey: id, name: 'Automated persistence test', email: 'test@example.com',
    company: "Example'); DROP TABLE rancher.partnership_submissions; --", size: '20–100',
    history: '3–5 years', records: 'Synthetic test data', outreachConsent: true,
    scenario: { employees: 100, years: 10, country: 'Canada' },
  };
  try {
    const migration = await readFile('db/migrations/001_partnership_submissions.sql', 'utf8');
    await sql.begin(async tx => { await tx.unsafe(migration); });
    await sql.begin(async tx => { await tx.unsafe(migration); });
    await Promise.all([saveSubmission(row), saveSubmission(row)]);
    const records = await sql`SELECT * FROM rancher.partnership_submissions WHERE id = ${id}`;
    expect(records).toHaveLength(1);
    expect(records[0].company).toBe(row.company);
    expect(records[0].calculator_scenario.estimate.low).toBe(287313);
    expect(records[0].outreach_consent).toBe(true);
    expect(records[0].consent_prechecked).toBe(true);
    expect(records[0].consent_recorded_at).toBeTruthy();
    await expect(saveSubmission({ ...row, company: 'Different company' })).rejects.toBeInstanceOf(SubmissionConflict);
    await sql.unsafe('DO $$ BEGIN CREATE ROLE rancher_test_reader; EXCEPTION WHEN duplicate_object THEN NULL; END $$;');
    await sql`GRANT USAGE ON SCHEMA rancher TO rancher_test_reader`;
    await sql`GRANT SELECT ON rancher.partnership_submissions TO rancher_test_reader`;
    await sql.begin(async tx => {
      await tx`SET LOCAL ROLE rancher_test_reader`;
      expect(await tx`SELECT * FROM rancher.partnership_submissions`).toHaveLength(0);
    });
    await page.route('https://cal.com/growthcast/discovery', route => route.fulfill({ body: 'Booking calendar' }));
    await page.goto('/');
    await expect(page.locator('#intake button')).toBeEnabled();
    await page.getByLabel('Your name').fill('Automated browser test');
    await page.getByLabel('Work email').fill(browserEmail);
    await page.getByLabel('Company', { exact: true }).fill('Synthetic test company');
    await page.locator('[name="size"]').selectOption('20–100');
    await page.locator('[name="history"]').selectOption('3–5 years');
    await page.locator('[name="records"]').fill('Synthetic browser persistence test');
    await page.getByRole('button', { name: 'Submit & book a call' }).click();
    await expect(page).toHaveURL('https://cal.com/growthcast/discovery');
    const browserRows = await sql`SELECT * FROM rancher.partnership_submissions WHERE email = ${browserEmail}`;
    expect(browserRows).toHaveLength(1);
    expect(browserRows[0].records_description).toBe('Synthetic browser persistence test');
  } finally {
    await sql`DELETE FROM rancher.partnership_submissions WHERE id = ${id} OR email = ${browserEmail}`;
    await sql.end();
  }
});
