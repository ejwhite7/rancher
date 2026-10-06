type EventProperties = Record<string, unknown>;

type UserData = {
  emailAddress: string;
  firstName?: string;
  lastName?: string;
};

type TrackOptions = {
  eventId?: string;
  userData?: UserData;
};

export function trackEvent(
  event: string,
  properties: EventProperties = {},
  options: TrackOptions = {},
) {
  window.posthog?.capture(event, properties);

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
