import { createHash, timingSafeEqual } from "node:crypto";
import type { APIRoute } from "astro";
import { notifySlackBooking } from "../../../server/slack-booking-notifier";

export const prerender = false;

const EXPECTED_TOKEN_HASH =
  "7789fb1dca6c06b4829e0779202903cb3d6f312b894b0abf71179012fec48070";

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
