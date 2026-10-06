import { test, expect } from "@playwright/test";
import { trackEvent } from "../src/lib/analytics";

test("analytics preserves capture envelopes, dataLayer precedence and normalized user data", () => {
  const captures: unknown[][] = [];
  const previous = globalThis.window;
  const browser = {
    posthog: { capture: (...args: unknown[]) => captures.push(args) },
    dataLayer: undefined as Record<string, unknown>[] | undefined,
  };
  Object.assign(globalThis, { window: browser });
  try {
    trackEvent(
      "lead",
      { referral_bonus_usd: 0, event_id: "property-id" },
      {
        eventId: "option-id",
        userData: {
          emailAddress: " A@EXAMPLE.COM ",
          firstName: " Alex ",
          lastName: "",
        },
        personProperties: { set: { company: "Acme" }, setOnce: {} },
      },
    );
    expect(captures).toEqual([
      [
        "lead",
        {
          referral_bonus_usd: 0,
          event_id: "option-id",
          $insert_id: "option-id",
          $set: { company: "Acme" },
        },
      ],
    ]);
    const userData = {
      email_address: "a@example.com",
      address: { first_name: "alex" },
    };
    expect(browser.dataLayer).toEqual([
      {
        event: "lead",
        event_id: "property-id",
        referral_bonus_usd: 0,
        user_data: userData,
        eventModel: { user_data: userData, value: 0, currency: "USD" },
      },
    ]);
    trackEvent(
      "disabled",
      {},
      { capturePostHog: false, eventId: "disabled-id" },
    );
    expect(captures).toHaveLength(1);
    expect(browser.dataLayer?.[1]).toEqual({
      event: "disabled",
      event_id: "disabled-id",
    });
    browser.posthog.capture = () => {
      throw Error("capture unavailable");
    };
    expect(() => trackEvent("failure")).toThrow("capture unavailable");
    expect(browser.dataLayer).toHaveLength(2);
  } finally {
    Object.assign(globalThis, { window: previous });
  }
});
