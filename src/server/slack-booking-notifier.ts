import { createHash } from "node:crypto";
import { serverLog } from "./logger";

const HISTORY_PAGE_SIZE = 100;
const MAX_HISTORY_PAGES = 5;

type JsonObject = Record<string, unknown>;
type SlackFetch = typeof fetch;

export type BookingNotification = {
  bookingUid: string;
  email: string;
  startTime: string;
  timeZone?: string;
  name?: string;
  eventTitle?: string;
  eventType?: string;
  endTime?: string;
  durationMinutes?: number;
  status?: string;
};

const object = (value: unknown): JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
const string = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

function slackDateTime(startTime: string, timeZone?: string) {
  const date = new Date(startTime);
  if (Number.isNaN(date.valueOf()))
    throw new Error("Invalid booking start time");
  const parts = new Intl.DateTimeFormat("en-US", {
    ...(timeZone ? { timeZone } : {}),
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("month")} ${value("day")}, ${value("year")} at ${value("hour")}:${value("minute")} ${value("dayPeriod")} ${value("timeZoneName")}`.trim();
}

async function slackApi(
  method: string,
  token: string,
  body: JsonObject,
  fetcher: SlackFetch,
) {
  const response = await fetcher(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
  const result = object(await response.json());
  if (!response.ok || result.ok !== true)
    throw new Error(`Slack ${method} failed: ${response.status}`);
  return result;
}

function hasExactEmailField(text: unknown, email: string) {
  if (typeof text !== "string") return false;
  return text.split("\n").some((line) => {
    const match = line.match(
      /^\s*\*?email:\*?\s*(?:<mailto:[^|>]+\|)?([^>\s]+)>?\s*$/i,
    );
    return match?.[1]?.toLowerCase() === email;
  });
}

async function findParentTimestamp(
  token: string,
  channel: string,
  email: string,
  fetcher: SlackFetch,
) {
  let cursor: string | undefined;
  for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
    const result = await slackApi(
      "conversations.history",
      token,
      {
        channel,
        limit: HISTORY_PAGE_SIZE,
        include_all_metadata: true,
        ...(cursor ? { cursor } : {}),
      },
      fetcher,
    );
    const messages = Array.isArray(result.messages) ? result.messages : [];
    const match = messages
      .map(object)
      .find(
        (message) =>
          !string(message.thread_ts) && hasExactEmailField(message.text, email),
      );
    if (match) return string(match.ts);
    cursor = string(object(result.response_metadata).next_cursor);
    if (!cursor) break;
  }
  return undefined;
}

function slackClientMessageId(bookingUid: string) {
  const hash = createHash("sha256")
    .update(bookingUid)
    .digest("hex")
    .slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
}

function standaloneBookingMessage(booking: BookingNotification) {
  const fields = [
    ["Name", booking.name],
    ["Email", booking.email.trim().toLowerCase()],
    ["Call", booking.eventTitle],
    ["Event type", booking.eventType],
    ["Date and time", slackDateTime(booking.startTime, booking.timeZone)],
    [
      "End time",
      booking.endTime
        ? slackDateTime(booking.endTime, booking.timeZone)
        : undefined,
    ],
    [
      "Duration",
      booking.durationMinutes === undefined
        ? undefined
        : `${booking.durationMinutes} minutes`,
    ],
    ["Time zone", booking.timeZone],
    ["Status", booking.status],
    ["Booking UID", booking.bookingUid],
  ].filter((field): field is [string, string] => Boolean(field[1]));
  return [
    "*New call booking*",
    ...fields.map(([label, value]) => `*${label}:* ${value}`),
  ].join("\n");
}

export async function notifySlackBooking(
  booking: BookingNotification,
  token: string,
  channel: string,
  fetcher: SlackFetch = fetch,
) {
  const email = booking.email.trim().toLowerCase();
  const threadTs = await findParentTimestamp(token, channel, email, fetcher);
  const text = threadTs
    ? `Meeting booked for ${slackDateTime(booking.startTime, booking.timeZone)}`
    : standaloneBookingMessage(booking);
  if (!threadTs) await serverLog("warn", "cal_slack_parent_not_found");
  await slackApi(
    "chat.postMessage",
    token,
    {
      channel,
      ...(threadTs ? { thread_ts: threadTs } : {}),
      text,
      client_msg_id: slackClientMessageId(booking.bookingUid),
    },
    fetcher,
  );
  return threadTs
    ? { status: "posted" as const, threadTs, text }
    : { status: "posted_standalone" as const, text };
}
