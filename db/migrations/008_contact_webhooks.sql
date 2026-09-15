-- Keep the shared delivery worker and its retry history. Each event remains
-- tied to exactly one source row, with cascading cleanup for both form types.
ALTER TABLE rancher.webhook_outbox
  ADD COLUMN IF NOT EXISTS partnership_submission_id uuid GENERATED ALWAYS AS
    (CASE WHEN payload->>'type' = 'submission.created' THEN id END) STORED,
  ADD COLUMN IF NOT EXISTS contact_submission_id uuid GENERATED ALWAYS AS
    (CASE WHEN payload->>'type' = 'contact.submission.created' THEN id END) STORED;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'rancher.webhook_outbox'::regclass AND conname = 'webhook_partnership_parent') THEN
    ALTER TABLE rancher.webhook_outbox ADD CONSTRAINT webhook_partnership_parent
      FOREIGN KEY (partnership_submission_id) REFERENCES rancher.partnership_submissions(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'rancher.webhook_outbox'::regclass AND conname = 'webhook_contact_parent') THEN
    ALTER TABLE rancher.webhook_outbox ADD CONSTRAINT webhook_contact_parent
      FOREIGN KEY (contact_submission_id) REFERENCES rancher.contact_submissions(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'rancher.webhook_outbox'::regclass AND conname = 'webhook_one_parent') THEN
    ALTER TABLE rancher.webhook_outbox ADD CONSTRAINT webhook_one_parent
      CHECK (num_nonnulls(partnership_submission_id, contact_submission_id) = 1);
  END IF;
END $$;
ALTER TABLE rancher.webhook_outbox DROP CONSTRAINT IF EXISTS webhook_outbox_id_fkey;

CREATE OR REPLACE FUNCTION rancher.enqueue_contact_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO rancher.webhook_outbox (id, payload)
  VALUES (NEW.id, jsonb_build_object(
    'id', NEW.id,
    'type', 'contact.submission.created',
    'schema_version', 1,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'submission_id', NEW.id,
      'form', 'contact',
      'name', NEW.name,
      'email', NEW.email,
      'domain', split_part(NEW.email, '@', 2),
      'message', NEW.message
    )
  ));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rancher.enqueue_contact_webhook() FROM PUBLIC;
DROP TRIGGER IF EXISTS contact_webhook_enqueue ON rancher.contact_submissions;
CREATE TRIGGER contact_webhook_enqueue AFTER INSERT ON rancher.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION rancher.enqueue_contact_webhook();
-- Past enquiries are not resent. New inserts queue exactly one event atomically.
