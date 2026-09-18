// Attached only to partnership_request_submitted events on Rancher-to-Attio.
const attributionLines = (attribution) =>
  ["first", "last"].flatMap((touch) =>
    Object.entries(attribution?.[touch] || {}).map(
      ([key, value]) => `Attribution ${touch} ${key}: ${String(value)}`,
    ),
  );
const attioEmployeeRange = (companySize) => {
  const ranges = {
    "20–49": "11-50",
    "50–199": "51-250",
    "200–499": "251-1K",
    "500–999": "251-1K",
    "1,000–4,999": "1K-5K",
    "5,000+": "5K-10K",
  };
  const value = ranges[companySize];
  if (!value) throw new Error("Unsupported Rancher company size");
  return value;
};
addHandler("transform", (request) => {
  const event =
    typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  const submission = event?.data;
  if (
    event?.type !== "submission.created" ||
    (event?.event_name !== undefined &&
      event.event_name !== "partnership_request_submitted") ||
    !submission?.submission_id ||
    typeof submission.email !== "string" ||
    typeof submission.name !== "string"
  ) {
    throw new Error("Invalid Rancher partnership submission");
  }
  request.headers = { ...request.headers, "content-type": "application/json" };
  request.query = "matching_attribute=email_addresses";
  request.body = {
    data: {
      values: {
        email_addresses: [submission.email.trim().toLowerCase()],
        name: [{ full_name: submission.name }],
        job_title: submission.job_title,
        rancher_submission_id: submission.submission_id,
        company_name: submission.company,
        domain: submission.domain,
        company_size: attioEmployeeRange(submission.company_size),
        data_history: submission.data_history,
        record_types: submission.record_types,
        referral_bonus_usd: submission.referral_bonus_usd,
        additional_context: [
          submission.additional_context || "",
          ...attributionLines(submission.attribution),
        ]
          .filter(Boolean)
          .join("\n"),
        outreach_consent: submission.outreach_consent,
        consent_recorded_at: submission.consent_recorded_at,
      },
    },
  };
  return request;
});
