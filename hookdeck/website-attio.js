// Attached only to partnership_request_submitted events on Rancher-to-Attio.
const attributionFieldNames = {
  source: "utm_source",
  medium: "utm_medium",
  campaign: "utm_campaign",
  term: "utm_term",
  content: "utm_content",
  id: "attribution_id",
  source_platform: "source_platform",
  marketing_tactic: "marketing_tactic",
  creative_format: "creative_format",
  adgroup: "ad_group",
  adgroupid: "ad_group_id",
  adplacement: "ad_placement",
  device: "device",
  matchtype: "match_type",
  network: "network",
};
const attioAttributionValues = (submission, event) => {
  const attribution = submission.conversion_attribution || {
    submission_id: submission.submission_id,
    converted_at: event.created_at,
    first_touch: submission.attribution?.first,
    conversion_touch: submission.attribution?.last,
  };
  const values = {
    attribution_submission_id:
      attribution.submission_id || submission.submission_id,
    attribution_converted_at: attribution.converted_at || event.created_at,
  };
  for (const [touch, prefix] of [
    [attribution.first_touch, "first"],
    [attribution.conversion_touch, "conversion"],
  ]) {
    for (const [sourceKey, targetKey] of Object.entries(
      attributionFieldNames,
    )) {
      const value = touch?.[sourceKey];
      if (typeof value === "string" && value.length > 0) {
        values[`${prefix}_${targetKey}`] = value;
      }
    }
  }
  return values;
};
const attioEmployeeRange = (companySize) => {
  const ranges = {
    "1–10": "1-10",
    "11–19": "11-50",
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
  const rancherCompanySize =
    submission.rancher_company_size || submission.company_size;
  request.body = {
    data: {
      values: {
        email_addresses: [submission.email.trim().toLowerCase()],
        name: [{ full_name: submission.name }],
        job_title: submission.job_title,
        rancher_submission_id: submission.submission_id,
        company_name: submission.company,
        domain: submission.domain,
        company_size: attioEmployeeRange(rancherCompanySize),
        rancher_company_size: rancherCompanySize,
        phone_numbers: submission.phone ? [submission.phone] : undefined,
        rancher_communications_consent:
          submission.communications_consent === true,
        rancher_consent_version: submission.consent_version,
        rancher_consent_recorded_at: submission.communications_consent
          ? submission.consent_recorded_at
          : undefined,
        rancher_consent_source: "Rancher partnership form",
        data_history: submission.data_history,
        record_types: submission.record_types,
        referral_bonus_usd: submission.referral_bonus_usd,
        additional_context: submission.additional_context || undefined,
        ...attioAttributionValues(submission, event),
        outreach_consent: submission.communications_consent,
        consent_recorded_at: submission.communications_consent
          ? submission.consent_recorded_at
          : undefined,
      },
    },
  };
  return request;
});
