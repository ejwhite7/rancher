const MATCHING_COOKIES = [
  "_fbp",
  "_fbc",
  "_gcl_aw",
  "_gcl_dc",
  "_gcl_gb",
  "_gcl_au",
  "_uetmsclkid",
  "_uetvid",
  "_uetsid",
  "li_fat_id",
  "_ttp",
  "ttclid",
] as const;

const CLICK_IDS = [
  "gclid",
  "gclsrc",
  "dclid",
  "wbraid",
  "gbraid",
  "gad_source",
  "fbclid",
  "msclkid",
  "li_fat_id",
  "ttclid",
  "twclid",
] as const;

function readCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(/;\s*/).flatMap((part) => {
      const index = part.indexOf("=");
      if (index < 1) return [];
      try {
        return [
          [part.slice(0, index), decodeURIComponent(part.slice(index + 1))],
        ];
      } catch {
        return [];
      }
    }),
  );
}

function readJson(value: string | undefined): Record<string, unknown> | null {
  try {
    return JSON.parse(value || "null");
  } catch {
    return null;
  }
}

function matchingProperties(
  keys: readonly string[],
  values: Record<string, unknown> | null,
): Record<string, string> {
  return Object.fromEntries(
    keys.flatMap((key) => {
      const value = values?.[key];
      return typeof value === "string" &&
        /^[^\u0000-\u001f\u007f]{1,500}$/.test(value)
        ? [[key, value]]
        : [];
    }),
  );
}

export function advertisingCookieProperties(cookieHeader: string) {
  const cookies = readCookies(cookieHeader);
  const consent = readJson(cookies.rancher_consent);
  if (consent?.advertising === false || consent?._gpc === true) return {};

  const selected = matchingProperties(MATCHING_COOKIES, cookies);
  const aliases = {
    $fbp: selected._fbp,
    $fbc: selected._fbc,
    fbp: selected._fbp,
    fbc: selected._fbc,
    fbclid: selected._fbc?.split(".").slice(3).join("."),
    gclid: selected._gcl_aw?.split(".").slice(2).join("."),
    dclid: selected._gcl_dc?.split(".").slice(2).join("."),
    msclkid: selected._uetmsclkid,
  };
  return {
    // Keep URL-derived IDs when this page no longer has the ad query string.
    ...matchingProperties(CLICK_IDS, readJson(cookies.attr_first)),
    ...matchingProperties(CLICK_IDS, readJson(cookies.attr_last)),
    ...selected,
    ...matchingProperties(Object.keys(aliases), aliases),
  };
}

export function advertisingRequestProperties(request?: Request) {
  return request?.headers.get("sec-gpc") === "1"
    ? {}
    : advertisingCookieProperties(request?.headers.get("cookie") || "");
}

export function enrichAdvertisingEvent<
  T extends { properties: Record<string, unknown> },
>(event: T | null, cookieHeader: string): T | null {
  if (!event) return event;
  const matching = advertisingCookieProperties(cookieHeader);
  if (!Object.keys(matching).length) return event;
  return {
    ...event,
    properties: {
      ...event.properties,
      ...matching,
      $set: {
        ...(event.properties.$set as Record<string, unknown>),
        ...matching,
      },
    },
  };
}
