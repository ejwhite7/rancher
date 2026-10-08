import type { APIRoute } from "astro";
import { serverEnv } from "../../../server/database";
import { handleMetaSheet } from "../../../server/meta-sheet-handler";

export const prerender = false;
export const ALL: APIRoute = ({ request }) =>
  handleMetaSheet(request, serverEnv("GOOGLE_SHEETS_WEBHOOK_SECRET"));
