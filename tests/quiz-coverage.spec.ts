import { expect, test } from "@playwright/test";
import { browserCoverage } from "../scripts/quiz-browser-coverage.mjs";
import { createQuizSessionId } from "../src/lib/quiz";
import { ALL as classify } from "../src/pages/api/quiz/classify";
import { ALL as dashboard } from "../src/pages/api/quiz/dashboard";

const source = "export const value = 1;\n";
function browserEntry(sources = ["quiz.ts"]) {
  const map = {
    version: 3,
    sources,
    sourcesContent: [source],
    names: [],
    mappings: "AAAA",
  };
  const generated = `${source}//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString("base64")}`;
  return {
    url: "http://localhost:4322/src/lib/quiz.ts",
    scriptId: "1",
    source: generated,
    functions: [
      {
        functionName: "",
        isBlockCoverage: true,
        ranges: [{ startOffset: 0, endOffset: generated.length, count: 1 }],
      },
    ],
  };
}

test("browser offsets remain separate while relative and absolute maps resolve to real source files", () => {
  for (const sources of [["quiz.ts"], ["file:///app/src/lib/quiz.ts"]]) {
    const report = browserCoverage([browserEntry(sources)], "/app");
    expect(report.result).toHaveLength(1);
    const generated = report.result[0].url;
    expect(generated).toMatch(/^file:\/\/\/app\/coverage\/browser-source\//);
    expect(report["source-map-cache"][generated].data.sources).toEqual([
      "file:///app/src/lib/quiz.ts",
    ]);
    expect(report["source-map-cache"][generated].data.sourcesContent).toEqual([
      source,
    ]);
    expect(report.result[0].functions[0].ranges[0].count).toBe(1);
  }
});
test("missing maps or application scripts fail closed instead of claiming coverage", () => {
  expect(() =>
    browserCoverage([{ ...browserEntry(), source: "no map" }]),
  ).toThrow("Missing browser source map");
  expect(() =>
    browserCoverage([
      { ...browserEntry(), url: "http://localhost/node_modules/sdk.js" },
    ]),
  ).toThrow("No application browser coverage");
});

test("session IDs remain secure valid UUIDs when randomUUID is unavailable", () => {
  const original = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value: undefined,
  });
  try {
    const first = createQuizSessionId();
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(createQuizSessionId()).not.toBe(first);
  } finally {
    if (original) Object.defineProperty(crypto, "randomUUID", original);
    else delete (crypto as Partial<Crypto>).randomUUID;
  }
});

test("actual Astro classification and staff routes delegate safely with mocked provider I/O", async () => {
  const key = process.env.TYPESAFE_API_KEY;
  const staff = process.env.QUIZ_DASHBOARD_TOKEN;
  const send = globalThis.fetch;
  let calls = 0;
  process.env.TYPESAFE_API_KEY = "synthetic-route-key";
  process.env.QUIZ_DASHBOARD_TOKEN = "short";
  globalThis.fetch = async () => {
    calls++;
    return Response.json({
      model: "jev-1.13.0",
      answers: {
        archetype: {
          type: "choice",
          choice: "AO",
          confidence: 0.9,
          probabilities: { AO: 0.94, OS: 0.03, MC: 0.03 },
        },
      },
    });
  };
  const context = (request: Request) =>
    ({ request }) as Parameters<typeof classify>[0];
  try {
    expect(
      (
        await classify(
          context(new Request("https://quiz.test/api/quiz/classify/")),
        )
      ).status,
    ).toBe(200);
    expect(calls).toBe(0);
    const response = await classify(
      context(
        new Request("https://quiz.test/api/quiz/classify/", {
          method: "POST",
          headers: {
            Origin: "https://quiz.test",
            "Content-Type": "application/json",
            "x-forwarded-for": "coverage-route",
          },
          body: JSON.stringify({ answers: { q1: "q1_0" } }),
        }),
      ),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).top).toBe("AO");
    expect(calls).toBe(1);
    expect(
      (
        await dashboard(
          context(new Request("https://quiz.test/api/quiz/dashboard/")),
        )
      ).status,
    ).toBe(503);
    expect(calls).toBe(1);
  } finally {
    globalThis.fetch = send;
    if (key === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = key;
    if (staff === undefined) delete process.env.QUIZ_DASHBOARD_TOKEN;
    else process.env.QUIZ_DASHBOARD_TOKEN = staff;
  }
});
