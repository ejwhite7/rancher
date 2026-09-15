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
