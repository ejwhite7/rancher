CREATE TABLE IF NOT EXISTS rancher.user_attribution (
  email text PRIMARY KEY CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 180),
  first_touch jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(first_touch) = 'object' AND octet_length(first_touch::text) <= 20000),
  last_touch jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(last_touch) = 'object' AND octet_length(last_touch::text) <= 20000),
  first_submission_id uuid NOT NULL,
  first_form_type text NOT NULL CHECK (first_form_type IN ('partnership', 'contact', 'referral')),
  last_submission_id uuid NOT NULL,
  last_form_type text NOT NULL CHECK (last_form_type IN ('partnership', 'contact', 'referral')),
  partnership_first_touch jsonb CHECK (partnership_first_touch IS NULL OR (jsonb_typeof(partnership_first_touch) = 'object' AND octet_length(partnership_first_touch::text) <= 20000)),
  partnership_last_touch jsonb CHECK (partnership_last_touch IS NULL OR (jsonb_typeof(partnership_last_touch) = 'object' AND octet_length(partnership_last_touch::text) <= 20000)),
  partnership_submission_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_attribution_updated_at_idx
  ON rancher.user_attribution (updated_at DESC);
ALTER TABLE rancher.user_attribution ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rancher.user_attribution FROM PUBLIC;

CREATE TABLE IF NOT EXISTS rancher.submission_attribution (
  submission_id uuid PRIMARY KEY,
  email text NOT NULL CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 180),
  form_type text NOT NULL CHECK (form_type IN ('partnership', 'contact', 'referral')),
  first_touch jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(first_touch) = 'object' AND octet_length(first_touch::text) <= 20000),
  last_touch jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(last_touch) = 'object' AND octet_length(last_touch::text) <= 20000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submission_attribution_email_created_idx
  ON rancher.submission_attribution (email, created_at DESC);
ALTER TABLE rancher.submission_attribution ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rancher.submission_attribution FROM PUBLIC;

CREATE OR REPLACE FUNCTION rancher.record_submission_attribution(
  attribution_email text,
  attribution_submission_id uuid,
  attribution_form_type text,
  attribution_first_touch jsonb,
  attribution_last_touch jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  normalized_email text := lower(btrim(attribution_email));
  first_value jsonb := COALESCE(attribution_first_touch, '{}'::jsonb);
  last_value jsonb := COALESCE(attribution_last_touch, '{}'::jsonb);
  inserted_count integer;
BEGIN
  IF attribution_form_type NOT IN ('partnership', 'contact', 'referral') OR
     jsonb_typeof(first_value) <> 'object' OR jsonb_typeof(last_value) <> 'object' OR
     octet_length(first_value::text) > 20000 OR octet_length(last_value::text) > 20000 THEN
    RAISE EXCEPTION 'Invalid submission attribution';
  END IF;

  INSERT INTO rancher.submission_attribution (
    submission_id, email, form_type, first_touch, last_touch
  ) VALUES (
    attribution_submission_id, normalized_email, attribution_form_type,
    first_value, last_value
  )
  ON CONFLICT (submission_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN
    RETURN;
  END IF;

  INSERT INTO rancher.user_attribution (
    email, first_touch, last_touch, first_submission_id, first_form_type,
    last_submission_id, last_form_type,
    partnership_first_touch, partnership_last_touch, partnership_submission_id
  ) VALUES (
    normalized_email, first_value, last_value,
    attribution_submission_id, attribution_form_type,
    attribution_submission_id, attribution_form_type,
    CASE WHEN attribution_form_type = 'partnership' THEN first_value END,
    CASE WHEN attribution_form_type = 'partnership' THEN last_value END,
    CASE WHEN attribution_form_type = 'partnership' THEN attribution_submission_id END
  )
  ON CONFLICT (email) DO UPDATE SET
    last_touch = CASE
      WHEN attribution_form_type IN ('contact', 'referral') THEN EXCLUDED.last_touch
      ELSE rancher.user_attribution.last_touch
    END,
    last_submission_id = CASE
      WHEN attribution_form_type IN ('contact', 'referral') THEN EXCLUDED.last_submission_id
      ELSE rancher.user_attribution.last_submission_id
    END,
    last_form_type = CASE
      WHEN attribution_form_type IN ('contact', 'referral') THEN EXCLUDED.last_form_type
      ELSE rancher.user_attribution.last_form_type
    END,
    partnership_first_touch = CASE
      WHEN attribution_form_type = 'partnership' THEN COALESCE(rancher.user_attribution.partnership_first_touch, EXCLUDED.partnership_first_touch)
      ELSE rancher.user_attribution.partnership_first_touch
    END,
    partnership_last_touch = CASE
      WHEN attribution_form_type = 'partnership' THEN COALESCE(rancher.user_attribution.partnership_last_touch, EXCLUDED.partnership_last_touch)
      ELSE rancher.user_attribution.partnership_last_touch
    END,
    partnership_submission_id = CASE
      WHEN attribution_form_type = 'partnership' THEN COALESCE(rancher.user_attribution.partnership_submission_id, EXCLUDED.partnership_submission_id)
      ELSE rancher.user_attribution.partnership_submission_id
    END,
    updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION rancher.record_submission_attribution(text, uuid, text, jsonb, jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION rancher.delete_submission_attribution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attribution_email text;
BEGIN
  DELETE FROM rancher.submission_attribution
    WHERE submission_id = OLD.id
    RETURNING email INTO attribution_email;
  IF attribution_email IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM rancher.submission_attribution WHERE email = attribution_email
  ) THEN
    DELETE FROM rancher.user_attribution WHERE email = attribution_email;
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION rancher.delete_submission_attribution() FROM PUBLIC;

DROP TRIGGER IF EXISTS partnership_attribution_cleanup ON rancher.partnership_submissions;
CREATE TRIGGER partnership_attribution_cleanup
AFTER DELETE ON rancher.partnership_submissions
FOR EACH ROW EXECUTE FUNCTION rancher.delete_submission_attribution();
DROP TRIGGER IF EXISTS contact_attribution_cleanup ON rancher.contact_submissions;
CREATE TRIGGER contact_attribution_cleanup
AFTER DELETE ON rancher.contact_submissions
FOR EACH ROW EXECUTE FUNCTION rancher.delete_submission_attribution();
DROP TRIGGER IF EXISTS referral_attribution_cleanup ON rancher.referral_submissions;
CREATE TRIGGER referral_attribution_cleanup
AFTER DELETE ON rancher.referral_submissions
FOR EACH ROW EXECUTE FUNCTION rancher.delete_submission_attribution();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rancher_form_writer') THEN
    GRANT EXECUTE ON FUNCTION rancher.record_submission_attribution(text, uuid, text, jsonb, jsonb) TO rancher_form_writer;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION rancher.enqueue_submission_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attribution jsonb;
BEGIN
  SELECT jsonb_build_object('first', first_touch, 'last', last_touch)
    INTO attribution FROM rancher.submission_attribution WHERE submission_id = NEW.id;
  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id, 'type', 'submission.created', 'schema_version', 4,
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
    'id', NEW.id, 'type', 'contact.submission.created', 'schema_version', 2,
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
    'id', NEW.id, 'type', 'referral.submission.created', 'schema_version', 2,
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
