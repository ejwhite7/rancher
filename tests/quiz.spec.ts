import { expect, test } from "@playwright/test";
import {
  archetypeIds,
  createQuizSessionId,
  invalidateAfter,
  nextQuestion,
  questionById,
  type Classification,
  type Answers,
} from "../src/lib/quiz";
import { quizMetrics, type QuizEvent } from "../src/lib/quiz-metrics";
import {
  handleQuizDashboard,
  labelSignature,
} from "../src/server/quiz-dashboard";

const now = Date.parse("2026-10-07T12:00:00Z");
const sessionId = "a984b630-dcb3-49a4-93d3-1d215f5a3061";
const activeId = "b984b630-dcb3-49a4-93d3-1d215f5a3061";
const token = "synthetic-staff-access-token-00000000";
const signingKey = "synthetic-independent-label-signing-000000";
const envValues: Record<string, string> = {
  QUIZ_DASHBOARD_TOKEN: token,
  QUIZ_LABEL_SIGNING_KEY: signingKey,
  POSTHOG_PROJECT_ID: "12345",
  POSTHOG_PERSONAL_API_KEY: "synthetic-read-only-key",
  PUBLIC_POSTHOG_PROJECT_TOKEN: "synthetic-public-token",
  PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
};
const env = (name: string) => envValues[name];
function request(
  method = "GET",
  body?: unknown,
  authorization = `Bearer ${token}`,
  query = "",
) {
  return new Request(`https://quiz.test/api/quiz/dashboard/${query}`, {
    method,
    headers: {
      Authorization: authorization,
      Origin: "https://quiz.test",
      "Content-Type": "application/json",
    },
    ...(method !== "GET" ? { body: JSON.stringify(body) } : {}),
  });
}
function event(
  eventName: string,
  properties: Partial<QuizEvent> = {},
): QuizEvent {
  return {
    event: eventName,
    sessionId,
    timestamp: now - 60 * 60_000,
    ...properties,
  };
}
function rows(events: QuizEvent[]) {
  return events.map((item) => [
    item.event,
    item.sessionId,
    item.questionId || "",
    item.predicted || "",
    item.archetype || "",
    item.signature || "",
    new Date(item.timestamp).toISOString(),
    item.invalidated || [],
  ]);
}

test("anonymous session IDs are unique, valid UUID v4 values", () => {
  const ids = Array.from({ length: 100 }, () => createQuizSessionId());
  expect(new Set(ids).size).toBe(100);
  expect(
    ids.every((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        id,
      ),
    ),
  ).toBe(true);
});

function classification(
  top: Classification["top"],
  probability = 0.94,
): Classification {
  return {
    top,
    probabilities: Object.fromEntries(
      archetypeIds.map((id) => [
        id,
        id === top ? probability : (1 - probability) / 3,
      ]),
    ) as Classification["probabilities"],
    confidence: 0.4,
    source: "jev",
    model: "jev-1.13.0",
  };
}
test("all Jev routes terminate with 6–8 questions and two tailored choices when confident", () => {
  for (const top of archetypeIds)
    for (const probability of [0.25, 0.85, 0.850001, 0.99]) {
      const result = classification(top, probability);
      const answers: Answers = {};
      const seen: string[] = [];
      let current: string | null = "q1";
      while (current) {
        expect(seen).not.toContain(current);
        seen.push(current);
        const question = questionById(current);
        answers[current] =
          question.type === "choice"
            ? question.options[0].id
            : "Synthetic written answer";
        current = nextQuestion(current, answers, result);
        expect(seen.length).toBeLessThanOrEqual(8);
      }
      expect(seen).toHaveLength(8);
      expect(seen.slice(0, 2)).toEqual(["q1", "q2"]);
      expect(seen.slice(-3)).toEqual([
        "q6_timing",
        "q7_dataset",
        "q8_discussion",
      ]);
      const motivation =
        top === "AO" || top === "OS" ? "q4_motivation" : `q4_${top}`;
      expect(seen.slice(2, 4)).toEqual(
        probability > 0.85
          ? [`q3_${top}`, motivation]
          : ["q3_shared", "q4_shared"],
      );
    }
});
test("uses the Jev probability, not confidence or option weights, for the strict cutoff", () => {
  const answers = { q1: "q1_0", q2: "q2_0" };
  expect(nextQuestion("q2", answers, classification("AP", 0.85))).toBe(
    "q3_shared",
  );
  expect(nextQuestion("q2", answers, classification("AP", 0.850001))).toBe(
    "q3_AP",
  );
  expect(nextQuestion("q1", { q1: "q1_0" }, classification("AP"))).toBe("q2");
});
test("written answers finish the flow, role changes switch the second follow-up, and back invalidates descendants", () => {
  const answers = {
    q1: "q1_0",
    q2: "q2_0",
    q3_AO: "q3_AO_0",
    q4_AP: "q4_AP_0",
    q5_AP: "q5_AP_0",
    q6_timing: "q6_timing_0",
    q7_dataset: "I acquire data for buyers",
    q8_discussion: "A usable corpus",
  };
  expect(nextQuestion("q3_AO", answers, classification("AP"))).toBe("q4_AP");
  expect(nextQuestion("q3_AO", answers, classification("AP", 0.85))).toBe(
    "q4_motivation",
  );
  expect(
    nextQuestion("q8_discussion", answers, classification("AP")),
  ).toBeNull();
  const edited = invalidateAfter(answers, Object.keys(answers), 1);
  expect(edited.answers).toEqual({ q1: "q1_0", q2: "q2_0" });
  expect(edited.invalidated).toEqual([
    "q3_AO",
    "q4_AP",
    "q5_AP",
    "q6_timing",
    "q7_dataset",
    "q8_discussion",
  ]);
});

test("metrics deduplicate, exclude active sessions from drop-off, require independently verified labels and discard invalidated predictions", () => {
  const events = [
    event("quiz_session_started"),
    event("quiz_question_viewed", { questionId: "q1" }),
    event("quiz_question_viewed", { questionId: "q1" }),
    event("quiz_answered", { questionId: "q1", predicted: "AO" }),
    event("quiz_answered", {
      questionId: "q1",
      predicted: "OS",
      timestamp: now - 55 * 60_000,
    }),
    event("quiz_question_viewed", { questionId: "q2" }),
    event("quiz_answered", { questionId: "q2", predicted: "AO" }),
    event("quiz_answers_invalidated", {
      invalidated: ["q2"],
      timestamp: now - 50 * 60_000,
    }),
    event("quiz_question_viewed", { questionId: "q7_dataset" }),
    event("quiz_label_verified", {
      archetype: "OS",
      signature: "valid",
      timestamp: now,
    }),
    event("quiz_label_verified", {
      archetype: "AO",
      signature: "forged",
      timestamp: now + 1,
    }),
    event("quiz_session_started", {
      sessionId: activeId,
      timestamp: now - 1_000,
    }),
    event("quiz_question_viewed", {
      sessionId: activeId,
      questionId: "q7_dataset",
      timestamp: now - 1_000,
    }),
    event("quiz_path_confirmed", {
      sessionId: "not-opted-in",
      archetype: "AO",
    }),
  ];
  const result = quizMetrics(events, now, (item) => item.signature === "valid");
  expect(result.sessions).toBe(2);
  expect(result.verified).toBe(1);
  expect(result.questions.find((item) => item.id === "q1")).toMatchObject({
    reached: 1,
    answered: 1,
    accuracy: 1,
    labeled: 1,
  });
  expect(
    result.questions.find((item) => item.id === "q2")?.accuracy,
  ).toBeNull();
  expect(
    result.questions.find((item) => item.id === "q7_dataset"),
  ).toMatchObject({
    reached: 2,
    answered: 0,
    inactiveReached: 1,
    dropoffs: 1,
    dropoff: 1,
  });
  expect(
    quizMetrics(events, now, () => false).questions.every(
      (item) => item.accuracy === null,
    ),
  ).toBe(true);
});

test("dashboard fails closed for missing/wrong/unicode credentials and never queries before authorization", async () => {
  const noNetwork = async () => {
    throw new Error("Must not query");
  };
  expect(
    (
      await handleQuizDashboard(request(), {
        env: () => undefined,
        fetch: noNetwork,
        now: () => now,
      })
    ).status,
  ).toBe(503);
  for (const authorization of [
    "",
    "Bearer wrong",
    `Bearer ${"é".repeat(token.length)}`,
  ]) {
    expect(
      (
        await handleQuizDashboard(request("GET", undefined, authorization), {
          env,
          fetch: noNetwork,
          now: () => now,
        })
      ).status,
    ).toBe(401);
  }
  expect(
    (
      await handleQuizDashboard(
        request("GET", undefined, `Bearer ${token}`, "?days=1 OR 1=1"),
        { env, fetch: noNetwork, now: () => now },
      )
    ).status,
  ).toBe(400);
  const hostile = new Request("https://quiz.test/api/quiz/dashboard/", {
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: "https://elsewhere.test",
    },
  });
  expect(
    (
      await handleQuizDashboard(hostile, {
        env,
        fetch: noNetwork,
        now: () => now,
      })
    ).status,
  ).toBe(403);
});

test("dashboard shows only aggregates and accepts only valid signed labels", async () => {
  const valid = labelSignature(signingKey, sessionId, "AO");
  const fixture = [
    event("quiz_session_started"),
    event("quiz_question_viewed", { questionId: "q1" }),
    event("quiz_answered", { questionId: "q1", predicted: "AO" }),
    event("quiz_label_verified", { archetype: "AO", signature: valid }),
  ];
  const send: typeof fetch = async (_url, init) => {
    const query = JSON.parse(String(init?.body)).query;
    expect(query.kind).toBe("HogQLQuery");
    expect(query.query).not.toContain("properties.answer");
    return Response.json({ results: rows(fixture) });
  };
  const response = await handleQuizDashboard(request(), {
    env,
    fetch: send,
    now: () => now,
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const data = await response.json();
  expect(data.questions[0]).toMatchObject({ accuracy: 1, labeled: 1 });
  expect(JSON.stringify(data)).not.toContain(sessionId);
  expect(JSON.stringify(data)).not.toContain(signingKey);
});

test("staff labels validate input, require an opted-in session, and sign the capture server-side", async () => {
  const captured: Record<string, unknown>[] = [];
  const send: typeof fetch = async (url, init) => {
    if (String(url).endsWith("/capture/")) {
      captured.push(JSON.parse(String(init?.body)));
      return Response.json({ status: 1 });
    }
    return Response.json({ results: rows([event("quiz_session_started")]) });
  };
  for (const input of [
    null,
    { sessionId, archetype: "UNKNOWN", confirmedIndependent: true },
    { sessionId, archetype: "AO", confirmedIndependent: false },
  ]) {
    expect(
      (
        await handleQuizDashboard(request("POST", input), {
          env,
          fetch: send,
          now: () => now,
        })
      ).status,
    ).toBe(400);
  }
  expect(
    (
      await handleQuizDashboard(
        request("POST", {
          sessionId: activeId,
          archetype: "AP",
          confirmedIndependent: true,
        }),
        { env, fetch: send, now: () => now },
      )
    ).status,
  ).toBe(404);
  const response = await handleQuizDashboard(
    request("POST", { sessionId, archetype: "AP", confirmedIndependent: true }),
    { env, fetch: send, now: () => now },
  );
  expect(response.status).toBe(201);
  expect(captured).toHaveLength(1);
  expect(captured[0]).toMatchObject({
    event: "quiz_label_verified",
    properties: {
      label_signature: labelSignature(signingKey, sessionId, "AP"),
      $ip: null,
      $process_person_profile: false,
    },
  });
});

test("upstream failures, oversized input and event truncation do not produce partial metrics", async () => {
  const limited: typeof fetch = async () =>
    Response.json({ results: Array.from({ length: 10001 }, () => []) });
  expect(
    (
      await handleQuizDashboard(request(), {
        env,
        fetch: limited,
        now: () => now,
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await handleQuizDashboard(request(), {
        env,
        fetch: async () => new Response(null, { status: 500 }),
        now: () => now,
      })
    ).status,
  ).toBe(502);
  expect(
    (
      await handleQuizDashboard(
        request("POST", { sessionId: "x".repeat(20_000) }),
        { env, fetch: limited, now: () => now },
      )
    ).status,
  ).toBe(413);
});
