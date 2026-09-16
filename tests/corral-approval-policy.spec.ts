import { test, expect } from "@playwright/test";
import {
  applyApprovalPolicy,
  applyPreflightPolicy,
} from "../scripts/corral/approval-policy.mjs";
const policy = {
  mode: "owner-managed-prismic",
  requested_by: "Edward White",
  editorial_approval_required: false,
  specialist_approval_required: false,
};
test("owner waiver removes only human approval requirements", () => {
  const report = {
    findings: [
      { rule_id: "editorial.exact-hash-approval", class: "hard" },
      { rule_id: "editorial.content-hash", class: "hard" },
    ],
    result: "fail",
  };
  expect(applyApprovalPolicy(report, policy).findings).toEqual([
    report.findings[1],
  ]);
  expect(applyApprovalPolicy(report, policy).result).toBe("fail");
  const result = {
    errors: [
      "exact-content-hash human approval is required",
      "article content hash is stale",
      "adapter publish capability is disabled",
    ],
    ready: false,
  };
  expect(applyPreflightPolicy(result, policy).errors).toEqual(
    result.errors.slice(1),
  );
  expect(applyPreflightPolicy(result, {})).toEqual(result);
  expect(applyApprovalPolicy(report, {})).toEqual(report);
});
test("approval-only failure clears under the explicit owner policy", () => {
  expect(
    applyApprovalPolicy(
      {
        findings: [{ rule_id: "editorial.exact-hash-approval", class: "hard" }],
      },
      policy,
    ).result,
  ).toBe("pass");
  expect(
    applyPreflightPolicy(
      {
        errors: ["exact-content-hash human approval is required"],
        ready: false,
      },
      policy,
    ).ready,
  ).toBe(true);
});
