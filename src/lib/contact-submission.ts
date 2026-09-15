import { z } from "zod";
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
  })
  .strict();
export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
