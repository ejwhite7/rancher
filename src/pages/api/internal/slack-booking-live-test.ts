import { createHash, timingSafeEqual } from "node:crypto";
import type { APIRoute } from "astro";
import { notifySlackBooking } from "../../../server/slack-booking-notifier";

export const prerender = false;

const EXPECTED_TOKEN_HASH =
  "9be10454cffc50e7a4078b8420d06dcd2c503bd14e1cfcd31e6889c669a7dc2e";

export const POST: APIRoute = async ({ request }) => {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const received = token
    ? createHash("sha256").update(token).digest()
    : Buffer.alloc(32);
  const expected = Buffer.from(EXPECTED_TOKEN_HASH, "hex");
  if (!timingSafeEqual(received, expected))
    return new Response("Unauthorized", { status: 401 });

  const slackToken = import.meta.env.SLACK_FORM_SUBMISSIONS_BOT_TOKEN;
  const channel =
    import.meta.env.SLACK_FORM_SUBMISSIONS_CHANNEL_ID || "C0C2HJ89ZUM";
  if (!slackToken) return new Response("Slack unavailable", { status: 503 });

  const body = await request.json();
  const result = await notifySlackBooking(body, slackToken, channel);
  return Response.json(result);
};
