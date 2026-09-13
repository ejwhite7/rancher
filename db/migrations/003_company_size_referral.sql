ALTER TABLE rancher.partnership_submissions
  ADD COLUMN IF NOT EXISTS referral_bonus_usd integer;
-- Preserve older submissions; their overlapping bands cannot be mapped reliably.
ALTER TABLE rancher.partnership_submissions
  DROP CONSTRAINT IF EXISTS partnership_submissions_team_size_check;
ALTER TABLE rancher.partnership_submissions
  ADD CONSTRAINT partnership_submissions_team_size_check CHECK (team_size IN (
    '20–100', '101–500', '501–1,000', '1,001+',
    '20–49', '50–199', '200–499', '500–999', '1,000–4,999', '5,000+'
  ));
ALTER TABLE rancher.partnership_submissions
  DROP CONSTRAINT IF EXISTS partnership_submissions_referral_bonus_check;
ALTER TABLE rancher.partnership_submissions
  ADD CONSTRAINT partnership_submissions_referral_bonus_check CHECK (
    referral_bonus_usd IS NULL OR
    (team_size = '20–49' AND referral_bonus_usd = 8000) OR
    (team_size = '50–199' AND referral_bonus_usd = 14000) OR
    (team_size = '200–499' AND referral_bonus_usd = 28000) OR
    (team_size = '500–999' AND referral_bonus_usd = 42000) OR
    (team_size = '1,000–4,999' AND referral_bonus_usd = 54000) OR
    (team_size = '5,000+' AND referral_bonus_usd = 75000)
  );
