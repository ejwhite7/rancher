import { createHmac, timingSafeEqual } from "node:crypto";
import { archetypeIds, QUIZ_VERSION, type ArchetypeId } from "../lib/quiz";
import { quizMetrics, type QuizEvent } from "../lib/quiz-metrics";
import { serverEnv } from "./database";
import {
  readSubmissionInput,
  submissionJson as json,
  validateSubmissionRequest,
} from "./submission-transport";

const events = [
  "quiz_session_started",
  "quiz_question_viewed",
  "quiz_answered",
  "quiz_answers_invalidated",
  "quiz_completed",
  "quiz_path_confirmed",
  "quiz_cta_clicked",
  "quiz_consent_withdrawn",
  "quiz_label_verified",
];
const sessionPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function sameSecret(actual: string, expected: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const labelSignature = (
  secret: string,
  sessionId: string,
  archetype: string,
) =>
  createHmac("sha256", secret)
    .update(`${QUIZ_VERSION}:${sessionId}:${archetype}`)
    .digest("hex");

export async function handleQuizDashboard(
  request: Request,
  dependencies = { env: serverEnv, fetch, now: Date.now },
) {
  const { env, fetch: send, now } = dependencies;
  const token = env("QUIZ_DASHBOARD_TOKEN");
  if (!token || token.length < 32)
    return json({ error: "Staff dashboard access is not configured." }, 503);
  const authorization = request.headers.get("authorization") || "";
  if (!sameSecret(authorization, `Bearer ${token}`))
    return json({ error: "Staff authentication required." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "Cross-origin access is not allowed." }, 403);
  if (!["GET", "POST"].includes(request.method))
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, POST", "Cache-Control": "no-store" },
    });
  const projectId = env("POSTHOG_PROJECT_ID");
  const key = env("POSTHOG_PERSONAL_API_KEY");
  const signingKey = env("QUIZ_LABEL_SIGNING_KEY");
  const host = env("POSTHOG_QUERY_HOST") || "https://us.posthog.com";
  if (
    !projectId ||
    !/^\d+$/.test(projectId) ||
    !key ||
    !signingKey ||
    signingKey.length < 32 ||
    !["https://us.posthog.com", "https://eu.posthog.com"].includes(host)
  ) {
    return json(
      { error: "PostHog query access and label signing are not configured." },
      503,
    );
  }
  const days = Number(new URL(request.url).searchParams.get("days") || 30);
  if (!Number.isInteger(days) || days < 1 || days > 30)
    return json(
      { error: "Choose a whole-number window between 1 and 30 days." },
      400,
    );
  let verification: { sessionId: string; archetype: ArchetypeId } | undefined;
  if (request.method === "POST") {
    const invalid = validateSubmissionRequest(request);
    if (invalid) return invalid;
    const body = await readSubmissionInput(request);
    if (body.error) return body.error;
    const input = body.input as {
      sessionId?: unknown;
      archetype?: unknown;
      confirmedIndependent?: unknown;
    } | null;
    if (
      !input ||
      typeof input.sessionId !== "string" ||
      !sessionPattern.test(input.sessionId) ||
      !archetypeIds.includes(input.archetype as ArchetypeId) ||
      input.confirmedIndependent !== true
    ) {
      return json(
        {
          error:
            "Provide a valid quiz session, archetype and independent-review confirmation.",
        },
        400,
      );
    }
    verification = {
      sessionId: input.sessionId,
      archetype: input.archetype as ArchetypeId,
    };
  }
  // ponytail: bounded raw-event aggregation (10,000 events); move aggregation to HogQL when volume exceeds this ceiling.
  const query = `SELECT event, properties.quiz_session_id, properties.question_id, properties.predicted_archetype,
    properties.archetype, properties.label_signature, timestamp, properties.invalidated_question_ids
    FROM events WHERE event IN (${events.map((event) => `'${event}'`).join(",")})
    AND properties.quiz_version = '${QUIZ_VERSION}'
    AND timestamp >= now() - INTERVAL ${days} DAY
    ORDER BY timestamp DESC LIMIT 10001`;
  try {
    const response = await send(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      return json(
        { error: "PostHog query failed. Check project access and region." },
        502,
      );
    const data = (await response.json()) as { results?: unknown };
    if (!Array.isArray(data.results))
      return json(
        { error: "PostHog did not return a completed event query." },
        502,
      );
    if (data.results.length > 10_000)
      return json(
        {
          error:
            "More than 10,000 events in this window. Choose fewer days; partial counts are not shown.",
        },
        422,
      );
    const parsed: QuizEvent[] = [];
    for (const row of data.results) {
      if (
        !Array.isArray(row) ||
        !events.includes(row[0]) ||
        typeof row[1] !== "string" ||
        !sessionPattern.test(row[1])
      )
        continue;
      const timestamp = Date.parse(row[6]);
      if (!Number.isFinite(timestamp)) continue;
      let invalidated = row[7];
      if (typeof invalidated === "string") {
        try {
          invalidated = JSON.parse(invalidated);
        } catch {
          invalidated = [];
        }
      }
      parsed.push({
        event: row[0],
        sessionId: row[1],
        questionId: typeof row[2] === "string" ? row[2] : undefined,
        predicted: archetypeIds.includes(row[3]) ? row[3] : null,
        archetype: archetypeIds.includes(row[4]) ? row[4] : undefined,
        signature: typeof row[5] === "string" ? row[5] : undefined,
        timestamp,
        invalidated: Array.isArray(invalidated)
          ? invalidated.filter(
              (value): value is string => typeof value === "string",
            )
          : [],
      });
    }
    if (verification) {
      if (
        !parsed.some(
          (event) =>
            event.sessionId === verification.sessionId &&
            event.event === "quiz_session_started",
        )
      ) {
        return json(
          {
            error:
              "No opted-in quiz session found in this window. Events may still be ingesting.",
          },
          404,
        );
      }
      const ingestionToken = env("PUBLIC_POSTHOG_PROJECT_TOKEN");
      const ingestionHost = env("PUBLIC_POSTHOG_HOST");
      if (
        !ingestionToken ||
        !ingestionHost ||
        !["https://us.i.posthog.com", "https://eu.i.posthog.com"].includes(
          ingestionHost,
        )
      ) {
        return json(
          {
            error:
              "Label ingestion requires the matching US/EU PostHog ingestion origin and public project token.",
          },
          503,
        );
      }
      const result = await send(new URL("/capture/", ingestionHost), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: ingestionToken,
          event: "quiz_label_verified",
          timestamp: new Date(now()).toISOString(),
          properties: {
            distinct_id: verification.sessionId,
            quiz_session_id: verification.sessionId,
            quiz_version: QUIZ_VERSION,
            archetype: verification.archetype,
            verification_source: "independent_review",
            label_signature: labelSignature(
              signingKey,
              verification.sessionId,
              verification.archetype,
            ),
            $process_person_profile: false,
            $ip: null,
          },
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!result.ok)
        return json(
          {
            error:
              "The reviewer label was not accepted by PostHog. Retry later.",
          },
          502,
        );
      return json(
        {
          saved: true,
          message: "Label accepted. Refresh after PostHog finishes ingestion.",
        },
        201,
      );
    }
    return json(
      {
        ...quizMetrics(parsed, now(), (event) =>
          Boolean(
            event.signature &&
            event.archetype &&
            sameSecret(
              event.signature,
              labelSignature(signingKey, event.sessionId, event.archetype),
            ),
          ),
        ),
        days,
        generatedAt: new Date(now()).toISOString(),
      },
      200,
    );
  } catch {
    return json(
      {
        error:
          "PostHog is unavailable or the query timed out. No partial metrics were returned.",
      },
      502,
    );
  }
}
