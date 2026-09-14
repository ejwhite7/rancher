ALTER TABLE rancher.partnership_submissions
  ADD COLUMN IF NOT EXISTS job_title text;

CREATE OR REPLACE FUNCTION rancher.enqueue_submission_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id,
    'type', 'submission.created',
    'schema_version', 2,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id,
      'name', NEW.name,
      'email', NEW.email,
      'job_title', NEW.job_title,
      'company', NEW.company,
      'company_size', NEW.team_size,
      'data_history', NEW.data_history,
      'record_types', NEW.record_types,
      'additional_context', NEW.records_description,
      'outreach_consent', NEW.outreach_consent,
      'consent_text', NEW.consent_text,
      'consent_prechecked', NEW.consent_prechecked,
      'consent_recorded_at', NEW.consent_recorded_at,
      'calculator_scenario', NEW.calculator_scenario,
      'referral_bonus_usd', NEW.referral_bonus_usd
    )
  ));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rancher.enqueue_submission_webhook() FROM PUBLIC;
