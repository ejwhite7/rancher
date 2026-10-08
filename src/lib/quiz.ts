import source from "../data/quiz_map.json" with { type: "json" };

export const QUIZ_VERSION = "rancher-quiz-v4-jev";
export type Classification = {
  probabilities: Scores;
  top: ArchetypeId;
  confidence: number;
  model: string;
  source: "jev";
};

export function createQuizSessionId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  // randomUUID requires HTTPS; secure random bytes also work in local HTTP previews.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export const archetypeIds = ["AO", "OS", "MC", "AP"] as const;
export type ArchetypeId = (typeof archetypeIds)[number];
export type Scores = Record<ArchetypeId, number>;
export type Answers = Record<string, string>;
export type Question = {
  id: string;
  text: string;
  type: "choice" | "open";
  shared: boolean;
  supporting_text?: string;
  options: { id: string; label: string; weights: Scores }[];
  next_if_prob_gt?: {
    threshold: number;
    archetype_to_question: Record<string, string>;
  };
  next_default: string | null;
};
const names = {
  AO: "Archive owners",
  OS: "Offer shoppers",
  MC: "Multi-company dealmakers",
  AP: "Acquisition partners",
};
export const quiz = {
  endings: source.endings,
  archetypes: source.archetypes.map((id) => ({
    id: id as ArchetypeId,
    label: names[id as ArchetypeId],
  })),
  questions: source.questions.map((question): Question => ({
    ...question,
    type: question.type as Question["type"],
    options: question.options.map((option, index) => ({
      id: `${question.id}_${index}`,
      label: option.text,
      weights: option.weights,
    })),
    next_default: question.next.default,
    next_if_prob_gt: Object.keys(question.next.branch).length
      ? {
          threshold: 0.85,
          archetype_to_question: question.next.branch as Record<string, string>,
        }
      : undefined,
  })),
};
export const questionById = (id: string) =>
  quiz.questions.find((question) => question.id === id)!;

export function shuffledOptions<T>(
  options: readonly T[],
  random = Math.random,
): T[] {
  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export function nextQuestion(
  id: string,
  answers: Answers,
  result: Classification,
): string | null {
  const question = questionById(id);
  const branch = question.next_if_prob_gt;
  if (
    answers.q1 &&
    answers.q2 &&
    branch &&
    result.probabilities[result.top] > branch.threshold
  ) {
    return branch.archetype_to_question[result.top] || question.next_default;
  }
  return question.next_default;
}

export function questionTargets(question: Question) {
  return [
    ...new Set([
      question.next_default,
      ...Object.values(question.next_if_prob_gt?.archetype_to_question || {}),
    ]),
  ];
}

// Validate graph prefixes: the server has no trusted prior predictions to verify thresholds.
export function validQuizHistory(answers: Answers) {
  const ids = Object.keys(answers);
  if (ids.length < 1 || ids.length > 8 || ids[0] !== "q1") return false;
  return ids.every((id, index) => {
    const question = questionById(id);
    if (!question) return false;
    return (
      index === 0 || questionTargets(questionById(ids[index - 1])).includes(id)
    );
  });
}

export function quizQuestionRange(path: string[]) {
  function remaining(id: string | null): number[] {
    if (!id) return [0];
    return questionTargets(questionById(id)).flatMap((target) =>
      remaining(target).map((length) => length + 1),
    );
  }
  const lengths = remaining(path[path.length - 1]);
  return {
    min: path.length - 1 + Math.min(...lengths),
    max: path.length - 1 + Math.max(...lengths),
  };
}

export function invalidateAfter(
  answers: Answers,
  path: string[],
  targetIndex: number,
) {
  const kept = new Set(path.slice(0, targetIndex + 1));
  return {
    answers: Object.fromEntries(
      Object.entries(answers).filter(([id]) => kept.has(id)),
    ),
    invalidated: Object.keys(answers).filter((id) => !kept.has(id)),
    path: path.slice(0, targetIndex + 1),
  };
}
