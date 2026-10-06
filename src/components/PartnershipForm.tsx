import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type SubmitEvent,
} from "react";
import { useScenario } from "../lib/scenario";
import { HISTORY_RANGES, RECORD_TYPES, TEAM_SIZES } from "../lib/submission";
import { EMPLOYEES } from "../lib/estimate";
import { trackEvent } from "../lib/analytics";
function historyRange(years: number) {
  if (years <= 5) return "3–5 years";
  if (years <= 10) return "6–10 years";
  if (years <= 15) return "11–15 years";
  if (years < 20) return "16–19 years";
  return "20+ years";
}

function PartnershipFields({
  size,
  setSize,
  history,
  setHistory,
  recordTypes,
  setRecordTypes,
}: {
  size: string;
  setSize: Dispatch<SetStateAction<string>>;
  history: string;
  setHistory: Dispatch<SetStateAction<string>>;
  recordTypes: string[];
  setRecordTypes: Dispatch<SetStateAction<string[]>>;
}) {
  return (
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
      <label>
        US phone number <span className="optional">Optional</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(555) 555-0123"
          maxLength={40}
        />
      </label>
      <label className="full">
        Anything else to know? <span className="optional">Optional</span>
        <textarea
          name="records"
          placeholder="Share any additional context."
          maxLength={2000}
        ></textarea>
      </label>
    </div>
  );
}

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
    setHistory(historyRange(years));
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
      phone: String(fields.get("phone") ?? "").trim(),
      communicationsConsent: fields.get("communications_consent") === "yes",
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
      if (
        !response.ok ||
        typeof result.redirectUrl !== "string" ||
        typeof result.referralBonusUsd !== "number" ||
        typeof result.domain !== "string"
      )
        throw new Error(
          result.error || "We could not save your request. Please try again.",
        );
      window.posthog?.identify(payload.email, {
        email: payload.email,
        domain: result.domain,
        job_title: payload.title,
        phone: result.phone || undefined,
        communications_consent: payload.communicationsConsent,
      });
      const [firstName, ...lastNameParts] = payload.name.split(/\s+/);
      trackEvent(
        "partnership_request_submitted",
        {
          submission_id: submissionKey.current.key,
          name: payload.name,
          email: payload.email,
          domain: result.domain,
          job_title: payload.title,
          company: payload.company,
          company_size: payload.size,
          data_history: payload.history,
          record_types: payload.recordTypes,
          additional_context: payload.records,
          phone: result.phone,
          communications_consent: payload.communicationsConsent,
          referral_bonus_usd: result.referralBonusUsd,
          calculator_scenario: payload.scenario,
        },
        {
          eventId: submissionKey.current.key,
          userData: {
            emailAddress: payload.email,
            firstName,
            lastName: lastNameParts.join(" ") || undefined,
          },
        },
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
        <PartnershipFields
          size={size}
          setSize={setSize}
          history={history}
          setHistory={setHistory}
          recordTypes={recordTypes}
          setRecordTypes={setRecordTypes}
        />
        <label className="consent">
          <input type="checkbox" name="communications_consent" value="yes" />
          <span>
            Yes, B2B SaaS Inc. DBA Rancher may call or text me at the number
            provided about my partnership request and related opportunities,
            including through automated technology, artificial or prerecorded
            voice, and AI-generated voice. Consent is not a condition of
            submitting this request. Message and data rates may apply. Message
            frequency varies. Reply STOP to opt out or HELP for help.
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
