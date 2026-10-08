import { expect, test } from "@playwright/test";
import { questionById, quiz, shuffledOptions } from "../src/lib/quiz";

test("new-prospect questions qualify process, authority, motivation, value, timing and dataset details", () => {
  expect(questionById("q2").text).toBe(
    "Which describes where you are in the process?",
  );
  expect(questionById("q3_AO").text).toBe(
    "Can you describe your relationship to the business?",
  );
  expect(questionById("q4_motivation").text).toBe(
    "What is your motivation for seeking a licensing agreement?",
  );
  const motivations = questionById("q4_motivation")
    .options.map((option) => option.label)
    .join(" ");
  for (const topic of [
    "cash flow",
    "expansion",
    "retirement",
    "legacy",
    "shut down",
  ])
    expect(motivations).toContain(topic);
  expect(questionById("q5_transaction").text).toBe(
    "How much are you hoping to receive in a transaction?",
  );
  expect(questionById("q6_timing").text).toBe(
    "How quickly are you hoping to make a decision?",
  );
  expect(questionById("q6_timing").type).toBe("choice");
  expect(
    quiz.questions
      .filter((question) => question.type === "open")
      .map((question) => question.id),
  ).toEqual(["q7_dataset", "q8_discussion"]);
  expect(questionById("q7_dataset").text).toBe(
    "Does your dataset contain any unique, sensitive, or hard-to-obtain data that may be useful?",
  );
  expect(questionById("q8_discussion").text).toBe(
    "Is there anything in particular that you would like to discuss?",
  );
  expect(questionById("q8_discussion").supporting_text).toContain(
    "existing open offers",
  );
  const copy = quiz.questions
    .map((question) =>
      [question.text, ...question.options.map((option) => option.label)].join(
        " ",
      ),
    )
    .join(" ");
  for (const removed of [
    "holding up your next steps",
    "review or introduction",
    "missing invitation",
    "worth your time",
    "valuable stuff",
  ])
    expect(copy).not.toContain(removed);
  for (const id of [
    "q4_motivation",
    "q4_MC",
    "q5_transaction",
    "q5_AP",
    "q6_timing",
  ]) {
    expect(
      questionById(id).options.every((option) =>
        Object.values(option.weights).every((weight) => weight === 0),
      ),
    ).toBe(true);
  }
});

test("Fisher-Yates randomizes every choice without mutating canonical IDs, text or weights", () => {
  for (const question of quiz.questions) {
    const original = question.options.map((option) => ({ ...option }));
    const low = shuffledOptions(question.options, () => 0);
    const high = shuffledOptions(question.options, () => 0.999999);
    expect(question.options).toEqual(original);
    expect(new Set(low.map((option) => option.id))).toEqual(
      new Set(original.map((option) => option.id)),
    );
    expect(
      low.every((option) =>
        original.some(
          (canonical) =>
            canonical.id === option.id &&
            canonical.label === option.label &&
            canonical.weights === option.weights,
        ),
      ),
    ).toBe(true);
    if (question.type === "choice")
      expect(low.map((option) => option.id)).not.toEqual(
        high.map((option) => option.id),
      );
    else expect(low).toEqual([]);
  }
});
