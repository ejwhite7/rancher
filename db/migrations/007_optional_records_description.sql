ALTER TABLE rancher.partnership_submissions
  DROP CONSTRAINT IF EXISTS partnership_submissions_records_description_check;

ALTER TABLE rancher.partnership_submissions
  ADD CONSTRAINT partnership_submissions_records_description_check CHECK (
    length(records_description) <= 2000
  );
