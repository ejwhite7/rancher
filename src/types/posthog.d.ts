interface Window {
  Attributor?: new (config: Record<string, unknown>) => {
    fillFormFields: (settings?: {
      scope?: ParentNode;
      targetMethod?: string | string[];
    }) => void;
    grab: (sessionMode?: "all" | "first" | "last") => unknown;
  };
  __attribution?: {
    fillFormFields: (settings?: {
      scope?: ParentNode;
      targetMethod?: string | string[];
    }) => void;
    grab: (sessionMode?: "all" | "first" | "last") => unknown;
  };
  dataLayer: Array<Record<string, unknown>>;
  posthog?: {
    identify: (
      distinctId: string,
      properties?: Record<string, unknown>,
    ) => void;
    capture: (event: string, properties?: Record<string, unknown>) => void;
    get_session_id?: () => string | undefined;
    opt_in_capturing?: () => void;
    opt_out_capturing?: (options?: { clear_persistence?: boolean }) => void;
  };
}
