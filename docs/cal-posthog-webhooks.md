# Cal.com events in PostHog

Cal.com sends signed booking lifecycle webhooks to:

```text
https://www.gorancher.com/api/webhooks/cal/
```

The endpoint verifies `x-cal-signature-256` against the server-only `CAL_WEBHOOK_SECRET`, extracts a minimal analytics payload, and sends it to the configured PostHog project through the `/i/v0/e/` capture API. Failed PostHog or Slack deliveries return HTTP 502 so Cal.com can retry. Stable `$insert_id` values deduplicate PostHog capture retries.

## Cal.com subscription

Create the subscription at **Settings → Developer → Webhooks** with the production endpoint above, a strong secret matching `CAL_WEBHOOK_SECRET`, the default payload (no custom template), and these triggers:

- Booking Created
- Booking Requested
- Booking Rejected
- Booking Rescheduled
- Booking Cancelled
- Meeting Started
- Meeting Ended
- Booking No-show Updated

The endpoint records these PostHog events respectively:

- `cal_booking_created`
- `cal_booking_requested`
- `cal_booking_rejected`
- `cal_booking_rescheduled`
- `cal_booking_cancelled`
- `cal_meeting_started`
- `cal_meeting_ended`
- `cal_booking_no_show_updated`

The attendee's normalized email is the PostHog `distinct_id`, linking booking events to the person identified after a Rancher inquiry. Properties include booking/event identifiers, title/type, times, duration, status, attendee name/email/time zone, cancellation or rejection reason, reschedule UID, no-show state, and webhook version. Meeting links, notes, phone numbers, additional guests, and calendar invite contents are not forwarded.

Booking-created, rescheduled, meeting-started, and meeting-ended events set the person's `cal_booking_booked` property to `true`. Booking-cancelled and booking-rejected events set it to `false`. PostHog's **Partnership request follow-up** workflow reads this property after its five-minute delay so one Liquid email can either confirm the scheduled call or show the booking link.

## Slack booking replies

After capturing `BOOKING_CREATED`, the endpoint searches the newest 2,000 top-level messages in `#form-submissions` (`C0C2HJ89ZUM`) for an exact, case-insensitive `Email:` field matching the normalized attendee email. It posts `Meeting booked for [date and time]` as a reply to the newest match, formatting the start time in the attendee's Cal.com time zone.

Configure server-only `SLACK_FORM_SUBMISSIONS_BOT_TOKEN` and, if the channel changes, `SLACK_FORM_SUBMISSIONS_CHANNEL_ID`. The dedicated bot needs `chat:write` and `channels:history`, and it must be a member of the channel. For a private channel, use `groups:history` instead of `channels:history`.

Each reply uses a deterministic Slack `client_msg_id` derived from the Cal.com booking UID, allowing Slack to deduplicate retried message submissions without requiring user-token-only thread-history access. A missing form message is logged without an email address and treated as a no-op; Slack API failures are logged without payload data and return HTTP 502.

## Verification

1. Use Cal.com's webhook test action or create a test booking.
2. Confirm the Cal.com delivery receives HTTP 200.
3. In PostHog Live Events, filter for `cal_booking_created` and the test attendee email.
4. Reschedule and cancel the test booking, then confirm the corresponding events and stable `booking_uid`.
5. Invalid or unsigned requests should receive HTTP 401.
6. Unit tests mock all Slack requests and cover exact matching, pagination, missing matches, retries, and Slack errors. Do not perform a live Slack test without explicit approval.
