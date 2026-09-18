DO $$
DECLARE test_id uuid := gen_random_uuid(); event_payload jsonb;
BEGIN
  INSERT INTO rancher.contact_submissions(id,name,email,message,request_hash)
  VALUES(test_id,'Webhook transaction test','webhook-test@example.com','Synthetic test enquiry',repeat('a',64));
  INSERT INTO rancher.contact_submissions(id,name,email,message,request_hash)
  VALUES(test_id,'Webhook transaction test','webhook-test@example.com','Synthetic test enquiry',repeat('a',64))
  ON CONFLICT (id) DO NOTHING;
  IF (SELECT count(*) FROM rancher.webhook_outbox WHERE id=test_id) <> 1 THEN
    RAISE EXCEPTION 'Expected one contact event after retry';
  END IF;
  SELECT payload INTO event_payload FROM rancher.webhook_outbox WHERE id=test_id;
  IF event_payload->>'type' <> 'contact.submission.created'
    OR event_payload->>'event_name' <> 'contact_form_submitted'
    OR event_payload->>'schema_version' <> '3'
    OR event_payload->'data'->>'submission_id' <> test_id::text
    OR event_payload->'data'->>'message' <> 'Synthetic test enquiry'
    OR event_payload->'data'->>'domain' <> 'example.com'
    OR event_payload->'data' ? 'request_hash'
    OR event_payload->'data' ? 'website' THEN
    RAISE EXCEPTION 'Invalid contact event payload';
  END IF;
  DELETE FROM rancher.contact_submissions WHERE id=test_id;
  IF EXISTS (SELECT 1 FROM rancher.webhook_outbox WHERE id=test_id) THEN
    RAISE EXCEPTION 'Contact event cleanup did not cascade';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='rancher.webhook_outbox'::regclass AND conname='webhook_partnership_parent') THEN
    RAISE EXCEPTION 'Partnership parent relationship missing';
  END IF;
END $$;
