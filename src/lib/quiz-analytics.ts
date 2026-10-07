import { QUIZ_VERSION } from "./quiz";

export async function createQuizTracker(
  token: string,
  host: string,
  sessionId: string,
) {
  const { default: posthog } = await import("posthog-js");
  const allowed = new Set([
    "distinct_id",
    "token",
    "quiz_session_id",
    "quiz_version",
    "question_id",
    "answer",
    "answers",
    "probabilities",
    "scoring_source",
    "classifier_model",
    "classifier_confidence",
    "predicted_archetype",
    "step",
    "archetype",
    "suggested_archetype",
    "invalidated_question_ids",
    "consent_version",
    "$lib",
    "$lib_version",
  ]);
  const instance = posthog.init(
    token,
    {
      api_host: host,
      bootstrap: { distinctID: sessionId, isIdentifiedID: false },
      persistence: "memory",
      person_profiles: "never",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      disable_session_recording: true,
      disable_surveys: true,
      opt_in_site_apps: false,
      advanced_disable_flags: true,
      disable_external_dependency_loading: true,
      ip: false,
      before_send: (event) => {
        if (!event || !event.event.startsWith("quiz_")) return null;
        event.properties = {
          ...Object.fromEntries(
            Object.entries(event.properties).filter(([key]) =>
              allowed.has(key),
            ),
          ),
          $ip: null,
          $process_person_profile: false,
        };
        return event;
      },
    },
    "rancherQuiz",
  );
  if (!instance) throw new Error("Analytics could not initialize.");
  instance.opt_in_capturing();
  return {
    capture(event: string, properties: Record<string, unknown> = {}) {
      instance.capture(
        event,
        {
          quiz_session_id: sessionId,
          quiz_version: QUIZ_VERSION,
          consent_version: "rancher-site-consent-v1",
          ...properties,
        },
        { send_instantly: true },
      );
    },
    stop() {
      instance.opt_out_capturing();
    },
  };
}
export type QuizTracker = Awaited<ReturnType<typeof createQuizTracker>>;
