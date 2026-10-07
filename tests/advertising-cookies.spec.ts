import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  advertisingCookieProperties,
  enrichAdvertisingEvent,
} from "../src/lib/advertising-cookies";

const cookies = {
  _fbp: "fb.1.1791408000000.12345",
  _fbc: "fb.1.1791408000000.synthetic-meta-click",
  _gcl_aw: "GCL.1791408000.synthetic-google-click",
  _gcl_au: "1.1.12345.1791408000",
  _gcl_gb: "synthetic-google-braid-cookie",
  _uetmsclkid: "synthetic-microsoft-click",
  li_fat_id: "synthetic-linkedin-click",
  _ttp: "synthetic-tiktok-browser",
};
const cookieHeader = Object.entries(cookies)
  .map(([key, value]) => `${key}=${value}`)
  .join("; ");
const expected = {
  ...cookies,
  $fbp: cookies._fbp,
  $fbc: cookies._fbc,
  fbp: cookies._fbp,
  fbc: cookies._fbc,
  fbclid: "synthetic-meta-click",
  gclid: "synthetic-google-click",
  msclkid: "synthetic-microsoft-click",
};

test("matching cookie values survive intact on events and person updates", () => {
  expect(advertisingCookieProperties(cookieHeader)).toEqual(expected);
  const event = {
    event: "$pageview",
    properties: { token: "phc_test", $set: { company: "Synthetic" } },
  };
  expect(enrichAdvertisingEvent(event, cookieHeader)).toEqual({
    ...event,
    properties: {
      ...event.properties,
      ...expected,
      $set: { company: "Synthetic", ...expected },
    },
  });
  expect(event.properties.$set).toEqual({ company: "Synthetic" });
  expect(enrichAdvertisingEvent(null, cookieHeader)).toBeNull();
  expect(enrichAdvertisingEvent(event, "")).toBe(event);
});

test("allowlists cookies, honors opt-out/GPC, and recovers URL IDs from attribution cookies", () => {
  for (const consent of [{ advertising: false }, { _gpc: true }]) {
    expect(
      advertisingCookieProperties(
        `${cookieHeader}; rancher_consent=${encodeURIComponent(JSON.stringify(consent))}`,
      ),
    ).toEqual({});
  }
  const first = encodeURIComponent(
    JSON.stringify({ gclid: "first", wbraid: "web-braid" }),
  );
  const last = encodeURIComponent(
    JSON.stringify({ gclid: "last", gbraid: "app-braid" }),
  );
  expect(
    advertisingCookieProperties(
      `attr_first=${first}; attr_last=${last}; secret_session=private; _fbp=%E0%A4%A; _ttp=${"x".repeat(501)}`,
    ),
  ).toEqual({ gclid: "last", wbraid: "web-braid", gbraid: "app-braid" });
});

async function openTrackedPage(page: Page, baseURL: string) {
  const sdk = await readFile(
    "node_modules/posthog-js/dist/array.full.no-external.js",
    "utf8",
  );
  const captures: Array<{ event: string; properties: Record<string, any> }> =
    [];
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.route("**/ingest/**", async (route) => {
    if (route.request().url().endsWith("/static/array.js")) {
      await route.fulfill({
        contentType: "application/javascript",
        body: `Object.assign(window.posthog._i[0][1], {disable_compression: true, request_batching: false, disable_session_recording: true, advanced_disable_flags: true, opt_in_site_apps: false, opt_out_useragent_filter: true});\n${sdk}`,
      });
      return;
    }
    const body = route.request().postData();
    if (body) {
      const payload = JSON.parse(body);
      captures.push(
        ...(Array.isArray(payload) ? payload : payload.batch || [payload]),
      );
    }
    await route.fulfill({ json: { status: "Ok", featureFlags: {} } });
  });
  await page.context().addCookies(
    Object.entries(cookies).map(([name, value]) => ({
      name,
      value,
      url: baseURL,
    })),
  );
  await page.goto("/");
  await expect
    .poll(
      () =>
        captures.find((event) => event.event === "$pageview")?.properties.$fbp,
    )
    .toBe(cookies._fbp);
  return { captures, browserErrors };
}

test("real browser SDK sends matching cookies on initial and late-cookie events with person updates", async ({
  page,
  context,
  baseURL,
}) => {
  const { captures, browserErrors } = await openTrackedPage(page, baseURL!);
  const pageview = captures.find((event) => event.event === "$pageview")!;
  expect(pageview.properties).toMatchObject({
    ...expected,
    $set: expected,
    $process_person_profile: true,
  });

  const updated = "fb.1.1791408000000.67890";
  await context.addCookies([{ name: "_fbp", value: updated, url: baseURL! }]);
  await page.evaluate(() =>
    window.posthog?.capture("cookie_matching_probe", { form: "test" }),
  );
  await expect
    .poll(
      () =>
        captures.find((event) => event.event === "cookie_matching_probe")
          ?.properties.$fbp,
    )
    .toBe(updated);
  expect(
    captures.find((event) => event.event === "cookie_matching_probe")
      ?.properties.$set.$fbp,
  ).toBe(updated);
  expect(browserErrors).toEqual([]);
});

test("real browser SDK stops matching-cookie enrichment after advertising opt-out", async ({
  page,
  baseURL,
}) => {
  const { captures, browserErrors } = await openTrackedPage(page, baseURL!);
  await page.getByRole("button", { name: "Manage choices" }).click();
  const modal = page.locator('[data-consent-tpl="modal"]');
  await modal.getByLabel("Advertising measurement and targeting").uncheck();
  await modal.getByRole("button", { name: "Save choices" }).click();
  await page.waitForLoadState("domcontentloaded");
  await expect
    .poll(() =>
      page.evaluate(() => !!window.posthog && !Array.isArray(window.posthog)),
    )
    .toBe(true);
  await page.evaluate(() => window.posthog?.capture("cookie_opt_out_probe"));
  await expect
    .poll(() =>
      captures.some((event) => event.event === "cookie_opt_out_probe"),
    )
    .toBe(true);
  const denied = captures.find(
    (event) => event.event === "cookie_opt_out_probe",
  )!;
  for (const key of Object.keys(expected)) {
    expect(denied.properties).not.toHaveProperty(key);
    expect(denied.properties.$set || {}).not.toHaveProperty(key);
  }
  expect(browserErrors).toEqual([]);
});
