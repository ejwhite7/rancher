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
  save: (submission: Submission) => Promise<SubmissionConsentEvidence | void>;
  capture?: (
    submission: Submission,
    request: Request,
    consent: SubmissionConsentEvidence,
  ) => Promise<void>;
  syncSheet?: (submission: Submission) => Promise<void>;
  bookingUrl: () => string | undefined;
};
import {
  submissionJson as json,
  validateSubmissionRequest as validateRequest,
  readSubmissionInput as readInput,
} from "./submission-transport";
export const NONQUALIFYING_MESSAGE =
  "Thank you for your interest, but at this time your organization does not meet minimum requirements.";
function bookingFor(submission: Submission, dependencies: Dependencies): URL {
  const booking = new URL(dependencies.bookingUrl() || "");
  if (booking.protocol !== "https:" || booking.username || booking.password)
    throw new Error("Invalid booking URL");
  booking.searchParams.set("name", submission.name);
  booking.searchParams.set("email", submission.email);
  if (submission.phone)
    booking.searchParams.set("attendeePhoneNumber", submission.phone);
  return booking;
}

function submissionBooking(
  submission: Submission,
  dependencies: Dependencies,
): URL | Response | null {
  if (!qualifiesTeamSize(submission.size)) return null;
  try {
    return bookingFor(submission, dependencies);
  } catch {
    return json(
      {
        error: "Booking is temporarily unavailable. Please try again shortly.",
      },
      503,
    );
  }
}

function fallbackConsent(submission: Submission): SubmissionConsentEvidence {
  return {
    consentVersion: CONSENT_VERSION,
    consentRecordedAt: submission.communicationsConsent
      ? new Date().toISOString()
      : null,
  };
}

async function saveFailure(error: unknown): Promise<Response> {
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

export async function handleSubmission(
  request: Request,
  dependencies: Dependencies,
) {
  const requestError = validateRequest(request);
  if (requestError) return requestError;
  const body = await readInput(request);
  if (body.error) return body.error;
  const validated = submissionSchema.safeParse(body.input);
  if (!validated.success)
    return json(
      { error: "Please complete every required field with valid information." },
      400,
    );
  if (isFreeOrDisposableEmail(validated.data.email))
    return json({ error: "Enter your work email address." }, 400);
  const booking = submissionBooking(validated.data, dependencies);
  if (booking instanceof Response) return booking;
  return saveAndRespond(request, dependencies, validated.data, booking);
}

async function saveAndRespond(
  request: Request,
  dependencies: Dependencies,
  submission: Submission,
  booking: URL | null,
) {
  const domain = emailDomain(submission.email);
  const qualifies = qualifiesTeamSize(submission.size);
  try {
    const saved = await dependencies.save(submission);
    const consent = saved || fallbackConsent(submission);
    await dependencies.capture?.(submission, request, consent);
    if (saved?.created) await dependencies.syncSheet?.(submission);
    return json(
      {
        redirectUrl: booking?.href ?? null,
        message: qualifies ? null : NONQUALIFYING_MESSAGE,
        qualifies,
        qualificationStatus: qualificationStatus(submission.size),
        referralBonusUsd: REFERRAL_BONUS_USD[submission.size],
        domain,
        phone: submission.phone,
        consentVersion: consent.consentVersion,
        consentRecordedAt: consent.consentRecordedAt,
      },
      201,
    );
  } catch (error) {
    return saveFailure(error);
  }
}
