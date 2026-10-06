import { expect, test } from "@playwright/test";
import { attributionEventProperties } from "../src/lib/attribution";
import { captureFormEvent } from "../src/server/posthog";

test("server partnership attribution exposes standard and explicit UTM properties", () => {
  expect(
    attributionEventProperties({
      first: {
        source: "google",
        medium: "cpc",
        campaign: "partner-search",
        term: "business data",
        gclid: "first-google-click",
      },
      last: {
        source: "linkedin",
        medium: "paid-social",
        campaign: "retargeting",
        content: "control-your-data",
        gclid: "conversion-google-click",
        fbclid: "conversion-meta-click",
      },
    }),
  ).toEqual({
    first_utm_source: "google",
    conversion_utm_source: "linkedin",
    utm_source: "linkedin",
    first_utm_medium: "cpc",
    conversion_utm_medium: "paid-social",
    utm_medium: "paid-social",
    first_utm_campaign: "partner-search",
    conversion_utm_campaign: "retargeting",
    utm_campaign: "retargeting",
    first_utm_term: "business data",
    conversion_utm_content: "control-your-data",
    utm_content: "control-your-data",
    first_gclid: "first-google-click",
    conversion_gclid: "conversion-google-click",
    gclid: "conversion-google-click",
    conversion_fbclid: "conversion-meta-click",
    fbclid: "conversion-meta-click",
  });

  expect(
    attributionEventProperties(
      {
        first: { source: "(direct)", medium: "(none)" },
        last: { source: "(direct)", medium: "(none)" },
      },
      new Request("https://www.gorancher.com/api/submissions/", {
        headers: {
          cookie:
            "_gcl_aw=GCL.123456.cookie-google-click; _fbc=fb.1.123456.cookie-meta-click; _uetmsclkid=cookie-bing-click",
        },
      }),
    ),
  ).toEqual({
    first_utm_source: "(direct)",
    conversion_utm_source: "(direct)",
    utm_source: "(direct)",
    first_utm_medium: "(none)",
    conversion_utm_medium: "(none)",
    utm_medium: "(none)",
    conversion_gclid: "cookie-google-click",
    gclid: "cookie-google-click",
    conversion_fbclid: "cookie-meta-click",
    fbclid: "cookie-meta-click",
    conversion_msclkid: "cookie-bing-click",
    msclkid: "cookie-bing-click",
  });

  expect(
    attributionEventProperties(
      { first: {}, last: {} },
      new Request("https://www.gorancher.com/api/submissions/", {
        headers: {
          cookie:
            '_gcl_aw=GCL.123456.blocked-click; rancher_consent={"advertising":false}',
        },
      }),
    ),
  ).toEqual({});
});

test("malformed optional consent cookies preserve linker fallback and explicit click-ID precedence", () => {
  for (const consent of ["{", "%E0%A4%A", "null", "", "[]"]) {
    const request = new Request("https://www.gorancher.com/api/submissions/", {
      headers: {
        cookie: `_gcl_aw=GCL.123.cookie-click; _fbc=fb.1.123.meta-click; rancher_consent=${consent}`,
      },
    });
    expect(
      attributionEventProperties(
        { first: { gclid: "first-click" }, last: { gclid: "explicit-click" } },
        request,
      ),
    ).toEqual({
      first_gclid: "first-click",
      conversion_gclid: "explicit-click",
      gclid: "explicit-click",
      conversion_fbclid: "meta-click",
      fbclid: "meta-click",
    });
    expect(
      attributionEventProperties({ first: {}, last: {} }, request),
    ).toEqual({
      conversion_gclid: "cookie-click",
      gclid: "cookie-click",
      conversion_fbclid: "meta-click",
      fbclid: "meta-click",
    });
  }
});

test("server form capture uses the submission id for PostHog deduplication", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.PUBLIC_POSTHOG_PROJECT_TOKEN;
  const originalHost = process.env.PUBLIC_POSTHOG_HOST;
  let request: { url: string; body: Record<string, any> } | undefined;
  process.env.PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
  process.env.PUBLIC_POSTHOG_HOST = "https://posthog.test";
  globalThis.fetch = async (input, init) => {
    request = {
      url: String(input),
      body: JSON.parse(String(init?.body)),
    };
    return new Response(null, { status: 200 });
  };
  try {
    await captureFormEvent({
      event: "contact_form_submitted",
      distinctId: "person@example.com",
      submissionId: "11111111-2222-4333-8444-555555555555",
      properties: { submission_id: "11111111-2222-4333-8444-555555555555" },
      set: { email: "person@example.com" },
      setOnce: {},
      request: new Request("https://www.gorancher.com/api/contact/", {
        headers: {
          referer: "https://www.gorancher.com/contact/",
          "user-agent": "test-agent",
          "x-forwarded-for": "203.0.113.1, 10.0.0.1",
          "x-posthog-session-id": "018f47a2-9b3c-7def-8123-456789abcdef",
        },
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined)
      delete process.env.PUBLIC_POSTHOG_PROJECT_TOKEN;
    else process.env.PUBLIC_POSTHOG_PROJECT_TOKEN = originalToken;
    if (originalHost === undefined) delete process.env.PUBLIC_POSTHOG_HOST;
    else process.env.PUBLIC_POSTHOG_HOST = originalHost;
  }
  expect(request?.body.properties).not.toHaveProperty("$set_once");
  expect(request?.url).toBe("https://posthog.test/i/v0/e/");
  expect(request?.body).toMatchObject({
    api_key: "phc_test",
    event: "contact_form_submitted",
    distinct_id: "person@example.com",
    properties: {
      $set: { email: "person@example.com" },
      $lib: "rancher-server",
      $lib_version: "1",
      capture_source: "server",
      $session_id: "018f47a2-9b3c-7def-8123-456789abcdef",
      $insert_id: "11111111-2222-4333-8444-555555555555",
      event_id: "11111111-2222-4333-8444-555555555555",
      $current_url: "https://www.gorancher.com/contact/",
      $raw_user_agent: "test-agent",
      $ip: "203.0.113.1",
    },
  });
});
