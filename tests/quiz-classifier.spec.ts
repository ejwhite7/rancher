import { expect, test } from "@playwright/test";
import { handleQuizClassification } from "../src/server/quiz-classifier";

const env = (name: string) =>
  name === "TYPESAFE_API_KEY" ? "synthetic-server-only-key" : undefined;
const request = (
  answers: unknown = { q1: "q1_0" },
  origin = "https://quiz.test",
) =>
  new Request("https://quiz.test/api/quiz/classify/", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
const fixture = (changes: object = {}) => ({
  model: "jev-1.13.0",
  answers: {
    archetype: {
      type: "choice",
      choice: "MC",
      probabilities: { AO: 0.02, OS: 0.04, MC: 0.94 },
      confidence: 0.9,
      ...changes,
    },
  },
});

test("missing Jev configuration fails closed without making a provider request", async () => {
  let calls = 0;
  const response = await handleQuizClassification(request(), {
    env: () => undefined,
    fetch: async () => {
      calls++;
      return Response.json(fixture());
    },
  });
  expect(response.status).toBe(503);
  expect(calls).toBe(0);
  expect(await response.json()).toMatchObject({ code: "jev_not_configured" });
});
test("configured readiness does not invoke Jev or generate a provider receipt", async () => {
  const response = await handleQuizClassification(
    new Request("https://quiz.test/api/quiz/classify/"),
    {
      env,
      fetch: async () => {
        throw new Error("Readiness must not call Jev");
      },
    },
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ configured: true });
  expect(response.headers.has("X-Quiz-Request-Id")).toBe(false);
});
test("operational logging failure cannot block a valid Jev response", async () => {
  const info = console.info;
  const warn = console.warn;
  const warnings: string[] = [];
  console.info = () => {
    throw new Error("Synthetic log sink failure");
  };
  console.warn = (message) => warnings.push(String(message));
  try {
    const response = await handleQuizClassification(request(), {
      env,
      fetch: async () => Response.json(fixture()),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ top: "MC", source: "jev" });
    expect(warnings).toEqual(["quiz_jev_receipt_unavailable"]);
  } finally {
    console.info = info;
    console.warn = warn;
  }
});
test("calls native Jev Choice with the entire history including written answers, never weights or client secrets", async () => {
  const answers = {
    q1: "q1_2",
    q2: "q2_4",
    q3_MC: "q3_MC_0",
    q4_MC: "q4_MC_0",
    q5_transaction: "q5_transaction_0",
    q6_timing: "q6_timing_0",
    q7_dataset:
      "I represent several businesses whose records could be useful for AI training.",
    q8_discussion: "Seller compensation and licensing terms with Rancher",
  };
  const send: typeof fetch = async (url, init) => {
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer synthetic-server-only-key",
    });
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("jev-latest");
    expect(body.questions.archetype.type).toBe("choice");
    expect(Object.keys(body.questions.archetype.criteria)).toEqual([
      "AO",
      "OS",
      "MC",
    ]);
    expect(body.state.business).toContain("Rancher is the buyer");
    expect(body.questions.archetype.instructions).toContain(
      "Choose only AO, OS or MC",
    );
    expect(body.state.history).toHaveLength(8);
    expect(body.state.history[6].answer).toBe(answers.q7_dataset);
    expect(body.state.history[7].answer).toBe(answers.q8_discussion);
    expect(body.state.history[0].answer).toContain(
      "businesses with data to sell or license to Rancher",
    );
    expect(String(init?.body)).not.toContain("weights");
    expect(String(init?.body)).not.toContain("synthetic-server-only-key");
    return Response.json(fixture());
  };
  const response = await handleQuizClassification(request(answers), {
    env,
    fetch: send,
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const data = await response.json();
  expect(data).toMatchObject({
    top: "MC",
    source: "jev",
    model: "jev-1.13.0",
    probabilities: { AO: 0.02, OS: 0.04, MC: 0.94 },
  });
  expect(JSON.stringify(data)).not.toContain("synthetic-server-only-key");
});
test("rejects cross-origin, malformed, oversized and unknown answers before invoking Jev", async () => {
  const never: typeof fetch = async () => {
    throw new Error("Must not contact Jev");
  };
  expect(
    (
      await handleQuizClassification(
        request({ q1: "q1_0" }, "https://foreign.test"),
        { env, fetch: never },
      )
    ).status,
  ).toBe(403);
  for (const answers of [
    null,
    [],
    {},
    { q1: "invalid" },
    { q5_outcome: "wrong order" },
    { q1: "q1_0", q2: "q2_0", q5_outcome: "Missing problem" },
    {
      q1: "q1_0",
      q2: "q2_0",
      q5_outcome: "Outcome first",
      q4_problem: "Problem later",
    },
    { q1: "q1_0", q2: "q2_0", unknown: "x" },
    { q1: "q1_0", q2: "q2_0", q4_problem: "Skipped both follow-ups" },
    { q1: "q1_0", q2: "q2_0", q4_AO: "q4_AO_0" },
    { q1: "q1_0", q2: "q2_0", q3_AO: "q3_AO_0", q3_AP: "q3_AP_0" },
    {
      q1: "q1_0",
      q2: "q2_0",
      q3_shared: "q3_shared_0",
      q4_problem: "Skipped clarification",
    },
    { q1: "q1_0", q2: "q2_0", q4_problem: "x".repeat(2001) },
    { q1: "q1_0", q2: "q2_0", q4_problem: 123 },
    {
      q1: "q1_0",
      q2: "q2_0",
      q3_AP: "q3_AP_0",
      q4_AP: "q4_AP_0",
      q5_AP: "q5_AP_0",
      q7_dataset: "Skipped timing",
    },
    {
      q1: "q1_0",
      q2: "q2_0",
      q3_AP: "q3_AP_0",
      q4_AP: "q4_AP_0",
      q5_AP: "q5_AP_0",
      q6_timing: "q6_timing_0",
      q7_dataset: "x".repeat(2001),
    },
  ]) {
    expect(
      (await handleQuizClassification(request(answers), { env, fetch: never }))
        .status,
    ).toBe(400);
  }
  expect(
    (
      await handleQuizClassification(request({ q1: "x".repeat(20_000) }), {
        env,
        fetch: never,
      })
    ).status,
  ).toBe(413);
});
test("rejects invalid provider distributions and choices rather than falling back", async () => {
  for (const change of [
    { choice: "unknown" },
    { choice: "AP", probabilities: { AO: 0.01, OS: 0.02, MC: 0.03, AP: 0.94 } },
    { choice: "AO" },
    { type: "score" },
    { confidence: 2 },
    { probabilities: { AO: 0, OS: 0, MC: 0 } },
    { probabilities: { AO: -0.1, OS: 0.2, MC: 0.9 } },
    { probabilities: { AO: 1, OS: 1, MC: 1 } },
    { probabilities: { AO: "0", OS: 0, MC: 1 } },
  ]) {
    const response = await handleQuizClassification(request(), {
      env,
      fetch: async () => Response.json(fixture(change)),
    });
    expect(response.status).toBe(502);
    expect(await response.json()).not.toHaveProperty("probabilities");
  }
});
test("provider authentication, rate limit, overload and network errors all block progression", async () => {
  for (const status of [401, 429, 529])
    expect(
      (
        await handleQuizClassification(request(), {
          env,
          fetch: async () => new Response(null, { status }),
        })
      ).status,
    ).toBe(502);
  expect(
    (
      await handleQuizClassification(request(), {
        env,
        fetch: async () => {
          throw new Error("Timeout");
        },
      })
    ).status,
  ).toBe(502);
});
