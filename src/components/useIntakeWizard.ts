import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { trackEvent } from "../lib/analytics";
import { HISTORY_RANGES, RECORD_TYPES, TEAM_SIZES } from "../lib/submission";

export const INTAKE_STEPS = [
  "Your details",
  "Business data",
  "Getting in Contact",
];
const normalize = (value: string) =>
  value.trim().toLowerCase().replaceAll("-", "–");

function queryValues(params: URLSearchParams, ...keys: string[]) {
  const key = [...keys, ...keys.map((key) => `utm_${key}`)].find((key) =>
    params.has(key),
  );
  return key ? params.getAll(key).map((value) => value.trim()) : [];
}

function prefillText(form: HTMLFormElement, params: URLSearchParams) {
  const value = (...keys: string[]) => queryValues(params, ...keys)[0] ?? "";
  const values = {
    name:
      value("name") ||
      [value("first_name"), value("last_name")].filter(Boolean).join(" "),
    email: value("email"),
    company: value("company"),
    title: value("title", "job_title"),
    phone: value("phone"),
  };
  for (const [name, prefill] of Object.entries(values)) {
    const input = form.elements.namedItem(name);
    if (!(input instanceof HTMLInputElement)) continue;
    if (!input.value && prefill)
      input.value = prefill.slice(0, input.maxLength);
  }
}

function prefillActive(form: HTMLFormElement, params: URLSearchParams) {
  const active = (
    queryValues(
      params,
      "is_business_active",
      "isBusinessActive",
      "business_active",
    )[0] ?? ""
  ).toLowerCase();
  const input = form.elements.namedItem("is_business_active");
  if (!(input instanceof HTMLInputElement)) return;
  if (["yes", "true", "1", "no", "false", "0"].includes(active))
    input.checked = ["yes", "true", "1"].includes(active);
}

export function intakePrefill(form: HTMLFormElement) {
  const params = new URLSearchParams(window.location.search);
  prefillText(form, params);
  prefillActive(form, params);
  const size = normalize(
    queryValues(params, "size", "company_size", "team_size")[0] ?? "",
  );
  const history = normalize(
    queryValues(params, "history", "data_history")[0] ?? "",
  );
  const types = queryValues(
    params,
    "recordTypes",
    "record_types",
    "recordTypes[]",
    "record_types[]",
  )
    .flatMap((value) => value.split(","))
    .map(normalize);
  // Consent and anti-spam/system fields are deliberately not URL-prefillable.
  return {
    size: TEAM_SIZES.find((value) => normalize(value) === size) ?? "",
    history: HISTORY_RANGES.find((value) => normalize(value) === history) ?? "",
    recordTypes: RECORD_TYPES.filter((value) =>
      types.includes(normalize(value)),
    ),
  };
}

function trackStep(event: string, step: number) {
  try {
    trackEvent(event, {
      form: "partnership",
      form_variant: "wizard",
      step_number: step + 1,
      step_name: INTAKE_STEPS[step],
      total_steps: INTAKE_STEPS.length,
    });
  } catch (error) {
    console.warn(
      "Intake step analytics unavailable",
      error instanceof Error ? error.name : "unknown",
    );
  }
}

function invalidControl(form: HTMLFormElement, step: number) {
  const group =
    step === INTAKE_STEPS.length - 1 ? "[data-step]" : `[data-step="${step}"]`;
  return [
    ...form.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(`${group} input, ${group} select, ${group} textarea`),
  ].find((control) => !control.checkValidity());
}

function reportInvalid(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  step: number,
  setStep: (step: number) => void,
) {
  const invalidStep = Number(
    control.closest<HTMLElement>("[data-step]")?.dataset.step,
  );
  if (invalidStep === step) {
    control.reportValidity();
    return;
  }
  setStep(invalidStep);
  requestAnimationFrame(() => control.reportValidity());
}

export function useIntakeWizard(
  wizard: boolean,
  ready: boolean,
  submitting: boolean,
  submitRequest: (event: SubmitEvent<HTMLFormElement>) => Promise<void>,
) {
  const [step, setStep] = useState(0);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const viewedStep = useRef<number | null>(null);
  const completed = useRef(new Set<number>());
  useEffect(() => {
    if (!wizard || !ready || viewedStep.current === step) return;
    if (viewedStep.current !== null)
      stepHeading.current?.focus({ preventScroll: true });
    viewedStep.current = step;
    trackStep("partnership_intake_step_viewed", step);
  }, [step, wizard, ready]);
  function advance(event: SubmitEvent<HTMLFormElement>) {
    if (!wizard) return submitRequest(event);
    event.preventDefault();
    if (submitting) return;
    const invalid = invalidControl(event.currentTarget, step);
    if (invalid) {
      reportInvalid(invalid, step, setStep);
      return;
    }
    if (!completed.current.has(step)) {
      completed.current.add(step);
      trackStep("partnership_intake_step_completed", step);
    }
    if (step < INTAKE_STEPS.length - 1) setStep(step + 1);
    else return submitRequest(event);
  }
  return { step, stepHeading, advance, back: () => setStep(step - 1) };
}
