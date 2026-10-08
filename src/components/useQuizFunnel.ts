import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  type SubmitEvent,
} from "react";
import {
  invalidateAfter,
  nextQuestion,
  questionById,
  quiz,
  shuffledOptions,
  type Question,
  type Answers,
  type Classification,
} from "../lib/quiz";
import {
  CLASSIFICATION_ERROR,
  requestClassification,
} from "../lib/quiz-classification";
import { useQuizAnalytics } from "./useQuizAnalytics";

export type QuizState = {
  answers: Answers;
  cached: Answers;
  path: string[];
  draft: string;
  classification: Classification | null;
  completed: boolean;
  ready: boolean;
  busy: boolean;
  notice: string;
};
export const initialQuizState: QuizState = {
  answers: {},
  cached: {},
  path: ["q1"],
  draft: "",
  classification: null,
  completed: false,
  ready: false,
  busy: false,
  notice: "",
};
type Update = Dispatch<SetStateAction<QuizState>>;
type Analytics = ReturnType<typeof useQuizAnalytics>;
const currentId = (state: QuizState) => state.path[state.path.length - 1];
const position = (state: QuizState) => ({
  question_id: currentId(state),
  step: state.path.length,
});

export function advanceQuiz(
  state: QuizState,
  result: Classification,
): QuizState {
  const id = currentId(state);
  const value = state.draft.trim();
  const answers = { ...state.answers, [id]: value };
  const edited = Object.hasOwn(state.cached, id) && state.cached[id] !== value;
  const cached = edited ? { ...answers } : { ...state.cached, ...answers };
  const next = nextQuestion(id, answers, result);
  return {
    ...state,
    answers,
    cached,
    classification: result,
    busy: false,
    notice: "",
    completed: next === null,
    path: next ? [...state.path, next] : state.path,
    draft: next ? cached[next] || "" : state.draft,
  };
}
export function rewindQuiz(state: QuizState): QuizState {
  const target = state.completed
    ? state.path.length - 1
    : state.path.length - 2;
  if (target < 0) return state;
  const cached = { ...state.cached, ...state.answers };
  if (!state.completed) cached[currentId(state)] = state.draft;
  const updated = invalidateAfter(state.answers, state.path, target);
  return {
    ...state,
    answers: updated.answers,
    path: updated.path,
    cached,
    draft: cached[updated.path[target]] || "",
    completed: false,
    classification: null,
    notice: "",
  };
}
function predictionProperties(result: Classification) {
  return {
    probabilities: result.probabilities,
    predicted_archetype: result.top,
    scoring_source: "jev",
    classifier_model: result.model,
    classifier_confidence: result.confidence,
  };
}
function recordAnswer(
  analytics: Analytics,
  previous: QuizState,
  next: QuizState,
  result: Classification,
) {
  const properties = predictionProperties(result);
  analytics.capture("quiz_answered", {
    ...position(previous),
    answer: previous.draft.trim(),
    answers: next.answers,
    ...properties,
  });
  if (next.completed) {
    analytics.capture("quiz_completed", {
      archetype: result.top,
      answers: next.answers,
      ...properties,
    });
    return;
  }
  analytics.capture("quiz_question_viewed", {
    ...position(next),
    ...properties,
  });
}
function failedSubmission(error: unknown) {
  if (!(error instanceof Error)) return CLASSIFICATION_ERROR;
  if (error.name === "TimeoutError") return CLASSIFICATION_ERROR;
  return error.message;
}
function canSubmit(state: QuizState) {
  if (!state.ready || state.busy) return false;
  if (state.completed) return false;
  return state.draft.trim().length > 0;
}
async function submitQuiz(
  event: SubmitEvent<HTMLFormElement>,
  state: QuizState,
  update: Update,
  analytics: Analytics,
  pending: RefObject<boolean>,
) {
  event.preventDefault();
  if (pending.current || !canSubmit(state)) return;
  pending.current = true;
  update((previous) => ({ ...previous, busy: true, notice: "" }));
  try {
    const result = await requestClassification({
      ...state.answers,
      [currentId(state)]: state.draft.trim(),
    });
    const next = advanceQuiz(state, result);
    analytics.position.current = position(next);
    update(next);
    recordAnswer(analytics, state, next, result);
  } catch (error) {
    update((previous) => ({
      ...previous,
      busy: false,
      notice: failedSubmission(error),
    }));
  } finally {
    pending.current = false;
  }
}
function navigateBack(
  state: QuizState,
  update: Update,
  analytics: Analytics,
  pending: RefObject<boolean>,
) {
  if (pending.current) return;
  const next = rewindQuiz(state);
  if (next === state) return;
  analytics.position.current = position(next);
  update(next);
  const kept = new Set(next.path);
  analytics.capture("quiz_answers_invalidated", {
    invalidated_question_ids: Object.keys(state.answers).filter(
      (id) => !kept.has(id),
    ),
  });
  analytics.capture("quiz_question_viewed", position(next));
}
function useQuizAvailability(update: Update) {
  useEffect(() => {
    let active = true;
    const mark = (ready: boolean) => {
      if (!active) return;
      update((previous) => ({
        ...previous,
        ready,
        notice: ready
          ? ""
          : "The quiz is temporarily unavailable. Please try again later.",
      }));
    };
    fetch("/api/quiz/classify/", { cache: "no-store" })
      .then((response) => mark(response.ok))
      .catch(() => mark(false));
    return () => {
      active = false;
    };
  }, [update]);
}

export function useQuizFunnel(token?: string, host?: string) {
  const [state, update] = useState(initialQuizState);
  const pending = useRef(false);
  const [optionOrders, setOptionOrders] = useState<
    Record<string, Question["options"]>
  >({});
  // Shuffle after hydration, once per question per visit. Back and retries keep the same IDs/order.
  useEffect(() => {
    setOptionOrders(
      Object.fromEntries(
        quiz.questions.map((question) => [
          question.id,
          shuffledOptions(question.options),
        ]),
      ),
    );
  }, []);
  const analytics = useQuizAnalytics(token, host);
  useQuizAvailability(update);
  const question = questionById(currentId(state));
  const setDraft = (draft: string) =>
    update((previous) => ({ ...previous, draft }));
  const submit = (event: SubmitEvent<HTMLFormElement>) =>
    submitQuiz(event, state, update, analytics, pending);
  const back = () => navigateBack(state, update, analytics, pending);
  const selected = state.completed ? state.classification?.top : null;
  return {
    ...state,
    question,
    options: optionOrders[question.id] || question.options,
    selected,
    setDraft,
    submit,
    back,
    capture: analytics.capture,
  };
}
export type QuizController = ReturnType<typeof useQuizFunnel>;
