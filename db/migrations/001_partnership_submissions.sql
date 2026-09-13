CREATE SCHEMA IF NOT EXISTS rancher;
REVOKE ALL ON SCHEMA rancher FROM PUBLIC;

CREATE TABLE IF NOT EXISTS rancher.partnership_submissions (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 180),
  company text NOT NULL CHECK (length(btrim(company)) BETWEEN 1 AND 180),
  team_size text NOT NULL CHECK (team_size IN ('20–100', '101–500', '501–1,000', '1,001+')),
  data_history text NOT NULL CHECK (data_history IN ('Less than 1 year', '1–3 years', '3–5 years', '5+ years', 'Not sure yet')),
  records_description text NOT NULL CHECK (length(btrim(records_description)) BETWEEN 1 AND 2000),
  outreach_consent boolean NOT NULL CHECK (outreach_consent = true),
  consent_text text NOT NULL,
  consent_prechecked boolean NOT NULL DEFAULT true,
  consent_recorded_at timestamptz NOT NULL DEFAULT now(),
  calculator_scenario jsonb,
  request_hash text NOT NULL CHECK (length(request_hash) = 64)
);
CREATE INDEX IF NOT EXISTS partnership_submissions_created_at_idx
  ON rancher.partnership_submissions (created_at DESC);
ALTER TABLE rancher.partnership_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rancher.partnership_submissions FROM PUBLIC;
-- No public policies: browser/anonymous clients have no access. Only the server
-- uses the Supabase provisioned Postgres connection to write submissions.
