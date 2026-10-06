import type { APIRoute } from "astro";
import { handleSubmission } from "../../server/submission-handler";
import { saveSubmission } from "../../server/submissions";
import { serverEnv } from "../../server/database";
import { capturePartnershipSubmission } from "../../server/posthog";
import { syncPartnershipToSheet } from "../../server/google-sheets";
export const prerender = false;
export const ALL: APIRoute = ({ request }) =>
  handleSubmission(request, {
    save: saveSubmission,
    capture: capturePartnershipSubmission,
    syncSheet: syncPartnershipToSheet,
    bookingUrl: () => serverEnv("BOOKING_URL"),
  });
