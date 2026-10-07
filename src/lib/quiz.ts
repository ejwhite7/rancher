import source from "../data/quiz_map.json" with { type: "json" };

export const QUIZ_VERSION = "rancher-quiz-v2-jev";
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
    result.top &&
    result.probabilities[result.top] > branch.threshold &&
    !Object.keys(answers).some((key) => key.startsWith("q3_"))
  ) {
    const target = branch.archetype_to_question[result.top];
    if (target && !answers[target]) return target;
  }
  // Late branches return through shared nodes that may already be answered.
  let next = question.next_default;
  while (next && Object.hasOwn(answers, next))
    next = questionById(next).next_default;
  return next;
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
