import { submissionSchema, type Submission } from "../lib/submission";
import { emailDomain, isFreeOrDisposableEmail } from "./email-domain";
import { serverLog } from "./logger";
import { REFERRAL_BONUS_USD } from "./referral";
import { SubmissionConflict } from "./submissions";

type Dependencies = {
  save: (submission: Submission) => Promise<void>;
  bookingUrl: () => string | undefined;
};
const MAX_BODY_BYTES = 16_384;
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
  let booking: URL;
  try {
    booking = new URL(dependencies.bookingUrl() || "");
    if (booking.protocol !== "https:" || booking.username || booking.password)
      throw new Error("Invalid booking URL");
  } catch {
    return json(
      {
        error: "Booking is temporarily unavailable. Please try again shortly.",
      },
      503,
    );
  }
  try {
    await dependencies.save(validated.data);
    return json(
      {
        redirectUrl: booking.href,
        referralBonusUsd: REFERRAL_BONUS_USD[validated.data.size],
        domain,
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
