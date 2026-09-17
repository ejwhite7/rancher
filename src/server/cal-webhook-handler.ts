import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 128_000;
const EVENT_NAMES = {
  BOOKING_CREATED: "cal_booking_created",
  BOOKING_REQUESTED: "cal_booking_requested",
  BOOKING_REJECTED: "cal_booking_rejected",
  BOOKING_RESCHEDULED: "cal_booking_rescheduled",
  BOOKING_CANCELLED: "cal_booking_cancelled",
  MEETING_STARTED: "cal_meeting_started",
  MEETING_ENDED: "cal_meeting_ended",
  BOOKING_NO_SHOW_UPDATED: "cal_booking_no_show_updated",
} as const;

type TriggerEvent = keyof typeof EVENT_NAMES;
type JsonObject = Record<string, unknown>;

type Dependencies = {
  webhookSecret: () => string | undefined;
  posthogToken: () => string | undefined;
  posthogHost: () => string | undefined;
  capture: (input: {
    event: string;
    distinctId: string;
    timestamp?: string;
    properties: JsonObject;
  }) => Promise<void>;
};

const object = (value: unknown): JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
const string = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function signatureMatches(
  body: string,
  received: string | null,
  secret: string,
) {
  if (!received) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const normalized = received.startsWith("sha256=")
    ? received.slice("sha256=".length)
    : received;
  if (!/^[a-f\d]{64}$/i.test(normalized)) return false;
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(normalized, "hex"),
  );
}

function eventDetails(envelope: JsonObject, trigger: TriggerEvent) {
  const payload = object(envelope.payload);
  const booking =
    trigger === "MEETING_STARTED" || trigger === "MEETING_ENDED"
      ? envelope
      : payload;
  const attendees = Array.isArray(booking.attendees)
    ? booking.attendees.map(object)
    : [];
  const attendee = attendees[0] ?? {};
  const email = string(attendee.email)?.toLowerCase();
  const bookingUid = string(booking.uid) ?? string(booking.bookingUid);
  const bookingId = number(booking.bookingId) ?? number(booking.id);
  const createdAt = string(envelope.createdAt) ?? string(booking.createdAt);
  const name = string(attendee.name);

  const properties: JsonObject = {
    source: "cal.com",
    trigger_event: trigger,
    booking_uid: bookingUid,
    booking_id: bookingId,
    event_type_id: number(booking.eventTypeId),
    event_type: string(booking.type),
    event_title: string(booking.eventTitle) ?? string(booking.title),
    start_time: string(booking.startTime),
    end_time: string(booking.endTime),
    duration_minutes: number(booking.length),
    booking_status: string(booking.status),
    attendee_email: email,
    attendee_name: name,
    attendee_time_zone: string(attendee.timeZone),
    no_show: typeof attendee.noShow === "boolean" ? attendee.noShow : undefined,
    cancellation_reason: string(booking.cancellationReason),
    rejection_reason: string(booking.rejectionReason),
    reschedule_uid: string(booking.rescheduleUid),
    cal_webhook_version: undefined,
    $insert_id: [trigger, bookingUid ?? bookingId, createdAt]
      .filter(Boolean)
      .join(":"),
    ...(email ? { $set: { email, ...(name ? { name } : {}) } } : {}),
  };
  return {
    distinctId:
      email ??
      (bookingUid
        ? `cal:${bookingUid}`
        : `cal-booking:${bookingId ?? "unknown"}`),
    timestamp: createdAt,
    properties,
  };
}

export async function capturePostHogEvent(
  input: Parameters<Dependencies["capture"]>[0],
  token: string,
  host: string,
) {
  const response = await fetch(`${host.replace(/\/$/, "")}/i/v0/e/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: token,
      event: input.event,
      distinct_id: input.distinctId,
      timestamp: input.timestamp,
      properties: input.properties,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok)
    throw new Error(`PostHog capture returned ${response.status}`);
}

export async function handleCalWebhook(
  request: Request,
  dependencies: Dependencies,
) {
  if (request.method !== "POST")
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return new Response("Unsupported media type", { status: 415 });

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES)
    return new Response("Payload too large", { status: 413 });

  const secret = dependencies.webhookSecret();
  const token = dependencies.posthogToken();
  const host = dependencies.posthogHost();
  if (!secret || !token || !host) {
    console.error("cal_webhook_configuration_missing");
    return new Response("Webhook unavailable", { status: 503 });
  }

  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES)
    return new Response("Payload too large", { status: 413 });
  if (
    !signatureMatches(body, request.headers.get("x-cal-signature-256"), secret)
  )
    return new Response("Invalid signature", { status: 401 });

  let envelope: JsonObject;
  try {
    envelope = object(JSON.parse(body));
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const trigger = string(envelope.triggerEvent);
  if (!trigger || !(trigger in EVENT_NAMES))
    return new Response(null, { status: 204 });

  const details = eventDetails(envelope, trigger as TriggerEvent);
  details.properties.cal_webhook_version =
    request.headers.get("x-cal-webhook-version") ?? undefined;
  try {
    await dependencies.capture({
      event: EVENT_NAMES[trigger as TriggerEvent],
      ...details,
    });
  } catch {
    console.error("cal_posthog_capture_failed");
    return new Response("Event delivery failed", { status: 502 });
  }
  return Response.json({ received: true });
}
