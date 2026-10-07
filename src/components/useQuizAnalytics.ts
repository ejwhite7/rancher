import { useEffect, useRef } from "react";
import { createQuizSessionId } from "../lib/quiz";
import { createQuizTracker, type QuizTracker } from "../lib/quiz-analytics";

type AnalyticsSession = {
  token?: string;
  host?: string;
  id: string;
  closed: boolean;
  pending: boolean;
  permitted: boolean;
  tracker: QuizTracker | null;
  position: () => Record<string, unknown>;
  create: typeof createQuizTracker;
};
function savedAnalyticsConsent() {
  const cookie = document.cookie
    .split("; ")
    .find((value) => value.startsWith("rancher_consent="));
  if (!cookie) return false;
  try {
    const saved = JSON.parse(
      decodeURIComponent(cookie.slice("rancher_consent=".length)),
    );
    return saved?.analytics_storage === true;
  } catch {
    return false; // Malformed consent is a denial, not permission to share answers.
  }
}
function analyticsAllowed(session: AnalyticsSession) {
  if (session.closed || !session.permitted) return false;
  if (!session.token || !session.host) return false;
  if (
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl
  )
    return false;
  return savedAnalyticsConsent();
}
function stopTracker(session: AnalyticsSession) {
  session.tracker?.stop();
  session.tracker = null;
}
async function syncConsent(session: AnalyticsSession) {
  if (!analyticsAllowed(session)) {
    stopTracker(session);
    return;
  }
  if (session.tracker || session.pending) return;
  session.pending = true;
  try {
    const tracker = await session.create(
      session.token!,
      session.host!,
      session.id,
    );
    if (!analyticsAllowed(session)) {
      tracker.stop();
      return;
    }
    session.tracker = tracker;
    tracker.capture("quiz_session_started");
    tracker.capture("quiz_question_viewed", session.position());
  } catch {
    console.warn(
      "Quiz analytics are unavailable; classification is unaffected.",
    );
  } finally {
    session.pending = false;
  }
}

export function subscribeQuizAnalytics(
  token: string | undefined,
  host: string | undefined,
  position: AnalyticsSession["position"],
  create = createQuizTracker,
): QuizTracker {
  const session: AnalyticsSession = {
    token,
    host,
    id: createQuizSessionId(),
    position,
    create,
    closed: false,
    pending: false,
    permitted: true,
    tracker: null,
  };
  const listener = (event?: Event) => {
    if (event)
      session.permitted =
        (event as CustomEvent)?.detail?.analytics_storage === true;
    void syncConsent(session);
  };
  window.addEventListener("rancher:consent", listener);
  listener();
  return {
    capture(event, properties) {
      if (!analyticsAllowed(session)) return;
      try {
        session.tracker?.capture(event, properties);
      } catch {
        console.warn(
          "Quiz analytics capture failed; classification is unaffected.",
        );
      }
    },
    stop() {
      session.closed = true;
      window.removeEventListener("rancher:consent", listener);
      stopTracker(session);
    },
  };
}
export function useQuizAnalytics(token?: string, host?: string) {
  const tracker = useRef<QuizTracker | null>(null);
  const position = useRef({ question_id: "q1", step: 1 });
  useEffect(() => {
    const subscription = subscribeQuizAnalytics(
      token,
      host,
      () => position.current,
    );
    tracker.current = subscription;
    return () => {
      subscription.stop();
      tracker.current = null;
    };
  }, [token, host]);
  const capture = (event: string, properties: Record<string, unknown> = {}) =>
    tracker.current?.capture(event, properties);
  return { capture, position };
}
