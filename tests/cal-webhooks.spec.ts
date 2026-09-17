import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { handleCalWebhook } from "../src/server/cal-webhook-handler";

const secret = "test-cal-webhook-secret";
const payload = {
  triggerEvent: "BOOKING_CREATED",
  createdAt: "2026-09-17T12:00:00.000Z",
  payload: {
    uid: "booking-uid",
    bookingId: 42,
    eventTypeId: 7,
    type: "discovery",
    eventTitle: "Discovery",
    startTime: "2026-09-18T12:00:00.000Z",
    endTime: "2026-09-18T12:30:00.000Z",
    length: 30,
    status: "ACCEPTED",
    attendees: [
      {
        name: "Alex Morgan",
        email: "ALEX@EXAMPLE.COM",
        timeZone: "America/New_York",
      },
    ],
  },
};

const request = (value: unknown, signature = true) => {
  const body = JSON.stringify(value);
  return new Request("https://www.gorancher.com/api/webhooks/cal/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cal-webhook-version": "2021-10-20",
      "x-cal-signature-256": signature
        ? createHmac("sha256", secret).update(body).digest("hex")
        : "0".repeat(64),
    },
    body,
  });
};

const dependencies = (capture: (input: any) => Promise<void>) => ({
  webhookSecret: () => secret,
  posthogToken: () => "phc_test",
  posthogHost: () => "https://us.i.posthog.com",
  capture,
});

test("verifies Cal signature and maps a booking to an identified PostHog event", async () => {
  let captured: any;
  const response = await handleCalWebhook(
    request(payload),
    dependencies(async (input) => {
      captured = input;
    }),
  );

  expect(response.status).toBe(200);
  expect(captured).toEqual({
    event: "cal_booking_created",
    distinctId: "alex@example.com",
    timestamp: "2026-09-17T12:00:00.000Z",
    properties: expect.objectContaining({
      source: "cal.com",
      trigger_event: "BOOKING_CREATED",
      booking_uid: "booking-uid",
      booking_id: 42,
      event_type_id: 7,
      attendee_email: "alex@example.com",
      attendee_name: "Alex Morgan",
      duration_minutes: 30,
      cal_webhook_version: "2021-10-20",
      $insert_id: "BOOKING_CREATED:booking-uid:2026-09-17T12:00:00.000Z",
      $set: { email: "alex@example.com", name: "Alex Morgan" },
    }),
  });
});

test("rejects invalid signatures before capture", async () => {
  let captures = 0;
  const response = await handleCalWebhook(
    request(payload, false),
    dependencies(async () => {
      captures++;
    }),
  );
  expect(response.status).toBe(401);
  expect(captures).toBe(0);
});

test("ignores unsubscribed Cal event types", async () => {
  let captures = 0;
  const response = await handleCalWebhook(
    request({ triggerEvent: "RECORDING_READY", payload: {} }),
    dependencies(async () => {
      captures++;
    }),
  );
  expect(response.status).toBe(204);
  expect(captures).toBe(0);
});

test("returns a retryable error when PostHog rejects delivery", async () => {
  const response = await handleCalWebhook(
    request(payload),
    dependencies(async () => {
      throw new Error("capture failed");
    }),
  );
  expect(response.status).toBe(502);
});
