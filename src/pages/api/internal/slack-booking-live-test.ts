import { createHash, timingSafeEqual } from "node:crypto";
import type { APIRoute } from "astro";
import { notifySlackBooking } from "../../../server/slack-booking-notifier";

export const prerender = false;
const EXPECTED_TOKEN_HASH =
  "715d43b97a901ae36852146a4bc36b474a9c1738fa0027cb40b255d08624d27d";

export const POST: APIRoute = async ({ request }) => {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const received = token
    ? createHash("sha256").update(token).digest()
    : Buffer.alloc(32);
  if (!timingSafeEqual(received, Buffer.from(EXPECTED_TOKEN_HASH, "hex")))
    return new Response("Unauthorized", { status: 401 });
  const slackToken = import.meta.env.SLACK_FORM_SUBMISSIONS_BOT_TOKEN;
  const channel =
    import.meta.env.SLACK_FORM_SUBMISSIONS_CHANNEL_ID || "C0C2HJ89ZUM";
  if (!slackToken) return new Response("Slack unavailable", { status: 503 });
  return Response.json(
    await notifySlackBooking(await request.json(), slackToken, channel),
  );
};
