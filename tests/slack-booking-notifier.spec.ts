import { expect, test } from "@playwright/test";
import { notifySlackBooking } from "../src/server/slack-booking-notifier";

const booking = {
  bookingUid: "booking-uid",
  email: "Alex@Example.com",
  startTime: "2026-09-18T12:00:00.000Z",
  timeZone: "America/New_York",
};

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("finds the newest exact email field and posts the booking in its thread", async () => {
  const calls: Array<{ method: string; body: any }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const method = String(input).split("/").pop()!;
    const body = JSON.parse(String(init?.body));
    calls.push({ method, body });
    if (method === "conversations.history")
      return json({
        ok: true,
        messages: [
          { ts: "200.000", text: "*Email:* somebody@example.com" },
          {
            ts: "199.000",
            text: "*New contact submission*\n*Email:* ALEX@EXAMPLE.COM",
          },
        ],
        response_metadata: { next_cursor: "" },
      });
    return json({ ok: true, ts: "201.000" });
  };

  const result = await notifySlackBooking(
    booking,
    "xoxb-test",
    "C0C2HJ89ZUM",
    fetcher,
  );

  expect(result).toEqual({
    status: "posted",
    threadTs: "199.000",
    text: "Meeting booked for Sep 18, 2026 at 8:00 AM EDT",
  });
  expect(calls.at(-1)).toEqual({
    method: "chat.postMessage",
    body: {
      channel: "C0C2HJ89ZUM",
      thread_ts: "199.000",
      text: "Meeting booked for Sep 18, 2026 at 8:00 AM EDT",
      client_msg_id: "6638b6c9-e1a1-5a3f-a178-db5a50420bbb",
    },
  });
});

test("paginates channel history until it finds the matching parent", async () => {
  let historyCalls = 0;
  const fetcher: typeof fetch = async (input) => {
    const method = String(input).split("/").pop()!;
    if (method === "conversations.history") {
      historyCalls++;
      return json(
        historyCalls === 1
          ? {
              ok: true,
              messages: [{ ts: "2", text: "*Email:* other@example.com" }],
              response_metadata: { next_cursor: "next" },
            }
          : {
              ok: true,
              messages: [{ ts: "1", text: "email: alex@example.com" }],
              response_metadata: { next_cursor: "" },
            },
      );
    }
    return json({ ok: true });
  };

  const result = await notifySlackBooking(
    booking,
    "xoxb-test",
    "C0C2HJ89ZUM",
    fetcher,
  );
  expect(historyCalls).toBe(2);
  expect(result.status).toBe("posted");
});

test("uses a stable Slack client message id for webhook retries", async () => {
  const messageIds: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const method = String(input).split("/").pop()!;
    if (method === "conversations.history")
      return json({
        ok: true,
        messages: [{ ts: "1", text: "*Email:* alex@example.com" }],
      });
    messageIds.push(JSON.parse(String(init?.body)).client_msg_id);
    return json({ ok: true });
  };

  await notifySlackBooking(booking, "xoxb-test", "C0C2HJ89ZUM", fetcher);
  await notifySlackBooking(booking, "xoxb-test", "C0C2HJ89ZUM", fetcher);
  expect(messageIds).toEqual([
    "6638b6c9-e1a1-5a3f-a178-db5a50420bbb",
    "6638b6c9-e1a1-5a3f-a178-db5a50420bbb",
  ]);
});

test("returns not_found without posting when no email field matches", async () => {
  let posted = false;
  const fetcher: typeof fetch = async (input) => {
    const method = String(input).split("/").pop()!;
    if (method === "chat.postMessage") posted = true;
    return json({
      ok: true,
      messages: [{ ts: "1", text: "*Email:* alex@example.co" }],
      response_metadata: { next_cursor: "" },
    });
  };
  const result = await notifySlackBooking(
    booking,
    "xoxb-test",
    "C0C2HJ89ZUM",
    fetcher,
  );
  expect(result.status).toBe("not_found");
  expect(posted).toBe(false);
});

test("throws a privacy-safe error when Slack rejects a request", async () => {
  await expect(
    notifySlackBooking(booking, "xoxb-test", "C0C2HJ89ZUM", async () =>
      json({ ok: false, error: "invalid_auth" }),
    ),
  ).rejects.toThrow("Slack conversations.history failed: 200");
});
