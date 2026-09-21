import type { Submission } from "../lib/submission";
// Internal referral amounts from the supplied company-size schedule, in USD.
// Kept server-side; never trust a referral amount supplied by the browser.
export const REFERRAL_BONUS_USD: Record<Submission["size"], number> = {
  "1–10": 0,
  "11–19": 0,
  "20–49": 8000,
  "50–199": 14000,
  "200–499": 28000,
  "500–999": 42000,
  "1,000–4,999": 54000,
  "5,000+": 75000,
};
