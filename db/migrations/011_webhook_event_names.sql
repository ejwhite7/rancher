-- Add stable business event names to form webhook envelopes for routing.
CREATE OR REPLACE FUNCTION rancher.enqueue_submission_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attribution jsonb;
BEGIN
  SELECT jsonb_build_object('first', first_touch, 'last', last_touch)
    INTO attribution FROM rancher.submission_attribution WHERE submission_id = NEW.id;
  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id,
    'type', 'submission.created',
    'event_name', 'partnership_request_submitted',
    'schema_version', 5,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id, 'name', NEW.name, 'email', NEW.email,
      'domain', lower(split_part(NEW.email, '@', 2)), 'job_title', NEW.job_title,
      'company', NEW.company, 'company_size', NEW.team_size,
      'data_history', NEW.data_history, 'record_types', NEW.record_types,
      'additional_context', NEW.records_description,
      'outreach_consent', NEW.outreach_consent, 'consent_text', NEW.consent_text,
      'consent_prechecked', NEW.consent_prechecked,
      'consent_recorded_at', NEW.consent_recorded_at,
      'calculator_scenario', NEW.calculator_scenario,
      'referral_bonus_usd', NEW.referral_bonus_usd,
      'attribution', COALESCE(attribution, jsonb_build_object('first', '{}'::jsonb, 'last', '{}'::jsonb))
    )
  ));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rancher.enqueue_submission_webhook() FROM PUBLIC;

CREATE OR REPLACE FUNCTION rancher.enqueue_contact_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attribution jsonb;
BEGIN
  SELECT jsonb_build_object('first', first_touch, 'last', last_touch)
    INTO attribution FROM rancher.submission_attribution WHERE submission_id = NEW.id;
  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id,
    'type', 'contact.submission.created',
    'event_name', 'contact_form_submitted',
    'schema_version', 3,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id, 'form', 'contact', 'name', NEW.name,
      'email', NEW.email, 'domain', split_part(NEW.email, '@', 2),
      'message', NEW.message,
      'attribution', COALESCE(attribution, jsonb_build_object('first', '{}'::jsonb, 'last', '{}'::jsonb))
    )
  ));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rancher.enqueue_contact_webhook() FROM PUBLIC;

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
    'schema_version', 3,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id, 'form', 'referral',
      'referrer_first_name', NEW.referrer_first_name,
      'referrer_last_name', NEW.referrer_last_name,
      'referrer_email', NEW.referrer_email,
      'referral_first_name', NEW.referral_first_name,
      'referral_last_name', NEW.referral_last_name,
      'referral_email', NEW.referral_email,
      'company_size', NEW.company_size, 'industry', NEW.industry,
      'attribution', COALESCE(attribution, jsonb_build_object('first', '{}'::jsonb, 'last', '{}'::jsonb))
    )
  ));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rancher.enqueue_referral_webhook() FROM PUBLIC;
