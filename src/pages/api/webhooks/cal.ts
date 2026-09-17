import type { APIRoute } from "astro";
import {
  capturePostHogEvent,
  handleCalWebhook,
} from "../../../server/cal-webhook-handler";

export const prerender = false;

const webhookSecret = () => import.meta.env.CAL_WEBHOOK_SECRET;
const posthogToken = () => import.meta.env.PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = () => import.meta.env.PUBLIC_POSTHOG_HOST;

export const ALL: APIRoute = ({ request }) =>
  handleCalWebhook(request, {
    webhookSecret,
    posthogToken,
    posthogHost,
    capture: async (input) => {
      const token = posthogToken();
      const host = posthogHost();
      if (!token || !host) throw new Error("PostHog is not configured");
      await capturePostHogEvent(input, token, host);
    },
  });
