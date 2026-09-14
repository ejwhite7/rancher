import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useScenario } from "../lib/scenario";
import { HISTORY_RANGES, RECORD_TYPES, TEAM_SIZES } from "../lib/submission";
import { EMPLOYEES } from "../lib/estimate";
export default function PartnershipForm() {
  const scenario = useScenario();
  const [size, setSize] = useState("");
  const [history, setHistory] = useState("");
  const [recordTypes, setRecordTypes] = useState<string[]>([]);
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
      employees === EMPLOYEES.max ? "" : employees < 50 ? "20–49" : "50–199",
    );
    setHistory(
      years <= 5
        ? "3–5 years"
        : years <= 10
          ? "6–10 years"
          : years <= 15
            ? "11–15 years"
            : years < 20
              ? "16–19 years"
              : "20+ years",
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
      title: String(fields.get("title") ?? "").trim(),
      company: String(fields.get("company") ?? "").trim(),
      size: String(fields.get("size") ?? ""),
      history: String(fields.get("history") ?? ""),
      recordTypes: fields.getAll("recordTypes").map(String),
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
      window.posthog?.identify(payload.email, {
        email: payload.email,
        job_title: payload.title,
      });
      window.posthog?.capture("partnership_request_submitted", {
        job_title: payload.title,
        team_size_range: payload.size,
        data_history_range: payload.history,
        calculator_scenario_used: payload.scenario !== null,
      });
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
          <label>
            Job title
            <input
              name="title"
              autoComplete="organization-title"
              placeholder="Your role"
              required
              maxLength={120}
            />
          </label>
          <label>
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
            Company size (full-time employees)
            <select
              name="size"
              required
              value={size}
              onChange={(event) => setSize(event.target.value)}
            >
              <option value="">Select range</option>
              {TEAM_SIZES.map((range) => (
                <option key={range}>{range}</option>
              ))}
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
              {HISTORY_RANGES.map((range) => (
                <option key={range}>{range}</option>
              ))}
            </select>
          </label>
          <fieldset className="record-types full">
            <legend>What types of records could be in scope?</legend>
            <p>Select all that apply. Choose at least one.</p>
            <div className="record-type-options">
              {RECORD_TYPES.map((type, index) => (
                <label key={type}>
                  <input
                    type="checkbox"
                    name="recordTypes"
                    value={type}
                    checked={recordTypes.includes(type)}
                    required={index === 0 && recordTypes.length === 0}
                    onChange={(event) =>
                      setRecordTypes((current) =>
                        event.target.checked
                          ? [...current, type]
                          : current.filter((value) => value !== type),
                      )
                    }
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="full">
            Anything else to know?
            <textarea
              name="records"
              required
              placeholder="Share any additional context, or enter None."
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
