import type { APIRoute } from "astro";
import { handleSubmission } from "../../server/submission-handler";
import { saveSubmission } from "../../server/submissions";
import { serverEnv } from "../../server/database";
export const prerender = false;
export const ALL: APIRoute = ({ request }) =>
  handleSubmission(request, {
    save: saveSubmission,
    bookingUrl: () => serverEnv("BOOKING_URL"),
  });
