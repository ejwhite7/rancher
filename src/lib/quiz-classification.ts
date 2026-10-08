import { z } from "zod";
import { archetypeIds, type Answers } from "./quiz";

export const CLASSIFICATION_ERROR =
  "We couldn’t process your answer. Please try again.";
const probability = z.number().min(0).max(1);
const probabilities = z.strictObject({
  AO: probability,
  OS: probability,
  MC: probability,
});

export const classificationSchema = z
  .object({
    probabilities,
    top: z.enum(archetypeIds),
    confidence: probability,
    model: z.string().startsWith("jev-"),
    source: z.literal("jev"),
  })
  .refine(
    (result) =>
      Math.abs(
        Object.values(result.probabilities).reduce(
          (sum, value) => sum + value,
          0,
        ) - 1,
      ) <= 1e-5,
  )
  .refine(
    (result) =>
      result.probabilities[result.top] ===
      Math.max(...Object.values(result.probabilities)),
  );

export const jevResponseSchema = z
  .object({
    model: z.string(),
    answers: z.object({
      archetype: z.object({
        type: z.literal("choice"),
        choice: z.enum(archetypeIds),
        probabilities,
        confidence: probability,
      }),
    }),
  })
  .transform(({ model, answers: { archetype } }) => ({
    model,
    top: archetype.choice,
    probabilities: archetype.probabilities,
    confidence: archetype.confidence,
    source: "jev" as const,
  }))
  .pipe(classificationSchema);

export async function requestClassification(
  answers: Answers,
  send: typeof fetch = fetch,
) {
  const response = await send("/api/quiz/classify/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
    signal: AbortSignal.timeout(25_000),
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(CLASSIFICATION_ERROR);
  }
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(data);
    throw new Error(error.success ? error.data.error : CLASSIFICATION_ERROR);
  }
  const result = classificationSchema.safeParse(data);
  if (!result.success) throw new Error(CLASSIFICATION_ERROR);
  return result.data;
}
