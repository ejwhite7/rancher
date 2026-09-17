import { z } from "zod";
import { attributionSchema, EMPTY_ATTRIBUTION } from "./attribution";

export const CONSENT_TEXT =
  "I consent to outreach from Rancher about data licensing opportunities.";
export const TEAM_SIZES = [
  "20–49",
  "50–199",
  "200–499",
  "500–999",
  "1,000–4,999",
  "5,000+",
] as const;
export const HISTORY_RANGES = [
  "3–5 years",
  "6–10 years",
  "11–15 years",
  "16–19 years",
  "20+ years",
] as const;
export const RECORD_TYPES = [
  "Chat & messaging",
  "Email & calendar",
  "Documents & files",
  "Projects & knowledge",
  "CRM & sales",
  "Customer support",
  "Code & engineering",
  "Finance & operations",
  "Other",
] as const;
export const submissionSchema = z
  .object({
    idempotencyKey: z.uuid(),
    name: z.string().trim().min(1, "Your name is required.").max(120),
    email: z
      .email("Enter a valid email address.")
      .max(180)
      .transform((value) => value.toLowerCase()),
    title: z.string().trim().min(1, "Job title is required.").max(120),
    company: z.string().trim().min(1, "Company is required.").max(180),
    size: z.enum(TEAM_SIZES),
    history: z.enum(HISTORY_RANGES),
    recordTypes: z
      .array(z.enum(RECORD_TYPES))
      .min(1)
      .max(RECORD_TYPES.length)
      .refine(
        (values) => new Set(values).size === values.length,
        "Choose each record type only once.",
      ),
    records: z.string().trim().max(2000).optional().default(""),
    outreachConsent: z.literal(true, {
      error: "Please consent to outreach before submitting.",
    }),
    website: z.string().max(0).optional(),
    attribution: attributionSchema.optional().default(EMPTY_ATTRIBUTION),
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
