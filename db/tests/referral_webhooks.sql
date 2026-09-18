DO $$
DECLARE test_id uuid := gen_random_uuid(); event_payload jsonb;
BEGIN
  INSERT INTO rancher.referral_submissions(id,referrer_first_name,referrer_last_name,referrer_email,referral_first_name,referral_last_name,referral_email,company_size,industry,request_hash)
  VALUES(test_id,'Test','Referrer','referrer@example.com','Test','Referral','referred@example.org','50–199','Technology',repeat('a',64));
  INSERT INTO rancher.referral_submissions(id,referrer_first_name,referrer_last_name,referrer_email,referral_first_name,referral_last_name,referral_email,company_size,industry,request_hash)
  VALUES(test_id,'Test','Referrer','referrer@example.com','Test','Referral','referred@example.org','50–199','Technology',repeat('a',64))
  ON CONFLICT (id) DO NOTHING;
  IF (SELECT count(*) FROM rancher.webhook_outbox WHERE id=test_id) <> 1 THEN
    RAISE EXCEPTION 'Expected one referral event after retry';
  END IF;
  SELECT payload INTO event_payload FROM rancher.webhook_outbox WHERE id=test_id;
  IF event_payload->>'type' <> 'referral.submission.created'
    OR event_payload->>'event_name' <> 'referral_form_submitted'
    OR event_payload->>'schema_version' <> '3'
    OR event_payload->'data'->>'submission_id' <> test_id::text
    OR event_payload->'data'->>'referrer_email' <> 'referrer@example.com'
    OR event_payload->'data'->>'referral_email' <> 'referred@example.org'
    OR event_payload->'data'->>'industry' <> 'Technology'
    OR event_payload->'data'->>'company_size' <> '50–199'
    OR event_payload->'data' ? 'request_hash'
    OR event_payload->'data' ? 'website' THEN
    RAISE EXCEPTION 'Invalid referral event payload';
  END IF;
  DELETE FROM rancher.referral_submissions WHERE id=test_id;
  IF EXISTS (SELECT 1 FROM rancher.webhook_outbox WHERE id=test_id) THEN
    RAISE EXCEPTION 'Referral event cleanup did not cascade';
  END IF;
  IF (SELECT count(*) FROM pg_constraint WHERE conrelid='rancher.webhook_outbox'::regclass AND conname IN ('webhook_partnership_parent','webhook_contact_parent','webhook_referral_parent')) <> 3 THEN
    RAISE EXCEPTION 'Existing parent relationships missing';
  END IF;
  BEGIN
    INSERT INTO rancher.webhook_outbox(id,payload) VALUES(test_id,'{"type":"unknown"}');
    RAISE EXCEPTION 'Unsupported webhook event was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
