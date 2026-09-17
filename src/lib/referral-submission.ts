import { z } from "zod";
import { attributionSchema, EMPTY_ATTRIBUTION } from "./attribution";
const name = z.string().trim().min(1).max(120);
const email = z
  .email()
  .max(180)
  .transform((value) => value.toLowerCase());
export const referralSubmissionSchema = z
  .object({
    idempotencyKey: z.uuid(),
    referrer_first_name: name,
    referrer_last_name: name,
    referrer_email: email,
    referral_first_name: name,
    referral_last_name: name,
    referral_email: email,
    company_size: z.string().trim().min(1).max(120),
    industry: z.string().trim().min(1).max(120),
    website: z.string().max(0).optional(),
    attribution: attributionSchema.optional().default(EMPTY_ATTRIBUTION),
  })
  .strict();
export type ReferralSubmission = z.infer<typeof referralSubmissionSchema>;
