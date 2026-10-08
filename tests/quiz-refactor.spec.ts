import { expect, test } from "@playwright/test";
import {
  advanceQuiz,
  initialQuizState,
  rewindQuiz,
  type QuizState,
} from "../src/components/useQuizFunnel";
import { subscribeQuizAnalytics } from "../src/components/useQuizAnalytics";
import {
  classificationSchema,
  CLASSIFICATION_ERROR,
  requestClassification,
} from "../src/lib/quiz-classification";
import { questionById, type Classification } from "../src/lib/quiz";
import type { QuizTracker } from "../src/lib/quiz-analytics";

test.describe.configure({ mode: "serial" });
const result = (
  top: Classification["top"] = "AO",
  probability = 0.94,
): Classification => ({
  top,
  source: "jev",
  model: "jev-1.13.0",
  confidence: 0.4,
  probabilities: Object.fromEntries(
    ["AO", "OS", "MC"].map((id) => [
      id,
      id === top ? probability : (1 - probability) / 2,
    ]),
  ) as Classification["probabilities"],
});
function answer(
  state: QuizState,
  prediction = result(),
  value = questionById(state.path.at(-1)!).options[0]?.id ||
    "Synthetic written answer.",
) {
  return advanceQuiz({ ...state, draft: value }, prediction);
}

test("shared contract rejects invalid distributions, metadata, confidence and choices, including nonfinite numbers", async () => {
  expect(classificationSchema.safeParse(result()).success).toBe(true);
  for (const change of [
    { source: "weights" },
    { model: "not-jev" },
    { confidence: Infinity },
    { top: "unknown" },
    { top: "AP" },
    { probabilities: { AO: Infinity, OS: 0, MC: 0 } },
    { probabilities: { AO: NaN, OS: 0, MC: 1 } },
    { probabilities: { AO: -0.1, OS: 0.1, MC: 1 } },
    { probabilities: { AO: 1, OS: 1, MC: 1 } },
    { probabilities: { AO: 1, OS: 0 } },
    { probabilities: { AO: 1, OS: 0, MC: 0, extra: 0 } },
    { probabilities: { AO: 1, OS: 0, MC: 0, AP: 0 } },
  ]) {
    const data = { ...result(), ...change };
    expect(classificationSchema.safeParse(data).success).toBe(false);
    await expect(
      requestClassification({ q1: "q1_0" }, async () => Response.json(data)),
    ).rejects.toThrow(CLASSIFICATION_ERROR);
  }
});
test("malformed JSON is a generic error, while valid server retry messages survive", async () => {
  await expect(
    requestClassification({}, async () => new Response("not JSON")),
  ).rejects.toThrow(CLASSIFICATION_ERROR);
  await expect(
    requestClassification({}, async () =>
      Response.json(
        { error: "Please wait a minute before trying again." },
        { status: 429 },
      ),
    ),
  ).rejects.toThrow("Please wait a minute");
  expect(
    await requestClassification({ q1: "q1_0" }, async () =>
      Response.json(result()),
    ),
  ).toEqual(result());
});
test("written corrections determine the final landing without another tailored question", () => {
  let state = answer(initialQuizState);
  expect(state.path.at(-1)).toBe("q2");
  state = answer(state);
  expect(state.path.at(-1)).toBe("q3_AO");
  state = answer(state);
  expect(state.path.at(-1)).toBe("q4_motivation");
  state = answer(state);
  state = answer(state);
  state = answer(state);
  expect(state.path.at(-1)).toBe("q7_dataset");
  state = answer(
    state,
    result("MC"),
    "I represent several companies with data to license to Rancher.",
  );
  expect(state.path.at(-1)).toBe("q8_discussion");
  state = answer(state, result("MC"));
  expect(state.completed).toBe(true);
  expect(state.classification?.top).toBe("MC");
  expect(state.path).toHaveLength(8);
  const back = rewindQuiz(state);
  expect(back.completed).toBe(false);
  expect(back.classification).toBeNull();
  expect(back.draft).toBe(state.answers.q8_discussion);
});
test("back preserves unfinished drafts but editing an earlier answer clears future drafts", () => {
  const q2 = answer(initialQuizState);
  const pendingQ2 = { ...q2, draft: questionById("q2").options[0].id };
  const q1 = rewindQuiz(pendingQ2);
  expect(q1.answers).toEqual({ q1: "q1_0" });
  expect(answer(q1).draft).toBe(pendingQ2.draft);
  expect(answer(q1, result(), "q1_1").draft).toBe("");
  expect(q2.cached).not.toHaveProperty("q2"); // Immutable transitions leave prior snapshots untouched.
});
test("uncertainty uses shared qualifying questions and written corrections never reopen a branch", () => {
  let state = answer(initialQuizState, result("MC", 0.5));
  state = answer(state, result("MC", 0.5));
  expect(state.path.at(-1)).toBe("q3_shared");
  state = answer(state, result("MC", 0.5));
  expect(state.path.at(-1)).toBe("q4_shared");
  state = answer(state, result("MC"));
  expect(state.path.at(-1)).toBe("q5_transaction");
  state = answer(state, result("MC"));
  expect(state.path.at(-1)).toBe("q6_timing");
  state = answer(state, result("MC"));
  state = answer(state, result("AO"));
  state = answer(state, result("OS"));
  expect(state.completed).toBe(true);
  expect(state.path).toHaveLength(8);
  expect(state.classification?.top).toBe("OS");
  expect(state.path.slice(-2)).toEqual(["q7_dataset", "q8_discussion"]);
});

function browserMock() {
  const keys = ["window", "document", "navigator"] as const;
  const originals = keys.map((key) =>
    Object.getOwnPropertyDescriptor(globalThis, key),
  );
  const window = new EventTarget();
  const document = { cookie: "" };
  const navigator = { globalPrivacyControl: false };
  const values = { window, document, navigator };
  for (const key of keys)
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: values[key],
    });
  const consent = (allowed: boolean, save = true) => {
    if (save)
      document.cookie = `rancher_consent=${encodeURIComponent(JSON.stringify({ analytics_storage: allowed }))}`;
    window.dispatchEvent(
      new CustomEvent("rancher:consent", {
        detail: { analytics_storage: allowed },
      }),
    );
  };
  const restore = () =>
    keys.forEach((key, index) => {
      if (originals[index])
        Object.defineProperty(globalThis, key, originals[index]!);
      else Reflect.deleteProperty(globalThis, key);
    });
  return { document, navigator, consent, restore };
}
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
test("duplicate opt-ins share one pending SDK initialization and withdrawal drops the late tracker", async () => {
  const browser = browserMock();
  let resolve!: (tracker: QuizTracker) => void;
  const pending = new Promise<QuizTracker>((done) => {
    resolve = done;
  });
  const events: string[] = [];
  let created = 0,
    stopped = 0;
  const subscription = subscribeQuizAnalytics(
    "synthetic",
    "https://posthog.test",
    () => ({ question_id: "q2", step: 2 }),
    async () => {
      created++;
      return pending;
    },
  );
  try {
    browser.consent(true, false);
    expect(created).toBe(0); // An event alone is not a saved privacy choice.
    browser.consent(true);
    browser.consent(true);
    expect(created).toBe(1);
    browser.consent(false, false); // Withdrawal must win even if cookie storage fails.
    resolve({
      capture: (event) => events.push(event),
      stop: () => {
        stopped++;
      },
    });
    await settle();
    subscription.capture("quiz_answered");
    expect(events).toEqual([]);
    expect(stopped).toBe(1);
  } finally {
    subscription.stop();
    browser.restore();
  }
});
test("saved consent, silent withdrawal, GPC and disposal guard every capture", async () => {
  const browser = browserMock();
  browser.consent(true);
  const events: string[] = [];
  let stopped = 0;
  const subscription = subscribeQuizAnalytics(
    "synthetic",
    "https://posthog.test",
    () => ({ question_id: "q2", step: 2 }),
    async () => ({
      capture: (event) => events.push(event),
      stop: () => {
        stopped++;
      },
    }),
  );
  try {
    await settle();
    expect(events).toEqual(["quiz_session_started", "quiz_question_viewed"]);
    subscription.capture("quiz_answered");
    expect(events.at(-1)).toBe("quiz_answered");
    const count = events.length;
    browser.navigator.globalPrivacyControl = true;
    subscription.capture("quiz_answered");
    browser.navigator.globalPrivacyControl = false;
    browser.document.cookie = "";
    subscription.capture("quiz_answered");
    expect(events).toHaveLength(count);
    subscription.stop();
    browser.consent(true);
    subscription.capture("quiz_answered");
    expect(events).toHaveLength(count);
    expect(stopped).toBe(1);
  } finally {
    subscription.stop();
    browser.restore();
  }
});
test("an optional analytics capture failure cannot fail classification", async () => {
  const browser = browserMock();
  browser.consent(true);
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (message) => {
    warnings.push(String(message));
  };
  const subscription = subscribeQuizAnalytics(
    "synthetic",
    "https://posthog.test",
    () => ({}),
    async () => ({
      capture: () => {
        throw new Error("Synthetic SDK failure");
      },
      stop: () => {},
    }),
  );
  try {
    await settle();
    expect(() => subscription.capture("quiz_answered")).not.toThrow();
    expect(warnings).toHaveLength(2);
    expect(
      warnings.every((message) =>
        message.includes("classification is unaffected"),
      ),
    ).toBe(true);
  } finally {
    subscription.stop();
    browser.restore();
    console.warn = originalWarn;
  }
});
test("malformed saved consent denies capture and failed SDK creation remains non-blocking", async () => {
  const browser = browserMock();
  const warn = console.warn;
  const warnings: string[] = [];
  let creates = 0;
  console.warn = (message) => warnings.push(String(message));
  browser.document.cookie = "rancher_consent=%invalid";
  const subscription = subscribeQuizAnalytics(
    "synthetic",
    "https://posthog.test",
    () => ({}),
    async () => {
      creates++;
      throw new Error("Synthetic SDK initialization failure");
    },
  );
  try {
    await settle();
    subscription.capture("quiz_answered");
    expect(creates).toBe(0);
    browser.consent(true);
    await settle();
    expect(creates).toBe(1);
    expect(warnings).toEqual([
      "Quiz analytics are unavailable; classification is unaffected.",
    ]);
    expect(() => subscription.capture("quiz_answered")).not.toThrow();
  } finally {
    subscription.stop();
    console.warn = warn;
    browser.restore();
  }
});

test("unmount during SDK initialization stops the late instance without events", async () => {
  const browser = browserMock();
  browser.consent(true);
  let resolve!: (tracker: QuizTracker) => void;
  const pending = new Promise<QuizTracker>((done) => {
    resolve = done;
  });
  const events: string[] = [];
  let stopped = 0;
  const subscription = subscribeQuizAnalytics(
    "synthetic",
    "https://posthog.test",
    () => ({}),
    async () => pending,
  );
  try {
    subscription.stop();
    resolve({
      capture: (event) => events.push(event),
      stop: () => {
        stopped++;
      },
    });
    await settle();
    expect(events).toEqual([]);
    expect(stopped).toBe(1);
  } finally {
    subscription.stop();
    browser.restore();
  }
});
