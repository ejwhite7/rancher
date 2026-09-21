ALTER TABLE rancher.partnership_submissions
  DROP CONSTRAINT IF EXISTS partnership_submissions_team_size_check;
ALTER TABLE rancher.partnership_submissions
  ADD CONSTRAINT partnership_submissions_team_size_check CHECK (team_size IN (
    '20–100', '101–500', '501–1,000', '1,001+',
    '1–10', '11–19', '20–49', '50–199', '200–499', '500–999',
    '1,000–4,999', '5,000+'
  ));
ALTER TABLE rancher.partnership_submissions
  DROP CONSTRAINT IF EXISTS partnership_submissions_referral_bonus_check;
ALTER TABLE rancher.partnership_submissions
  ADD CONSTRAINT partnership_submissions_referral_bonus_check CHECK (
    referral_bonus_usd IS NULL OR
    (team_size = '1–10' AND referral_bonus_usd = 0) OR
    (team_size = '11–19' AND referral_bonus_usd = 0) OR
    (team_size = '20–49' AND referral_bonus_usd = 8000) OR
    (team_size = '50–199' AND referral_bonus_usd = 14000) OR
    (team_size = '200–499' AND referral_bonus_usd = 28000) OR
    (team_size = '500–999' AND referral_bonus_usd = 42000) OR
    (team_size = '1,000–4,999' AND referral_bonus_usd = 54000) OR
    (team_size = '5,000+' AND referral_bonus_usd = 75000)
  );

CREATE OR REPLACE FUNCTION rancher.enqueue_submission_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attribution jsonb;
BEGIN
  SELECT jsonb_build_object('first', first_touch, 'last', last_touch)
    INTO attribution FROM rancher.submission_attribution WHERE submission_id = NEW.id;
  attribution := COALESCE(
    attribution,
    jsonb_build_object('first', '{}'::jsonb, 'last', '{}'::jsonb)
  );

  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id,
    'type', 'submission.created',
    'event_name', 'partnership_request_submitted',
    'schema_version', 8,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id, 'name', NEW.name, 'email', NEW.email,
      'domain', lower(split_part(NEW.email, '@', 2)), 'job_title', NEW.job_title,
      'company', NEW.company, 'company_size', NEW.team_size,
      'rancher_company_size', NEW.team_size,
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

CREATE OR REPLACE FUNCTION rancher.enqueue_referral_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attribution jsonb;
BEGIN
  SELECT jsonb_build_object('first', first_touch, 'last', last_touch)
    INTO attribution FROM rancher.submission_attribution WHERE submission_id = NEW.id;
  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id,
    'type', 'referral.submission.created',
    'event_name', 'referral_form_submitted',
    'schema_version', 4,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id, 'form', 'referral',
      'referrer_first_name', NEW.referrer_first_name,
      'referrer_last_name', NEW.referrer_last_name,
      'referrer_email', NEW.referrer_email,
      'referral_first_name', NEW.referral_first_name,
      'referral_last_name', NEW.referral_last_name,
      'referral_email', NEW.referral_email,
      'company_size', NEW.company_size,
      'rancher_company_size', NEW.company_size,
      'industry', NEW.industry,
      'attribution', COALESCE(attribution, jsonb_build_object('first', '{}'::jsonb, 'last', '{}'::jsonb))
    )
  ));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rancher.enqueue_referral_webhook() FROM PUBLIC;
