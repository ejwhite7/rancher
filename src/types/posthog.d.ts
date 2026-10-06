interface Window {
  dataLayer: Array<Record<string, unknown>>;
  posthog?: {
    identify: (
      distinctId: string,
      properties?: Record<string, unknown>,
    ) => void;
    capture: (event: string, properties?: Record<string, unknown>) => void;
  };
}
