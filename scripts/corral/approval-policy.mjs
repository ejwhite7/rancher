// Rancher owner override; never fabricate an editorial or specialist review.
export function ownerManagedPublishing(policy) {
  return (
    policy?.mode === "owner-managed-prismic" &&
    policy?.requested_by === "Edward White" &&
    policy?.editorial_approval_required === false &&
    policy?.specialist_approval_required === false
  );
}
export function applyApprovalPolicy(report, policy) {
  if (!ownerManagedPublishing(policy)) return report;
  const findings = report.findings.filter(
    (f) => f.rule_id !== "editorial.exact-hash-approval",
  );
  const count = (kind) => findings.filter((f) => f.class === kind).length;
  const hard = count("hard"),
    configurable = count("configurable"),
    advisories = count("advisory");
  return {
    ...report,
    findings,
    validation_summary: {
      hard_failures: hard,
      configurable_failures: configurable,
      advisories,
    },
    result:
      hard + configurable
        ? "fail"
        : advisories
          ? "pass_with_advisories"
          : "pass",
  };
}
export function applyPreflightPolicy(result, policy) {
  if (!ownerManagedPublishing(policy)) return result;
  const errors = result.errors.filter(
    (e) => e !== "exact-content-hash human approval is required",
  );
  return { ...result, errors, ready: errors.length === 0 };
}
