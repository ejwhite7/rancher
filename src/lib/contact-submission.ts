import { z } from "zod";
import { attributionSchema, EMPTY_ATTRIBUTION } from "./attribution";
export const contactSubmissionSchema = z
  .object({
    idempotencyKey: z.uuid(),
    name: z.string().trim().min(1).max(120),
    email: z
      .email()
      .max(180)
      .transform((value) => value.toLowerCase()),
    message: z.string().trim().min(1).max(5000),
    website: z.string().max(0).optional(),
    attribution: attributionSchema.optional().default(EMPTY_ATTRIBUTION),
  })
  .strict();
export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
