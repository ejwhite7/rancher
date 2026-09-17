import type { APIRoute } from "astro";
import { handleContactSubmission } from "../../server/contact-handler";
import { saveContactSubmission } from "../../server/contact-submissions";
import { captureContactSubmission } from "../../server/posthog";
export const prerender = false;
export const ALL: APIRoute = ({ request }) =>
  handleContactSubmission(request, {
    save: saveContactSubmission,
    capture: captureContactSubmission,
  });
