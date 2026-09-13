import type { APIRoute } from "astro";
import { serverEnv } from "../../../server/database";
import { drainWebhookOutbox } from "../../../server/webhook-outbox";
import { handleWebhookDelivery } from "../../../server/webhook-handler";
export const prerender = false;
export const ALL: APIRoute = ({ request }) =>
  handleWebhookDelivery(request, {
    secret: serverEnv("CRON_SECRET"),
    destination: serverEnv("HOOKDECK_SOURCE_URL"),
    drain: drainWebhookOutbox,
  });
