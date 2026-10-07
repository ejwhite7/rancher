import { useState, type SubmitEvent } from "react";
import type { QuizMetrics } from "../lib/quiz-metrics";

type Metrics = QuizMetrics & { days: number; generatedAt: string };
const percent = (value: number | null) =>
  value === null ? "—" : `${Math.round(value * 100)}%`;

export default function QuizDashboard({
  questions,
  archetypes,
}: {
  questions: { id: string; text: string }[];
  archetypes: { id: string; label: string }[];
}) {
  const [token, setToken] = useState("");
  const [days, setDays] = useState(30);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [archetype, setArchetype] = useState(archetypes[0].id);
  const [independent, setIndependent] = useState(false);

  async function call(method: "GET" | "POST") {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/quiz/dashboard/?days=${days}`, {
        method,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        },
        ...(method === "POST"
          ? {
              body: JSON.stringify({
                sessionId: sessionId.trim(),
                archetype,
                confirmedIndependent: independent,
              }),
            }
          : {}),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 503)
          setMetrics(null);
        throw new Error(data.error || "Dashboard request failed.");
      }
      if (method === "GET") setMetrics(data);
      else {
        setNotice(data.message);
        setSessionId("");
        setIndependent(false);
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Dashboard is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  function load(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void call("GET");
  }
  function verify(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void call("POST");
  }
  function lock() {
    setToken("");
    setMetrics(null);
    setNotice("");
    setSessionId("");
    setIndependent(false);
  }

  return (
    <details className="quiz-dashboard">
      <summary>
        Staff analytics <span>Protected · PostHog</span>
      </summary>
      <div className="quiz-dashboard-content">
        <h2>Which questions are doing the work?</h2>
        <p>
          Consented quiz sessions only. This reads the configured Rancher
          PostHog project, not demonstration data.
        </p>
        <form onSubmit={load} className="quiz-dashboard-auth">
          <label>
            Staff access token
            <input
              type="password"
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                setMetrics(null);
              }}
              required
              minLength={32}
              autoComplete="off"
            />
          </label>
          <label>
            Reporting window
            <select
              value={days}
              onChange={(event) => {
                setDays(Number(event.target.value));
                setMetrics(null);
              }}
            >
              <option value={1}>Last day</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </label>
          <button className="quiz-primary" disabled={busy}>
            {busy ? "Loading…" : "Load dashboard"}
          </button>
          {metrics && (
            <button type="button" className="quiz-back" onClick={lock}>
              Lock dashboard
            </button>
          )}
        </form>
        <p className="quiz-notice" role="status">
          {notice}
        </p>
        {metrics && (
          <>
            <dl className="quiz-stats">
              <div>
                <dt>Sessions</dt>
                <dd>{metrics.sessions}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{metrics.completed}</dd>
              </div>
              <div>
                <dt>Independently labeled</dt>
                <dd>{metrics.verified}</dd>
              </div>
            </dl>
            <div
              className="quiz-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Per-question analytics, scroll horizontally if needed"
            >
              <table>
                <caption>
                  Last {metrics.days} days ·{" "}
                  {new Date(metrics.generatedAt).toLocaleString()}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Question</th>
                    <th scope="col">Reached</th>
                    <th scope="col">Answered</th>
                    <th scope="col">Drop-off</th>
                    <th scope="col">Accuracy</th>
                    <th scope="col">Verified answers</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.questions.map((question) => (
                    <tr key={question.id}>
                      <th scope="row">
                        <small>{question.id}</small>
                        {questions.find((item) => item.id === question.id)
                          ?.text || question.text}
                      </th>
                      <td>{question.reached}</td>
                      <td>{question.answered}</td>
                      <td>
                        {percent(question.dropoff)}
                        <small>
                          {question.dropoffs}/{question.inactiveReached}{" "}
                          inactive
                        </small>
                      </td>
                      <td>
                        {question.accuracy === null
                          ? "Not measured"
                          : percent(question.accuracy)}
                        <small>
                          {question.unclassified
                            ? `${question.unclassified} unclassified`
                            : ""}
                        </small>
                      </td>
                      <td>
                        {question.labeled}
                        <small>{question.correct} correct</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="quiz-small">
              Drop-off counts inactive sessions (no prospect event for 30
              minutes) that reached but never answered a question. Accuracy uses
              the latest non-invalidated prediction against an independent
              reviewer’s label. Self-selection and confidence are not ground
              truth. Small samples and analytics opt-in affect interpretation.
            </p>
            <details className="quiz-review">
              <summary>Add an independently verified label</summary>
              <p>
                Use evidence beyond the quiz answers—such as a reviewed
                conversation or CRM record. Do not copy the visitor’s selected
                path. Labels may be revised after new evidence.
              </p>
              <form onSubmit={verify}>
                <label>
                  Anonymous quiz session ID
                  <input
                    value={sessionId}
                    onChange={(event) => setSessionId(event.target.value)}
                    required
                    placeholder="UUID from an opted-in session"
                  />
                </label>
                <label>
                  Verified archetype
                  <select
                    value={archetype}
                    onChange={(event) => setArchetype(event.target.value)}
                  >
                    {archetypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="quiz-consent">
                  <input
                    type="checkbox"
                    required
                    checked={independent}
                    onChange={(event) => setIndependent(event.target.checked)}
                  />
                  <span>
                    I independently reviewed evidence; this is not merely the
                    quiz’s recommendation or the visitor’s selection.
                  </span>
                </label>
                <button
                  className="quiz-primary"
                  disabled={busy || !independent}
                >
                  Save verified label
                </button>
              </form>
            </details>
          </>
        )}
      </div>
    </details>
  );
}
