import { test, expect } from "@playwright/test";
import {
  partnershipSheetRow,
  referralSheetRow,
} from "../src/server/google-sheets";
import { submissionSchema } from "../src/lib/submission";
import { referralSubmissionSchema } from "../src/lib/referral-submission";

test("maps partnership submissions to Deals A:I", () => {
  const submission = submissionSchema.parse({
    idempotencyKey: "e6fb5cf8-f4c5-41aa-a3c8-34b3bb0789cb",
    name: "Alex Morgan",
    email: "alex@example.com",
    title: "VP Operations",
    company: "Example Company",
    size: "20–49",
    history: "3–5 years",
    isBusinessActive: true,
    recordTypes: ["Documents & files", "Projects & knowledge"],
    records: "Project histories",
    phone: "",
    communicationsConsent: false,
    website: "",
    scenario: null,
  });
  expect(partnershipSheetRow(submission)).toEqual([
    "Example Company",
    "Alex Morgan",
    "alex@example.com",
    "",
    "20–49",
    "3–5 years",
    "",
    "Documents & files; Projects & knowledge; Project histories",
    "true",
  ]);
});

test("maps referred contact fields to Deals A:I and leaves unavailable fields blank", () => {
  const submission = referralSubmissionSchema.parse({
    idempotencyKey: "53c5d917-09b6-459f-9c16-794972ec77eb",
    referrer_first_name: "Jeanine",
    referrer_last_name: "Smith",
    referrer_email: "ceo@sororityrecords.com",
    referral_first_name: "Jon",
    referral_last_name: "Barnes",
    referral_email: "jon@projectorg.com",
    company_size: "20–49",
    industry: "Education",
    website: "",
  });
  expect(referralSheetRow(submission)).toEqual([
    "Add manually",
    "Jon Barnes",
    "jon@projectorg.com",
    "Education",
    "20–49",
    "Add manually",
    "",
    "",
    "",
  ]);
});
