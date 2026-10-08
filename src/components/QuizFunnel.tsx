import { useEffect, useRef, type RefObject } from "react";
import landings from "../data/quiz-landings.json";
import { quizQuestionRange } from "../lib/quiz";
import { useQuizFunnel, type QuizController } from "./useQuizFunnel";

type ViewProps = {
  quiz: QuizController;
  heading: RefObject<HTMLHeadingElement | null>;
};

function ChoiceInputs({ quiz }: { quiz: QuizController }) {
  return (
    <fieldset
      className="quiz-options"
      aria-labelledby="quiz-question-title"
      disabled={!quiz.ready || quiz.busy}
    >
      <legend className="quiz-sr-only">Choose one answer</legend>
      {quiz.options.map((option) => (
        <label
          className={`quiz-option${quiz.draft === option.id ? " is-selected" : ""}`}
          key={option.id}
        >
          <input
            type="radio"
            name="answer"
            value={option.id}
            required
            checked={quiz.draft === option.id}
            onChange={() => quiz.setDraft(option.id)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
function WrittenInput({ quiz }: { quiz: QuizController }) {
  return (
    <div className="quiz-written">
      <textarea
        id="quiz-written"
        aria-labelledby="quiz-question-title"
        aria-describedby={
          quiz.question.supporting_text ? "quiz-question-help" : undefined
        }
        required
        maxLength={2000}
        rows={5}
        value={quiz.draft}
        disabled={!quiz.ready || quiz.busy}
        onChange={(event) => quiz.setDraft(event.target.value)}
      />
      <p className="quiz-small">{quiz.draft.length}/2000 characters</p>
    </div>
  );
}
function QuestionActions({ quiz }: { quiz: QuizController }) {
  return (
    <div className="quiz-actions">
      <button
        type="button"
        className="quiz-back"
        disabled={quiz.path.length === 1 || quiz.busy}
        onClick={quiz.back}
      >
        ← Back
      </button>
      <button
        className="quiz-primary"
        type="submit"
        disabled={!quiz.ready || quiz.busy || !quiz.draft.trim()}
      >
        {quiz.busy ? "Working…" : "Continue"}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
function QuizQuestion({ quiz, heading }: ViewProps) {
  const range = quizQuestionRange(quiz.path);
  const total =
    range.min === range.max ? `${range.max}` : `${range.min}–${range.max}`;
  return (
    <>
      <div className="quiz-progress">
        <span>
          Question {quiz.path.length} of {total}
        </span>
        <progress
          aria-label="Quiz progress"
          aria-valuetext={`${quiz.path.length - 1} answered; ${total} questions total`}
          max={range.max}
          value={quiz.path.length - 1}
        />
      </div>
      <form onSubmit={quiz.submit} data-question-id={quiz.question.id}>
        <h1 ref={heading} tabIndex={-1} id="quiz-question-title">
          {quiz.question.text}
        </h1>
        {quiz.question.supporting_text && (
          <p id="quiz-question-help" className="quiz-lede">
            {quiz.question.supporting_text}
          </p>
        )}
        {quiz.question.type === "choice" ? (
          <ChoiceInputs quiz={quiz} />
        ) : (
          <WrittenInput quiz={quiz} />
        )}
        <QuestionActions quiz={quiz} />
      </form>
    </>
  );
}
function QuizLanding({ quiz, heading }: ViewProps) {
  const selected = quiz.selected!;
  const landing = landings[selected];
  return (
    <div id={`landing_${selected}`}>
      <h1 ref={heading} tabIndex={-1}>
        {landing.title}
      </h1>
      <div className="quiz-offer">
        <h2>{landing.offer}</h2>
        <p>{landing.description}</p>
        <a
          className="quiz-primary"
          href={selected === "OS" ? "/intake/" : "/contact/"}
          onClick={() =>
            quiz.capture("quiz_cta_clicked", {
              archetype: selected,
              probabilities: quiz.classification?.probabilities,
              scoring_source: "jev",
            })
          }
        >
          {landing.cta}
          <span aria-hidden="true">↗</span>
        </a>
      </div>
      <button className="quiz-back" onClick={quiz.back}>
        ← Change my answers
      </button>
    </div>
  );
}

export default function QuizFunnel({
  token,
  host,
}: {
  token?: string;
  host?: string;
}) {
  const quiz = useQuizFunnel(token, host);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [quiz.question.id, quiz.selected]);
  return (
    <div className="quiz-frame">
      <section className="quiz-panel" aria-label="Rancher quiz">
        {quiz.selected ? (
          <QuizLanding quiz={quiz} heading={heading} />
        ) : (
          <QuizQuestion quiz={quiz} heading={heading} />
        )}
        <p className="quiz-notice" role="status">
          {quiz.notice}
        </p>
      </section>
    </div>
  );
}
