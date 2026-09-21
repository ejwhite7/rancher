import { attributionPersonProperties } from "../lib/attribution";
import type { ContactSubmission } from "../lib/contact-submission";
import type { ReferralSubmission } from "../lib/referral-submission";
import type { Submission } from "../lib/submission";
import { serverEnv } from "./database";
import { serverLog } from "./logger";
import { REFERRAL_BONUS_USD } from "./referral";
import type { SubmissionConsentEvidence } from "./submissions";

type JsonObject = Record<string, unknown>;
type CaptureInput = {
  event: string;
  distinctId: string;
  submissionId: string;
  properties: JsonObject;
  set?: JsonObject;
  setOnce?: JsonObject;
  request: Request;
};

const endpoint = () =>
  new URL(
    "/i/v0/e/",
    serverEnv("PUBLIC_POSTHOG_HOST") || "https://us.i.posthog.com",
  ).href;

export async function captureFormEvent(input: CaptureInput) {
  const token = serverEnv("PUBLIC_POSTHOG_PROJECT_TOKEN");
  if (!token) {
    await serverLog("warn", "form_posthog_configuration_missing", {
      event: input.event,
    });
    return;
  }
  const forwarded = input.request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const properties: JsonObject = {
    ...input.properties,
    $lib: "rancher-server",
    $lib_version: "1",
    capture_source: "server",
    $insert_id: input.submissionId,
    event_id: input.submissionId,
    $current_url:
      input.request.headers.get("referer") || new URL(input.request.url).origin,
    $raw_user_agent: input.request.headers.get("user-agent") || undefined,
    $ip: forwarded || undefined,
    ...(input.set && Object.keys(input.set).length ? { $set: input.set } : {}),
    ...(input.setOnce && Object.keys(input.setOnce).length
      ? { $set_once: input.setOnce }
      : {}),
  };
  const response = await fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: token,
      event: input.event,
      distinct_id: input.distinctId,
      properties,
    }),
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok)
    throw new Error(`PostHog capture returned ${response.status}`);
}

async function safelyCapture(input: CaptureInput) {
  try {
    await captureFormEvent(input);
  } catch {
    await serverLog("error", "form_posthog_capture_failed", {
      event: input.event,
    });
  }
}

export function capturePartnershipSubmission(
  submission: Submission,
  request: Request,
  consent: SubmissionConsentEvidence,
) {
  const [firstName, ...lastName] = submission.name.split(/\s+/);
  return safelyCapture({
    event: "partnership_request_submitted",
    distinctId: submission.email,
    submissionId: submission.idempotencyKey,
    request,
    properties: {
      submission_id: submission.idempotencyKey,
      name: submission.name,
      first_name: firstName,
      last_name: lastName.join(" "),
      email: submission.email,
      domain: submission.email.split("@")[1],
      job_title: submission.title,
      company: submission.company,
      company_size: submission.size,
      rancher_company_size: submission.size,
      data_history: submission.history,
      record_types: submission.recordTypes,
      additional_context: submission.records,
      phone: submission.phone,
      communications_consent: submission.communicationsConsent,
      consent_version: consent.consentVersion,
      consent_recorded_at: consent.consentRecordedAt,
      referral_bonus_usd: REFERRAL_BONUS_USD[submission.size],
      currency: "USD",
      calculator_scenario: submission.scenario,
      attribution: submission.attribution,
    },
    set: {
      email: submission.email,
      first_name: firstName,
      last_name: lastName.join(" "),
      name: submission.name,
      company: submission.company,
      domain: submission.email.split("@")[1],
      job_title: submission.title,
      phone: submission.phone,
      communications_consent: submission.communicationsConsent,
      consent_version: consent.consentVersion,
      consent_recorded_at: consent.consentRecordedAt,
    },
    setOnce: {
      ...attributionPersonProperties(
        "attribution_first",
        submission.attribution.first,
      ),
      ...attributionPersonProperties(
        "partnership_first",
        submission.attribution.first,
      ),
      ...attributionPersonProperties(
        "partnership_last",
        submission.attribution.last,
      ),
    },
  });
}

export function captureContactSubmission(
  submission: ContactSubmission,
  request: Request,
) {
  return safelyCapture({
    event: "contact_form_submitted",
    distinctId: submission.email,
    submissionId: submission.idempotencyKey,
    request,
    properties: {
      form: "contact",
      submission_id: submission.idempotencyKey,
      name: submission.name,
      email: submission.email,
      message: submission.message,
      attribution: submission.attribution,
    },
    set: {
      email: submission.email,
      name: submission.name,
      domain: submission.email.split("@")[1],
      ...attributionPersonProperties(
        "attribution_last",
        submission.attribution.last,
      ),
    },
    setOnce: attributionPersonProperties(
      "attribution_first",
      submission.attribution.first,
    ),
  });
}

export function captureReferralSubmission(
  submission: ReferralSubmission,
  request: Request,
) {
  return safelyCapture({
    event: "referral_form_submitted",
    distinctId: submission.referrer_email,
    submissionId: submission.idempotencyKey,
    request,
    properties: {
      form: "referral",
      submission_id: submission.idempotencyKey,
      referrer_first_name: submission.referrer_first_name,
      referrer_last_name: submission.referrer_last_name,
      referrer_email: submission.referrer_email,
      referral_first_name: submission.referral_first_name,
      referral_last_name: submission.referral_last_name,
      referral_email: submission.referral_email,
      company_size: submission.company_size,
      rancher_company_size: submission.company_size,
      industry: submission.industry,
      attribution: submission.attribution,
    },
    set: {
      email: submission.referrer_email,
      name: `${submission.referrer_first_name} ${submission.referrer_last_name}`,
      domain: submission.referrer_email.split("@")[1],
      ...attributionPersonProperties(
        "attribution_last",
        submission.attribution.last,
      ),
    },
    setOnce: attributionPersonProperties(
      "attribution_first",
      submission.attribution.first,
    ),
  });
}
