import { quiz, type ArchetypeId } from "./quiz";

export type QuizEvent = {
  event: string;
  sessionId: string;
  timestamp: number;
  questionId?: string;
  predicted?: ArchetypeId | null;
  archetype?: ArchetypeId;
  signature?: string;
  invalidated?: string[];
};
export type QuestionMetric = {
  id: string;
  text: string;
  reached: number;
  answered: number;
  inactiveReached: number;
  dropoffs: number;
  dropoff: number | null;
  labeled: number;
  correct: number;
  unclassified: number;
  accuracy: number | null;
};
export type QuizMetrics = {
  sessions: number;
  completed: number;
  verified: number;
  questions: QuestionMetric[];
};

export function quizMetrics(
  events: QuizEvent[],
  now: number,
  isVerified: (event: QuizEvent) => boolean,
): QuizMetrics {
  const sessions = new Map<
    string,
    {
      optedIn: boolean;
      lastSeen: number;
      complete: boolean;
      viewed: Set<string>;
      answered: Set<string>;
      predictions: Map<string, ArchetypeId | null>;
      label?: ArchetypeId;
    }
  >();
  const questionIds = new Set(quiz.questions.map((question) => question.id));
  for (const event of [...events].sort((a, b) => a.timestamp - b.timestamp)) {
    let session = sessions.get(event.sessionId);
    if (!session) {
      session = {
        optedIn: false,
        lastSeen: 0,
        complete: false,
        viewed: new Set(),
        answered: new Set(),
        predictions: new Map(),
      };
      sessions.set(event.sessionId, session);
    }
    // Staff verification does not make an abandoned prospect appear active.
    if (event.event !== "quiz_label_verified")
      session.lastSeen = Math.max(session.lastSeen, event.timestamp);
    if (event.event === "quiz_session_started") session.optedIn = true;
    if (event.event === "quiz_completed") session.complete = true;
    if (event.questionId && questionIds.has(event.questionId)) {
      if (event.event === "quiz_question_viewed")
        session.viewed.add(event.questionId);
      if (event.event === "quiz_answered") {
        session.answered.add(event.questionId);
        session.predictions.set(event.questionId, event.predicted || null);
      }
    }
    if (event.event === "quiz_answers_invalidated")
      for (const id of event.invalidated || []) session.predictions.delete(id);
    if (
      event.event === "quiz_label_verified" &&
      event.archetype &&
      isVerified(event)
    )
      session.label = event.archetype;
  }
  const cohort = [...sessions.values()].filter((session) => session.optedIn);
  return {
    sessions: cohort.length,
    completed: cohort.filter((session) => session.complete).length,
    verified: cohort.filter((session) => session.label).length,
    questions: quiz.questions.map((question) => {
      const reached = cohort.filter((session) =>
        session.viewed.has(question.id),
      );
      const inactive = reached.filter(
        (session) => now - session.lastSeen >= 30 * 60_000,
      );
      const dropoffs = inactive.filter(
        (session) => !session.answered.has(question.id),
      ).length;
      const labeled = reached.filter(
        (session) => session.label && session.predictions.has(question.id),
      );
      const correct = labeled.filter(
        (session) => session.predictions.get(question.id) === session.label,
      ).length;
      return {
        id: question.id,
        text: question.text,
        reached: reached.length,
        answered: reached.filter((session) => session.answered.has(question.id))
          .length,
        inactiveReached: inactive.length,
        dropoffs,
        dropoff: inactive.length ? dropoffs / inactive.length : null,
        labeled: labeled.length,
        correct,
        unclassified: labeled.filter(
          (session) => !session.predictions.get(question.id),
        ).length,
        accuracy: labeled.length ? correct / labeled.length : null,
      };
    }),
  };
}
