CREATE TABLE IF NOT EXISTS rancher.webhook_outbox (
  id uuid PRIMARY KEY REFERENCES rancher.partnership_submissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  last_http_status integer,
  last_error text,
  delivered_at timestamptz
);
CREATE INDEX IF NOT EXISTS webhook_outbox_pending_idx
  ON rancher.webhook_outbox (available_at) WHERE status IN ('pending', 'processing');
ALTER TABLE rancher.webhook_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rancher.webhook_outbox FROM PUBLIC;

CREATE OR REPLACE FUNCTION rancher.enqueue_submission_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id,
    'type', 'submission.created',
    'schema_version', 1,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id,
      'name', NEW.name,
      'email', NEW.email,
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
DROP TRIGGER IF EXISTS submission_webhook_enqueue ON rancher.partnership_submissions;
CREATE TRIGGER submission_webhook_enqueue
  AFTER INSERT ON rancher.partnership_submissions
  FOR EACH ROW EXECUTE FUNCTION rancher.enqueue_submission_webhook();
-- Existing rows are deliberately not backfilled; an INSERT queues one new event.
