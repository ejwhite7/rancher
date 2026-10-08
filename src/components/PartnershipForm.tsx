import type { FormContent } from "../lib/content";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  type SubmitEvent,
} from "react";
import { useScenario } from "../lib/scenario";
import { HISTORY_RANGES, RECORD_TYPES, TEAM_SIZES } from "../lib/submission";
import { EMPLOYEES } from "../lib/estimate";
import { trackEvent } from "../lib/analytics";
import {
  attributionFromForm,
  attributionPersonProperties,
} from "../lib/attribution";
import AttributionFields from "./AttributionFields";
import {
  INTAKE_STEPS,
  intakePrefill,
  useIntakeWizard,
} from "./useIntakeWizard";
function historyRange(years: number) {
  if (years <= 5) return "3–5 years";
  if (years <= 10) return "6–10 years";
  if (years <= 15) return "11–15 years";
  if (years < 20) return "16–19 years";
  return "20+ years";
}

function PartnershipIdentityFields({ copy }: { copy: FormContent }) {
  return (
    <>
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
    </>
  );
}

function submissionPayload(
  form: HTMLFormElement,
  scenario: ReturnType<typeof useScenario>,
) {
  const fields = new FormData(form);
  return {
    name: String(fields.get("name") ?? "").trim(),
    email: String(fields.get("email") ?? "").trim(),
    title: String(fields.get("title") ?? "").trim(),
    company: String(fields.get("company") ?? "").trim(),
    size: String(fields.get("size") ?? ""),
    history: String(fields.get("history") ?? ""),
    isBusinessActive: fields.get("is_business_active") === "yes",
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
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function hasSubmissionResultFields(result: any) {
  if (!isNullableString(result.redirectUrl)) return false;
  if (!isNullableString(result.message)) return false;
  if (typeof result.qualifies !== "boolean") return false;
  if (typeof result.qualificationStatus !== "string") return false;
  if (typeof result.referralBonusUsd !== "number") return false;
  if (typeof result.domain !== "string") return false;
  if (typeof result.consentVersion !== "string") return false;
  return isNullableString(result.consentRecordedAt);
}

async function postSubmission(
  payload: ReturnType<typeof submissionPayload>,
  idempotencyKey: string,
  saveError: string,
) {
  let posthogSessionId: string | undefined;
  try {
    posthogSessionId = window.posthog?.get_session_id?.();
  } catch {
    // Optional session attribution must not prevent saving the request.
  }
  const response = await fetch("/api/submissions/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(posthogSessionId ? { "X-PostHog-Session-Id": posthogSessionId } : {}),
    },
    body: JSON.stringify({
      ...payload,
      idempotencyKey,
    }),
  });
  const result = await response.json();
  if (!response.ok || !hasSubmissionResultFields(result))
    throw new Error(result.error || saveError);
  return result;
}

function trackPartnershipSubmission(
  payload: ReturnType<typeof submissionPayload>,
  result: Awaited<ReturnType<typeof postSubmission>>,
  idempotencyKey: string,
) {
  const [firstName, ...lastNameParts] = payload.name.split(/\s+/);
  try {
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
  } catch {
    // A failed identify must not suppress the separate conversion event.
  }
  trackEvent(
    "partnership_request_submitted",
    {
      submission_id: idempotencyKey,
      name: payload.name,
      first_name: firstName,
      last_name: lastNameParts.join(" "),
      email: payload.email,
      domain: result.domain,
      job_title: payload.title,
      company: payload.company,
      company_size: payload.size,
      rancher_company_size: payload.size,
      qualifies: result.qualifies,
      qualification_status: result.qualificationStatus,
      data_history: payload.history,
      is_business_active: payload.isBusinessActive,
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
      eventId: idempotencyKey,
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
      capturePostHog: false,
    },
  );
}

function RecordTypeFields({
  copy,
  recordTypes,
  setRecordTypes,
}: {
  copy: FormContent;
  recordTypes: string[];
  setRecordTypes: Dispatch<SetStateAction<string[]>>;
}) {
  return (
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
  );
}

function PartnershipIntro({
  copy,
  wizard,
  scenario,
}: {
  copy: FormContent;
  wizard: boolean;
  scenario: ReturnType<typeof useScenario>;
}) {
  return (
    <>
      {" "}
      {!wizard && <h3>{copy.title}</h3>}
      <p id="calc-context" role="status" hidden={wizard && !scenario?.brief}>
        {scenario?.brief}
      </p>
      {!wizard && <p>{copy.description}</p>}
    </>
  );
}

function useCalculatorDefaults(
  wizard: boolean,
  scenario: ReturnType<typeof useScenario>,
  setSize: Dispatch<SetStateAction<string>>,
  setHistory: Dispatch<SetStateAction<string>>,
) {
  useEffect(() => {
    if (!scenario) return;
    const { employees, years } = scenario;
    // The 200+ slider limit does not identify an actual team-size band.
    const scenarioSize =
      employees === EMPLOYEES.max ? "" : employees < 50 ? "20–49" : "50–199";
    setSize((current) => (wizard && current ? current : scenarioSize));
    setHistory((current) =>
      wizard && current ? current : historyRange(years),
    );
  }, [scenario, wizard, setSize, setHistory]);
}

function PartnershipFields({
  copy,
  size,
  setSize,
  history,
  setHistory,
  recordTypes,
  setRecordTypes,
  step,
}: {
  step?: number;
  copy: FormContent;
  size: string;
  setSize: Dispatch<SetStateAction<string>>;
  history: string;
  setHistory: Dispatch<SetStateAction<string>>;
  recordTypes: string[];
  setRecordTypes: Dispatch<SetStateAction<string[]>>;
}) {
  return (
    <>
      <div
        className="form-grid"
        data-step="0"
        hidden={step !== undefined && step !== 0}
      >
        <PartnershipIdentityFields copy={copy} />
      </div>
      <div
        className="form-grid"
        data-step="1"
        hidden={step !== undefined && step !== 1}
      >
        <label>
          {copy.size_label.replace(
            /Company size \(full-time employees\)/i,
            "Company Size (FTE Count)",
          )}
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
        <label className="consent full">
          <input type="checkbox" name="is_business_active" value="yes" />
          <span>Is this business active?</span>
        </label>
        <RecordTypeFields
          copy={copy}
          recordTypes={recordTypes}
          setRecordTypes={setRecordTypes}
        />
      </div>
      <div
        className="form-grid"
        data-step="2"
        hidden={step !== undefined && step !== 2}
      >
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
        {step === undefined && (
          <label className="full">
            {copy.context_label}{" "}
            <span className="optional">{copy.optional_label}</span>
            <textarea
              name="records"
              placeholder={copy.context_placeholder}
              maxLength={2000}
            ></textarea>
          </label>
        )}
      </div>
    </>
  );
}

function usePartnershipSubmission(
  copy: FormContent,
  scenario: ReturnType<typeof useScenario>,
) {
  const [status, setStatus] = useState("");
  const [doesNotQualify, setDoesNotQualify] = useState(false);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const submissionKey = useRef<{ payload: string; key: string } | null>(null);
  useEffect(() => setReady(true), []);
  async function submitRequest(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const payload = submissionPayload(form, scenario);
    const serialized = JSON.stringify(payload);
    if (submissionKey.current?.payload !== serialized)
      submissionKey.current = { payload: serialized, key: crypto.randomUUID() };
    pending.current = true;
    setSubmitting(true);
    setStatus("");
    try {
      const result = await postSubmission(
        payload,
        submissionKey.current.key,
        copy.save_error,
      );
      try {
        trackPartnershipSubmission(payload, result, submissionKey.current.key);
      } catch {
        // Delivery is confirmed; analytics must not turn it into a retry or block booking.
      }
      setStatus(result.message || copy.success);
      setDoesNotQualify(!result.qualifies);
      if (result.qualifies && result.redirectUrl)
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
  return { status, doesNotQualify, ready, submitting, submitRequest };
}

function usePartnershipFields(
  wizard: boolean,
  scenario: ReturnType<typeof useScenario>,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const [size, setSize] = useState("");
  const [history, setHistory] = useState("");
  const [recordTypes, setRecordTypes] = useState<string[]>([]);
  useEffect(() => {
    if (!wizard || !formRef.current) return;
    const prefill = intakePrefill(formRef.current);
    setSize((current) => current || prefill.size);
    setHistory((current) => current || prefill.history);
    setRecordTypes((current) =>
      current.length ? current : prefill.recordTypes,
    );
  }, [wizard]);
  useCalculatorDefaults(wizard, scenario, setSize, setHistory);
  return {
    formRef,
    size,
    setSize,
    history,
    setHistory,
    recordTypes,
    setRecordTypes,
  };
}

function WizardProgress({
  step,
  heading,
}: {
  step: number;
  heading: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="wizard-progress">
      <p aria-live="polite">
        Step {step + 1} of {INTAKE_STEPS.length}
      </p>
      <progress
        aria-label="Intake progress"
        value={step + 1}
        max={INTAKE_STEPS.length}
      />
      <h4 ref={heading} tabIndex={-1}>
        {INTAKE_STEPS[step]}
      </h4>
    </div>
  );
}

function PartnershipActions({
  copy,
  wizard,
  step,
  ready,
  submitting,
  back,
}: {
  copy: FormContent;
  wizard: boolean;
  step: number;
  ready: boolean;
  submitting: boolean;
  back: () => void;
}) {
  const label = wizard
    ? step < INTAKE_STEPS.length - 1
      ? "Continue"
      : "Submit"
    : copy.submit_label;
  return (
    <div className="wizard-actions">
      {wizard && step > 0 && (
        <button
          className="btn btn-secondary"
          type="button"
          disabled={submitting}
          onClick={back}
        >
          Back
        </button>
      )}
      <button className="btn" type="submit" disabled={!ready || submitting}>
        {submitting ? copy.submitting_label : label}
        {!wizard && <span aria-hidden="true">↗</span>}
      </button>
    </div>
  );
}

export default function PartnershipForm({
  copy,
  wizard = false,
}: {
  copy: FormContent;
  wizard?: boolean;
}) {
  const scenario = useScenario();
  const { formRef, ...fields } = usePartnershipFields(wizard, scenario);
  const { status, doesNotQualify, ready, submitting, submitRequest } =
    usePartnershipSubmission(copy, scenario);
  const { step, stepHeading, advance, back } = useIntakeWizard(
    wizard,
    ready,
    submitting,
    submitRequest,
  );
  return (
    <>
      <form
        className={`form${wizard ? " intake-wizard" : ""}${doesNotQualify ? " form--nonqualifying" : ""}`}
        id="intake"
        ref={formRef}
        autoComplete="on"
        noValidate={wizard}
        onSubmit={advance}
        aria-busy={submitting}
      >
        <PartnershipIntro copy={copy} wizard={wizard} scenario={scenario} />
        {wizard && <WizardProgress step={step} heading={stepHeading} />}
        <AttributionFields />
        <div className="form-honeypot" aria-hidden="true">
          <label>
            {copy.honeypot_label}
            <input name="website" autoComplete="off" tabIndex={-1} />
          </label>
        </div>
        <PartnershipFields
          copy={copy}
          step={wizard ? step : undefined}
          {...fields}
        />
        <label
          className="consent"
          hidden={wizard && step !== INTAKE_STEPS.length - 1}
        >
          <input type="checkbox" name="communications_consent" value="yes" />
          <span>{copy.consent}</span>
        </label>
        <PartnershipActions
          copy={copy}
          wizard={wizard}
          step={step}
          ready={ready}
          submitting={submitting}
          back={back}
        />
        <div
          className={`status${doesNotQualify ? " status--nonqualifying" : ""}`}
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
