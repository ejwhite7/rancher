import type { APIRoute } from "astro";
import { handleReferralSubmission } from "../../server/referral-handler";
import { saveReferralSubmission } from "../../server/referral-submissions";
import { captureReferralSubmission } from "../../server/posthog";
export const prerender = false;
export const ALL: APIRoute = ({ request }) =>
  handleReferralSubmission(request, {
    save: saveReferralSubmission,
    capture: captureReferralSubmission,
  });
