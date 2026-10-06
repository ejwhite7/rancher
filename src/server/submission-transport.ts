// Shared only by the three first-party form submission endpoints.
const MAX_BODY_BYTES = 16_384;
export const submissionJson = (body: object, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export function validateSubmissionRequest(
  request: Request,
): Response | undefined {
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return submissionJson({ error: "Send a JSON submission." }, 415);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return submissionJson(
      { error: "Submit this form from the Rancher website." },
      403,
    );
}

export async function readSubmissionInput(
  request: Request,
): Promise<{ input: unknown; error?: never } | { error: Response }> {
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return { error: submissionJson({ error: "Submission is empty." }, 400) };
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        return {
          error: submissionJson({ error: "Submission is too large." }, 413),
        };
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { input: JSON.parse(new TextDecoder().decode(buffer)) };
  } catch {
    return {
      error: submissionJson({ error: "Submission could not be read." }, 400),
    };
  }
}
