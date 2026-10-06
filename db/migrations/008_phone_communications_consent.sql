ALTER TABLE rancher.partnership_submissions
  DROP CONSTRAINT IF EXISTS partnership_submissions_outreach_consent_check;

ALTER TABLE rancher.partnership_submissions
  ALTER COLUMN consent_prechecked SET DEFAULT false,
  ALTER COLUMN consent_recorded_at DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS consent_version text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partnership_submissions_phone_e164_check'
      AND conrelid = 'rancher.partnership_submissions'::regclass
  ) THEN
    ALTER TABLE rancher.partnership_submissions
      ADD CONSTRAINT partnership_submissions_phone_e164_check
      CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION rancher.enqueue_submission_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id,
    'type', 'submission.created',
    'schema_version', 4,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id,
      'name', NEW.name,
      'email', NEW.email,
      'domain', lower(split_part(NEW.email, '@', 2)),
      'job_title', NEW.job_title,
      'company', NEW.company,
      'company_size', NEW.team_size,
      'data_history', NEW.data_history,
      'record_types', NEW.record_types,
      'additional_context', NEW.records_description,
      'phone', NEW.phone_e164,
      'communications_consent', NEW.outreach_consent,
      'consent_text', NEW.consent_text,
      'consent_version', NEW.consent_version,
      'consent_prechecked', NEW.consent_prechecked,
      'consent_recorded_at', CASE
        WHEN NEW.outreach_consent THEN NEW.consent_recorded_at
        ELSE NULL
      END,
      'calculator_scenario', NEW.calculator_scenario,
      'referral_bonus_usd', NEW.referral_bonus_usd
    )
  ));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rancher.enqueue_submission_webhook() FROM PUBLIC;
