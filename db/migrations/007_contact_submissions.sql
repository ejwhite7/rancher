CREATE TABLE IF NOT EXISTS rancher.contact_submissions (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 180),
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 5000),
  request_hash text NOT NULL CHECK (length(request_hash) = 64)
);
CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
  ON rancher.contact_submissions (created_at DESC);
ALTER TABLE rancher.contact_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rancher.contact_submissions FROM PUBLIC;

-- Match the existing server's restricted writer role. It can insert enquiries
-- and read only the columns needed to deduplicate a retry, not message content.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rancher_form_writer') THEN
    GRANT INSERT ON rancher.contact_submissions TO rancher_form_writer;
    GRANT SELECT (id, request_hash) ON rancher.contact_submissions TO rancher_form_writer;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'rancher' AND tablename = 'contact_submissions' AND policyname = 'contact_form_insert') THEN
      CREATE POLICY contact_form_insert ON rancher.contact_submissions FOR INSERT TO rancher_form_writer WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'rancher' AND tablename = 'contact_submissions' AND policyname = 'contact_form_retry') THEN
      CREATE POLICY contact_form_retry ON rancher.contact_submissions FOR SELECT TO rancher_form_writer USING (true);
    END IF;
  END IF;
END $$;
