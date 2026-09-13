import { z } from "zod";

export const CONSENT_TEXT =
  "I consent to outreach from Rancher about data licensing opportunities.";
export const TEAM_SIZES = ["20–100", "101–500", "501–1,000", "1,001+"] as const;
export const HISTORY_RANGES = [
  "Less than 1 year",
  "1–3 years",
  "3–5 years",
  "5+ years",
  "Not sure yet",
] as const;
export const submissionSchema = z
  .object({
    idempotencyKey: z.uuid(),
    name: z.string().trim().min(1, "Your name is required.").max(120),
    email: z
      .email("Enter a valid email address.")
      .max(180)
      .transform((value) => value.toLowerCase()),
    company: z.string().trim().min(1, "Company is required.").max(180),
    size: z.enum(TEAM_SIZES),
    history: z.enum(HISTORY_RANGES),
    records: z
      .string()
      .trim()
      .min(1, "Describe the systems or records in scope.")
      .max(2000),
    outreachConsent: z.literal(true, {
      error: "Please consent to outreach before submitting.",
    }),
    website: z.string().max(0).optional(),
    scenario: z
      .object({
        employees: z.number().int().min(20).max(200),
        years: z.number().int().min(3).max(20),
        country: z.enum(["USA", "Canada", "Europe", "Other"]),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type Submission = z.infer<typeof submissionSchema>;
