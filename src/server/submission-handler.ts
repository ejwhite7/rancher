import {
  CONSENT_VERSION,
  qualificationStatus,
  qualifiesTeamSize,
  submissionSchema,
  type Submission,
} from "../lib/submission";
import { emailDomain, isFreeOrDisposableEmail } from "./email-domain";
import { serverLog } from "./logger";
import { REFERRAL_BONUS_USD } from "./referral";
import {
  SubmissionConflict,
  type SubmissionConsentEvidence,
} from "./submissions";

type Dependencies = {
  save: (
    submission: Submission,
  ) => Promise<SubmissionConsentEvidence | void>;
  capture?: (
    submission: Submission,
    request: Request,
    consent: SubmissionConsentEvidence,
  ) => Promise<void>;
  bookingUrl: () => string | undefined;
};
const MAX_BODY_BYTES = 16_384;
export const NONQUALIFYING_MESSAGE =
  "Thank you for your interest, but at this time your organization does not meet minimum requirements.";
const json = (body: object, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function handleSubmission(
  request: Request,
  dependencies: Dependencies,
) {
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return json({ error: "Send a JSON submission." }, 415);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "Submit this form from the Rancher website." }, 403);
  let input: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Submission is empty." }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        return json({ error: "Submission is too large." }, 413);
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    input = JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    return json({ error: "Submission could not be read." }, 400);
  }
  const validated = submissionSchema.safeParse(input);
  if (!validated.success)
    return json(
      { error: "Please complete every required field with valid information." },
      400,
    );
  if (isFreeOrDisposableEmail(validated.data.email))
    return json({ error: "Enter your work email address." }, 400);
  const domain = emailDomain(validated.data.email);
  const qualifies = qualifiesTeamSize(validated.data.size);
  let booking: URL | null = null;
  if (qualifies) {
    try {
      booking = new URL(dependencies.bookingUrl() || "");
      if (booking.protocol !== "https:" || booking.username || booking.password)
        throw new Error("Invalid booking URL");
      booking.searchParams.set("name", validated.data.name);
      booking.searchParams.set("email", validated.data.email);
      if (validated.data.phone)
        booking.searchParams.set("attendeePhoneNumber", validated.data.phone);
    } catch {
      return json(
        {
          error: "Booking is temporarily unavailable. Please try again shortly.",
        },
        503,
      );
    }
  }
  try {
    const saved = await dependencies.save(validated.data);
    const consent = saved || {
      consentVersion: CONSENT_VERSION,
      consentRecordedAt: validated.data.communicationsConsent
        ? new Date().toISOString()
        : null,
    };
    await dependencies.capture?.(validated.data, request, consent);
    return json(
      {
        redirectUrl: booking?.href ?? null,
        message: qualifies ? null : NONQUALIFYING_MESSAGE,
        qualifies,
        qualificationStatus: qualificationStatus(validated.data.size),
        referralBonusUsd: REFERRAL_BONUS_USD[validated.data.size],
        domain,
        phone: validated.data.phone,
        consentVersion: consent.consentVersion,
        consentRecordedAt: consent.consentRecordedAt,
      },
      201,
    );
  } catch (error) {
    if (error instanceof SubmissionConflict)
      return json(
        { error: "Please refresh the page before submitting again." },
        409,
      );
    // Log no form data, credentials, or database error detail.
    await serverLog("error", "submission_save_failed", {
      error_code:
        error instanceof Error && "code" in error
          ? String(error.code)
          : "unknown",
    });
    return json(
      {
        error:
          "We could not save your request. Your entries are still here; please try again.",
      },
      503,
    );
  }
}
