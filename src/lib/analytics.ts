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
  capturePostHog?: boolean;
};

function postHogProperties(
  properties: EventProperties,
  eventId: TrackOptions["eventId"],
  set: EventProperties | undefined,
  setOnce: EventProperties | undefined,
) {
  return {
    ...properties,
    ...(eventId ? { $insert_id: eventId, event_id: eventId } : {}),
    ...(set && Object.keys(set).length ? { $set: set } : {}),
    ...(setOnce && Object.keys(setOnce).length ? { $set_once: setOnce } : {}),
  };
}

function normalizedUserData(userData: UserData) {
  return {
    email_address: userData.emailAddress.trim().toLowerCase(),
    address: {
      ...(userData.firstName
        ? { first_name: userData.firstName.trim().toLowerCase() }
        : {}),
      ...(userData.lastName
        ? { last_name: userData.lastName.trim().toLowerCase() }
        : {}),
    },
  };
}

export function trackEvent(
  event: string,
  properties: EventProperties = {},
  options: TrackOptions = {},
) {
  const set = options.personProperties?.set;
  const setOnce = options.personProperties?.setOnce;
  if (options.capturePostHog !== false)
    window.posthog?.capture(
      event,
      postHogProperties(properties, options.eventId, set, setOnce),
    );
  const userData = options.userData
    ? normalizedUserData(options.userData)
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
