import type { APIRoute } from "astro";
import { handleContactSubmission } from "../../server/contact-handler";
import { saveContactSubmission } from "../../server/contact-submissions";
export const prerender = false;
export const ALL: APIRoute = ({ request }) =>
  handleContactSubmission(request, { save: saveContactSubmission });
