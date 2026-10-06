import {
  referralSubmissionSchema as submissionSchema,
  type ReferralSubmission as Submission,
} from "../lib/referral-submission";
import { serverLog } from "./logger";
import { SubmissionConflict } from "./submissions";

type Dependencies = {
  save: (submission: Submission) => Promise<boolean | void>;
  capture?: (submission: Submission, request: Request) => Promise<void>;
  syncSheet?: (submission: Submission) => Promise<void>;
};
import {
  submissionJson as json,
  validateSubmissionRequest as validateRequest,
  readSubmissionInput as readInput,
} from "./submission-transport";

export async function handleReferralSubmission(
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
  try {
    const created = await dependencies.save(validated.data);
    await dependencies.capture?.(validated.data, request);
    if (created) await dependencies.syncSheet?.(validated.data);
    return json({ saved: true }, 201);
  } catch (error) {
    return saveFailure(error);
  }
}

async function saveFailure(error: unknown): Promise<Response> {
  if (error instanceof SubmissionConflict)
    return json(
      { error: "Please refresh the page before submitting again." },
      409,
    );
  // Log no form data, credentials, or database error detail.
  await serverLog("error", "referral_submission_save_failed", {
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
