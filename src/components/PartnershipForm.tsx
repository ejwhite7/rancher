import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useScenario } from "../lib/scenario";
import { EMPLOYEES } from "../lib/estimate";
export default function PartnershipForm() {
  const scenario = useScenario();
  const [size, setSize] = useState("");
  const [history, setHistory] = useState("");
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const submissionKey = useRef<{ payload: string; key: string } | null>(null);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!scenario) return;
    const { employees, years } = scenario;
    setSize(
      // The 200+ slider limit does not identify an actual team-size band.
      employees === EMPLOYEES.max
        ? ""
        : employees <= 100
          ? "20–100"
          : "101–500",
    );
    setHistory(
      years <= 3 ? "1–3 years" : years <= 5 ? "3–5 years" : "5+ years",
    );
  }, [scenario]);
  async function submitRequest(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const payload = {
      name: String(fields.get("name") ?? "").trim(),
      email: String(fields.get("email") ?? "").trim(),
      company: String(fields.get("company") ?? "").trim(),
      size: String(fields.get("size") ?? ""),
      history: String(fields.get("history") ?? ""),
      records: String(fields.get("records") ?? "").trim(),
      outreachConsent: fields.get("outreach_consent") === "yes",
      website: String(fields.get("website") ?? ""),
      scenario: scenario
        ? {
            employees: scenario.employees,
            years: scenario.years,
            country: scenario.country,
          }
        : null,
    };
    const serialized = JSON.stringify(payload);
    if (submissionKey.current?.payload !== serialized)
      submissionKey.current = { payload: serialized, key: crypto.randomUUID() };
    pending.current = true;
    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/submissions/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...payload,
          idempotencyKey: submissionKey.current.key,
        }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.redirectUrl !== "string")
        throw new Error(
          result.error || "We could not save your request. Please try again.",
        );
      setStatus("Your request is saved. Opening the booking calendar…");
      window.location.assign(result.redirectUrl);
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? "Could not connect. Your entries are still here; please try again."
          : error instanceof Error
            ? error.message
            : "Please try again shortly.",
      );
      pending.current = false;
      setSubmitting(false);
    }
  }
  return (
    <>
      <form
        className="form"
        id="intake"
        onSubmit={submitRequest}
        aria-busy={submitting}
      >
        <h3>Explore a data partnership</h3>
        <p id="calc-context" role="status">
          {scenario?.brief}
        </p>
        <p>
          Share your details, then choose a time to explore a data partnership.
        </p>
        <div className="form-honeypot" aria-hidden="true">
          <label>
            Website
            <input name="website" autoComplete="off" tabIndex={-1} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Your name
            <input
              name="name"
              autoComplete="name"
              placeholder="Alex Morgan"
              required
              maxLength={120}
            />
          </label>
          <label>
            Work email
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="alex@company.com"
              required
              maxLength={180}
            />
          </label>
          <label className="full">
            Company
            <input
              name="company"
              autoComplete="organization"
              placeholder="Company name"
              required
              maxLength={180}
            />
          </label>
          <label>
            Team size
            <select
              name="size"
              required
              value={size}
              onChange={(event) => setSize(event.target.value)}
            >
              <option value="">Select range</option>
              <option>20–100</option>
              <option>101–500</option>
              <option>501–1,000</option>
              <option>1,001+</option>
            </select>
          </label>
          <label>
            Available data history
            <select
              name="history"
              required
              value={history}
              onChange={(event) => setHistory(event.target.value)}
            >
              <option value="">Select range</option>
              <option>Less than 1 year</option>
              <option>1–3 years</option>
              <option>3–5 years</option>
              <option>5+ years</option>
              <option>Not sure yet</option>
            </select>
          </label>
          <label className="full">
            What systems or records could be in scope?
            <textarea
              name="records"
              required
              placeholder="e.g. Project histories, support tickets, internal documentation…"
              maxLength={2000}
            ></textarea>
          </label>
        </div>
        <label className="consent">
          <input
            type="checkbox"
            name="outreach_consent"
            value="yes"
            defaultChecked
            required
          />
          <span>
            I consent to outreach from Rancher about data licensing
            opportunities.
          </span>
        </label>
        <button className="btn" type="submit" disabled={!ready || submitting}>
          {submitting ? "Submitting…" : "Submit & book a call"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
        <div
          className="status"
          id="form-status"
          role="status"
          aria-live="polite"
        >
          {status}
        </div>
      </form>
      <noscript>
        <p>Enable JavaScript to submit your request and book a call.</p>
      </noscript>
    </>
  );
}
