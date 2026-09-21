type EventProperties = Record<string, unknown>;

type UserData = {
  emailAddress: string;
  firstName?: string;
  lastName?: string;
};

type TrackOptions = {
  eventId?: string;
  userData?: UserData;
  personProperties?: {
    set?: EventProperties;
    setOnce?: EventProperties;
  };
};

export function trackEvent(
  event: string,
  properties: EventProperties = {},
  options: TrackOptions = {},
) {
  const set = options.personProperties?.set;
  const setOnce = options.personProperties?.setOnce;
  window.posthog?.capture(event, {
    ...properties,
    ...(options.eventId
      ? { $insert_id: options.eventId, event_id: options.eventId }
      : {}),
    ...(set && Object.keys(set).length ? { $set: set } : {}),
    ...(setOnce && Object.keys(setOnce).length ? { $set_once: setOnce } : {}),
  });

  pushDataLayer(event, properties, options);
}

// Forwards an event to the tag manager only. Use this for events that the
// server already captures to PostHog, so the browser does not store a second
// row for the same submission.
export function pushDataLayer(
  event: string,
  properties: EventProperties = {},
  options: TrackOptions = {},
) {
  const userData = options.userData
    ? {
        email_address: options.userData.emailAddress.trim().toLowerCase(),
        address: {
          ...(options.userData.firstName
            ? { first_name: options.userData.firstName.trim().toLowerCase() }
            : {}),
          ...(options.userData.lastName
            ? { last_name: options.userData.lastName.trim().toLowerCase() }
            : {}),
        },
      }
    : undefined;
  const value = properties.referral_bonus_usd;

  window.dataLayer ??= [];
  window.dataLayer.push({
    event,
    event_id: options.eventId ?? crypto.randomUUID(),
    ...properties,
    ...(userData
      ? {
          user_data: userData,
          eventModel: {
            user_data: userData,
            ...(typeof value === "number" ? { value, currency: "USD" } : {}),
          },
        }
      : {}),
  });
}
