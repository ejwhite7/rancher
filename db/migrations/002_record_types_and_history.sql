ALTER TABLE rancher.partnership_submissions
  ADD COLUMN IF NOT EXISTS record_types text[] NOT NULL DEFAULT '{}';
-- Retain historical values without relabeling existing submissions.
-- The API accepts only the new 3–20+ year bands.
ALTER TABLE rancher.partnership_submissions
  DROP CONSTRAINT IF EXISTS partnership_submissions_data_history_check;
ALTER TABLE rancher.partnership_submissions
  ADD CONSTRAINT partnership_submissions_data_history_check CHECK (data_history IN (
    'Less than 1 year', '1–3 years', '3–5 years', '5+ years', 'Not sure yet',
    '0–3 years', '6–10 years', '11–15 years', '16–19 years', '20+ years'
  ));
