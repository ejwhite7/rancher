import { expect, test } from "@playwright/test";
import {
  archetypeIds,
  nextQuestion,
  questionById,
  questionTargets,
  quizQuestionRange,
  validQuizHistory,
  type Answers,
  type Classification,
} from "../src/lib/quiz";
import { handleQuizClassification } from "../src/server/quiz-classifier";

function prediction(
  top: Classification["top"],
  probability = 0.94,
): Classification {
  return {
    top,
    source: "jev",
    model: "jev-1.13.0",
    confidence: 0.99,
    probabilities: Object.fromEntries(
      archetypeIds.map((id) => [
        id,
        id === top
          ? probability
          : (1 - probability) / (archetypeIds.length - 1),
      ]),
    ) as Classification["probabilities"],
  };
}

test("all 10 seller-only graph paths work in the router and server, including every mixed-role prefix", async () => {
  const paths: string[][] = [];
  function visit(id: string | null, path: string[] = []) {
    if (id === null) {
      paths.push(path);
      return;
    }
    expect(path).not.toContain(id);
    for (const next of questionTargets(questionById(id)))
      visit(next, [...path, id]);
  }
  visit("q1");
  expect(paths).toHaveLength(10);
  let counter = 0;
  const receipts: string[] = [];
  const info = console.info;
  console.info = (event, attributes) =>
    receipts.push(JSON.stringify({ event, ...attributes }));
  try {
    for (const path of paths) {
      expect(path.length).toBe(8);
      expect(
        path.filter((id) => questionById(id).type === "open"),
      ).toHaveLength(2);
      const answers: Answers = {};
      for (const [index, id] of path.entries()) {
        const question = questionById(id);
        answers[id] =
          question.options[0]?.id || "Synthetic private text never logged.";
        const next = path[index + 1] || null;
        const top = archetypeIds.find(
          (role) =>
            question.next_if_prob_gt?.archetype_to_question[role] === next,
        );
        const result = prediction(top || "AO", top ? 0.94 : 0.85);
        expect(nextQuestion(id, answers, result)).toBe(next);
        expect(validQuizHistory(answers)).toBe(true);
        const range = quizQuestionRange(path.slice(0, index + 1));
        expect(range.min).toBeLessThanOrEqual(path.length);
        expect(range.max).toBeGreaterThanOrEqual(path.length);
        const request = new Request("https://quiz.test/api/quiz/classify/", {
          method: "POST",
          headers: {
            Origin: "https://quiz.test",
            "Content-Type": "application/json",
            "x-forwarded-for": `graph-${++counter}`,
          },
          body: JSON.stringify({ answers }),
        });
        let calls = 0;
        const response = await handleQuizClassification(request, {
          env: (name) =>
            name === "TYPESAFE_API_KEY" ? "synthetic-only-key" : undefined,
          fetch: async (_url, init) => {
            calls++;
            const payload = JSON.parse(String(init?.body));
            expect(payload.state.history).toHaveLength(index + 1);
            expect(String(init?.body)).not.toContain("weights");
            return Response.json(
              {
                model: result.model,
                answers: {
                  archetype: {
                    type: "choice",
                    choice: result.top,
                    confidence: result.confidence,
                    probabilities: result.probabilities,
                  },
                },
              },
              { headers: { "x-request-id": "synthetic-provider-receipt" } },
            );
          },
        });
        expect(response.status, path.join(" → ")).toBe(200);
        expect(calls).toBe(1);
        expect(response.headers.get("X-Quiz-Request-Id")).toBeTruthy();
      }
    }
    expect(receipts).toHaveLength(counter);
    expect(receipts.join(" ")).not.toContain("Synthetic private text");
    expect(receipts.join(" ")).not.toContain("synthetic-only-key");
    expect(JSON.parse(receipts.at(-1)!)).toMatchObject({
      event: "quiz_jev_request",
      provider_request_id: "synthetic-provider-receipt",
      valid: true,
    });
    expect(
      receipts.some((receipt) => JSON.parse(receipt).answer_count === 8),
    ).toBe(true);
  } finally {
    console.info = info;
  }
});

test("every visitor answers 6–8 questions, mostly choices and exactly two open answers", () => {
  for (const top of archetypeIds) {
    for (const probability of [0.5, 0.85, 0.94]) {
      const result: Classification = {
        top,
        source: "jev",
        model: "jev-1.13.0",
        confidence: 0.4,
        probabilities: Object.fromEntries(
          archetypeIds.map((id) => [
            id,
            id === top
              ? probability
              : (1 - probability) / (archetypeIds.length - 1),
          ]),
        ) as Classification["probabilities"],
      };
      const answers: Answers = {};
      const path = [];
      let id: string | null = "q1";
      while (id) {
        const question = questionById(id);
        path.push(question);
        expect(path.length).toBeLessThanOrEqual(8);
        answers[id] = question.options[0]?.id || "Synthetic written context.";
        id = nextQuestion(id, answers, result);
      }
      expect(
        path.length,
        `${top} at ${probability}: ${path.map((question) => question.id).join(" → ")}`,
      ).toBe(8);
      expect(path.filter((question) => question.type === "open")).toHaveLength(
        2,
      );
      expect(path.filter((question) => question.type === "choice").length).toBe(
        6,
      );
    }
  }
});
