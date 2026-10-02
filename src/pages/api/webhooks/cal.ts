import type { APIRoute } from "astro";
import {
  capturePostHogEvent,
  handleCalWebhook,
} from "../../../server/cal-webhook-handler";
import { notifySlackBooking } from "../../../server/slack-booking-notifier";

export const prerender = false;

const webhookSecret = () => import.meta.env.CAL_WEBHOOK_SECRET;
const posthogToken = () => import.meta.env.PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = () => import.meta.env.PUBLIC_POSTHOG_HOST;
const slackToken = () => import.meta.env.SLACK_FORM_SUBMISSIONS_BOT_TOKEN;
const slackChannel = () =>
  import.meta.env.SLACK_FORM_SUBMISSIONS_CHANNEL_ID || "C0C2HJ89ZUM";

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
    notifyBooking: async (booking) => {
      const token = slackToken();
      if (!token) throw new Error("Slack is not configured");
      await notifySlackBooking(booking, token, slackChannel());
    },
  });
