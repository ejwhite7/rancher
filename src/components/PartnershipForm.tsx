import type { FormContent } from "../lib/content";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useScenario } from "../lib/scenario";
import { HISTORY_RANGES, RECORD_TYPES, TEAM_SIZES } from "../lib/submission";
import { EMPLOYEES } from "../lib/estimate";
import { trackEvent } from "../lib/analytics";
import {
  attributionFromForm,
  attributionPersonProperties,
} from "../lib/attribution";
import AttributionFields from "./AttributionFields";
export default function PartnershipForm({ copy }: { copy: FormContent }) {
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
      phone: String(fields.get("phone") ?? "").trim(),
      communicationsConsent: fields.get("communications_consent") === "yes",
      website: String(fields.get("website") ?? ""),
      attribution: attributionFromForm(form),
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
        typeof result.domain !== "string" ||
        typeof result.consentVersion !== "string" ||
        (result.consentRecordedAt !== null &&
          typeof result.consentRecordedAt !== "string")
      )
        throw new Error(result.error || copy.save_error);
      const [firstName, ...lastNameParts] = payload.name.split(/\s+/);
      window.posthog?.identify(payload.email, {
        email: payload.email,
        first_name: firstName,
        last_name: lastNameParts.join(" "),
        domain: result.domain,
        job_title: payload.title,
        company: payload.company,
        phone: result.phone || undefined,
        communications_consent: payload.communicationsConsent,
        consent_version: result.consentVersion,
        consent_recorded_at: result.consentRecordedAt,
      });
      trackEvent(
        "partnership_request_submitted",
        {
          submission_id: submissionKey.current.key,
          name: payload.name,
          first_name: firstName,
          last_name: lastNameParts.join(" "),
          email: payload.email,
          domain: result.domain,
          job_title: payload.title,
          company: payload.company,
          company_size: payload.size,
          rancher_company_size: payload.size,
          data_history: payload.history,
          record_types: payload.recordTypes,
          additional_context: payload.records,
          phone: result.phone,
          communications_consent: payload.communicationsConsent,
          consent_version: result.consentVersion,
          consent_recorded_at: result.consentRecordedAt,
          referral_bonus_usd: result.referralBonusUsd,
          calculator_scenario: payload.scenario,
          attribution: payload.attribution,
        },
        {
          eventId: submissionKey.current.key,
          personProperties: {
            setOnce: {
              ...attributionPersonProperties(
                "attribution_first",
                payload.attribution.first,
              ),
              ...attributionPersonProperties(
                "partnership_first",
                payload.attribution.first,
              ),
              ...attributionPersonProperties(
                "partnership_last",
                payload.attribution.last,
              ),
            },
          },
          userData: {
            emailAddress: payload.email,
            firstName,
            lastName: lastNameParts.join(" ") || undefined,
          },
        },
      );
      setStatus(copy.success);
      window.location.assign(result.redirectUrl);
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? copy.network_error
          : error instanceof Error
            ? error.message
            : copy.unknown_error,
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
        <h3>{copy.title}</h3>
        <p id="calc-context" role="status">
          {scenario?.brief}
        </p>
        <p>{copy.description}</p>
        <AttributionFields />
        <div className="form-honeypot" aria-hidden="true">
          <label>
            {copy.honeypot_label}
            <input name="website" autoComplete="off" tabIndex={-1} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            {copy.name_label}
            <input
              name="name"
              autoComplete="name"
              placeholder={copy.name_placeholder}
              required
              maxLength={120}
            />
          </label>
          <label>
            {copy.email_label}
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder={copy.email_placeholder}
              required
              maxLength={180}
            />
          </label>
          <label>
            {copy.job_title_label}
            <input
              name="title"
              autoComplete="organization-title"
              placeholder={copy.job_title_placeholder}
              required
              maxLength={120}
            />
          </label>
          <label>
            {copy.company_label}
            <input
              name="company"
              autoComplete="organization"
              placeholder={copy.company_placeholder}
              required
              maxLength={180}
            />
          </label>
          <label>
            {copy.size_label}
            <select
              name="size"
              required
              value={size}
              onChange={(event) => setSize(event.target.value)}
            >
              <option value="">{copy.select_placeholder}</option>
              {TEAM_SIZES.map((range) => (
                <option key={range}>{range}</option>
              ))}
            </select>
          </label>
          <label>
            {copy.history_label}
            <select
              name="history"
              required
              value={history}
              onChange={(event) => setHistory(event.target.value)}
            >
              <option value="">{copy.select_placeholder}</option>
              {HISTORY_RANGES.map((range) => (
                <option key={range}>{range}</option>
              ))}
            </select>
          </label>
          <fieldset className="record-types full">
            <legend>{copy.records_label}</legend>
            <p>{copy.records_hint}</p>
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
            {copy.context_label}{" "}
            <span className="optional">{copy.optional_label}</span>
            <textarea
              name="records"
              placeholder={copy.context_placeholder}
              maxLength={2000}
            ></textarea>
          </label>
        </div>
        <label className="consent">
          <input type="checkbox" name="communications_consent" value="yes" />
          <span>{copy.consent}</span>
        </label>
        <button className="btn" type="submit" disabled={!ready || submitting}>
          {submitting ? copy.submitting_label : copy.submit_label}{" "}
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
        <p>{copy.no_javascript}</p>
      </noscript>
    </>
  );
}
