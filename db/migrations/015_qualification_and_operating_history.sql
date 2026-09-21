ALTER TABLE rancher.partnership_submissions
  DROP CONSTRAINT IF EXISTS partnership_submissions_data_history_check;
ALTER TABLE rancher.partnership_submissions
  ADD CONSTRAINT partnership_submissions_data_history_check CHECK (data_history IN (
    'Less than 1 year', '1–3 years', '3–5 years', '5+ years', 'Not sure yet',
    '0–3 years', '6–10 years', '11–15 years', '16–19 years', '20+ years'
  ));

CREATE OR REPLACE FUNCTION rancher.enqueue_submission_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attribution jsonb;
DECLARE qualifies boolean;
BEGIN
  SELECT jsonb_build_object('first', first_touch, 'last', last_touch)
    INTO attribution FROM rancher.submission_attribution WHERE submission_id = NEW.id;
  attribution := COALESCE(
    attribution,
    jsonb_build_object('first', '{}'::jsonb, 'last', '{}'::jsonb)
  );
  qualifies := NEW.team_size NOT IN ('1–10', '11–19');

  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id,
    'type', 'submission.created',
    'event_name', 'partnership_request_submitted',
    'schema_version', 9,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id, 'name', NEW.name, 'email', NEW.email,
      'domain', lower(split_part(NEW.email, '@', 2)), 'job_title', NEW.job_title,
      'company', NEW.company, 'company_size', NEW.team_size,
      'rancher_company_size', NEW.team_size,
      'qualifies', qualifies,
      'qualification_status', CASE
        WHEN qualifies THEN 'qualified'
        ELSE 'does_not_qualify'
      END,
      'data_history', NEW.data_history, 'record_types', NEW.record_types,
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
      'referral_bonus_usd', NEW.referral_bonus_usd,
      'attribution', attribution,
      'conversion_attribution', jsonb_build_object(
        'schema_version', 1,
        'submission_id', NEW.id,
        'converted_at', NEW.created_at,
        'first_touch', attribution->'first',
        'conversion_touch', attribution->'last'
      )
    )
  ));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rancher.enqueue_submission_webhook() FROM PUBLIC;
