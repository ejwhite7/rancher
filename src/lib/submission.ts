import { z } from "zod";
import { attributionSchema, EMPTY_ATTRIBUTION } from "./attribution";

export const CONSENT_VERSION = "communications-v1-2026-09-19";
export const CONSENT_TEXT =
  "Yes, B2B SaaS Inc. DBA Rancher may call or text me at the number provided about my partnership request and related opportunities, including through automated technology, artificial or prerecorded voice, and AI-generated voice. Consent is not a condition of submitting this request. Message and data rates may apply. Message frequency varies. Reply STOP to opt out or HELP for help.";

export function normalizeUsPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  const national =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null;
  return `+1${national}`;
}
export const TEAM_SIZES = [
  "1–10",
  "11–19",
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
    phone: z
      .string()
      .max(40)
      .transform((value, context) => {
        const normalized = normalizeUsPhone(value);
        if (value.trim() && !normalized)
          context.addIssue({
            code: "custom",
            message: "Enter a valid US phone number.",
          });
        return normalized;
      }),
    communicationsConsent: z.boolean(),
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
  .strict()
  .refine((value) => !value.communicationsConsent || value.phone !== null, {
    path: ["communicationsConsent"],
    message: "Enter a phone number before consenting to calls or texts.",
  });
export type Submission = z.infer<typeof submissionSchema>;
