CREATE TABLE IF NOT EXISTS rancher.referral_submissions (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  referrer_first_name text NOT NULL CHECK (length(btrim(referrer_first_name)) BETWEEN 1 AND 120),
  referrer_last_name text NOT NULL CHECK (length(btrim(referrer_last_name)) BETWEEN 1 AND 120),
  referrer_email text NOT NULL CHECK (length(btrim(referrer_email)) BETWEEN 1 AND 180),
  referral_first_name text NOT NULL CHECK (length(btrim(referral_first_name)) BETWEEN 1 AND 120),
  referral_last_name text NOT NULL CHECK (length(btrim(referral_last_name)) BETWEEN 1 AND 120),
  referral_email text NOT NULL CHECK (length(btrim(referral_email)) BETWEEN 1 AND 180),
  company_size text NOT NULL CHECK (length(btrim(company_size)) BETWEEN 1 AND 120),
  industry text NOT NULL CHECK (length(btrim(industry)) BETWEEN 1 AND 120),
  request_hash text NOT NULL CHECK (length(request_hash) = 64)
);
CREATE INDEX IF NOT EXISTS referral_submissions_created_at_idx
  ON rancher.referral_submissions (created_at DESC);
ALTER TABLE rancher.referral_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rancher.referral_submissions FROM PUBLIC;

-- Match the existing server's restricted writer role. It can insert referrals
-- and read only the columns needed to deduplicate a retry, not referral content.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rancher_form_writer') THEN
    GRANT INSERT ON rancher.referral_submissions TO rancher_form_writer;
    GRANT SELECT (id, request_hash) ON rancher.referral_submissions TO rancher_form_writer;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'rancher' AND tablename = 'referral_submissions' AND policyname = 'referral_form_insert') THEN
      CREATE POLICY referral_form_insert ON rancher.referral_submissions FOR INSERT TO rancher_form_writer WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'rancher' AND tablename = 'referral_submissions' AND policyname = 'referral_form_retry') THEN
      CREATE POLICY referral_form_retry ON rancher.referral_submissions FOR SELECT TO rancher_form_writer USING (true);
    END IF;
  END IF;
END $$;

ALTER TABLE rancher.webhook_outbox
  ADD COLUMN IF NOT EXISTS referral_submission_id uuid GENERATED ALWAYS AS
    (CASE WHEN payload->>'type' = 'referral.submission.created' THEN id END) STORED;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'rancher.webhook_outbox'::regclass AND conname = 'webhook_referral_parent') THEN
    ALTER TABLE rancher.webhook_outbox ADD CONSTRAINT webhook_referral_parent
      FOREIGN KEY (referral_submission_id) REFERENCES rancher.referral_submissions(id) ON DELETE CASCADE;
  END IF;
END $$;
ALTER TABLE rancher.webhook_outbox DROP CONSTRAINT IF EXISTS webhook_one_parent;
ALTER TABLE rancher.webhook_outbox ADD CONSTRAINT webhook_one_parent
  CHECK (num_nonnulls(partnership_submission_id, contact_submission_id, referral_submission_id) = 1);

CREATE OR REPLACE FUNCTION rancher.enqueue_referral_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id,
    'type', 'referral.submission.created',
    'schema_version', 1,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id,
      'form', 'referral',
      'referrer_first_name', NEW.referrer_first_name,
      'referrer_last_name', NEW.referrer_last_name,
      'referrer_email', NEW.referrer_email,
      'referral_first_name', NEW.referral_first_name,
      'referral_last_name', NEW.referral_last_name,
      'referral_email', NEW.referral_email,
      'company_size', NEW.company_size,
      'industry', NEW.industry
    )
  ));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rancher.enqueue_referral_webhook() FROM PUBLIC;
DROP TRIGGER IF EXISTS referral_webhook_enqueue ON rancher.referral_submissions;
CREATE TRIGGER referral_webhook_enqueue AFTER INSERT ON rancher.referral_submissions
  FOR EACH ROW EXECUTE FUNCTION rancher.enqueue_referral_webhook();
