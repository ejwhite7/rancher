// Normalize Rancher Meta lead-form submissions relayed by Zapier for the
// existing Attio partnership workflow.
const sizeMap = {
  "1-10": "1–10",
  "1–10": "1–10",
  "11-19": "11–19",
  "11–19": "11–19",
  "20-49": "20–49",
  "20–49": "20–49",
  "50-199": "50–199",
  "50–199": "50–199",
  "200-499": "200–499",
  "200–499": "200–499",
  "500-999": "500–999",
  "500–999": "500–999",
  "1,000-4,999": "1,000–4,999",
  "1,000–4,999": "1,000–4,999",
  "5,000+": "5,000+",
};
const attioSizes = {
  "1–10": "1-10",
  "11–19": "11-50",
  "20–49": "11-50",
  "50–199": "51-250",
  "200–499": "251-1K",
  "500–999": "251-1K",
  "1,000–4,999": "1K-5K",
  "5,000+": "5K-10K",
};
const bonuses = {
  "1–10": 0,
  "11–19": 0,
  "20–49": 8000,
  "50–199": 14000,
  "200–499": 28000,
  "500–999": 42000,
  "1,000–4,999": 54000,
  "5,000+": 75000,
};
const text = (value) => (value == null ? "" : String(value).trim());
const optional = (value) => text(value) || undefined;
const canonicalSize = (value) => {
  const size = sizeMap[text(value)];
  if (!size) throw new Error("Unsupported Rancher company size");
  return size;
};

addHandler("transform", (request) => {
  const lead =
    typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  if (!lead || typeof lead !== "object" || Array.isArray(lead))
    throw new Error("Invalid Zapier lead");
  const leadId = text(lead.lead_id);
  const email = text(lead.email).toLowerCase();
  const name = text(lead.name);
  if (!leadId || !email || !name)
    throw new Error("lead_id, email, and name are required");

  const companySize = canonicalSize(lead.company_size);
  const qualifies = bonuses[companySize] > 0;
  const values = {
    email_addresses: [email],
    name: [{ full_name: name }],
    job_title: optional(lead.job_title),
    rancher_submission_id: `zapier:${leadId}`,
    company_name: optional(lead.company),
    domain: email.split("@")[1] || undefined,
    company_size: attioSizes[companySize],
    rancher_company_size: companySize,
    qualifies,
    qualification_status: qualifies ? "qualified" : "does_not_qualify",
    phone_numbers: text(lead.phone) ? [text(lead.phone)] : undefined,
    rancher_communications_consent: false,
    rancher_consent_source: "Rancher Meta lead form via Zapier",
    data_history: text(lead.data_history).replace(/-/g, "–"),
    referral_bonus_usd: bonuses[companySize],
    outreach_consent: false,
    additional_context: "Meta lead form via Zapier",
    first_utm_source: optional(lead.first_utm_source),
    first_utm_medium: optional(lead.first_utm_medium),
    first_utm_campaign: optional(lead.first_utm_campaign),
    first_utm_term: optional(lead.first_utm_term),
    first_utm_content: optional(lead.first_utm_content),
    first_attribution_id: optional(lead.first_utm_id),
    conversion_utm_source: optional(lead.conversion_utm_source),
    conversion_utm_medium: optional(lead.conversion_utm_medium),
    conversion_utm_campaign: optional(lead.conversion_utm_campaign),
    conversion_utm_term: optional(lead.conversion_utm_term),
    conversion_utm_content: optional(
      lead.conversion_utm_content || lead.coversion_utm_content,
    ),
    conversion_attribution_id: optional(lead.conversion_utm_id),
  };
  Object.keys(values).forEach(
    (key) => values[key] === undefined && delete values[key],
  );

  request.headers = { ...request.headers, "content-type": "application/json" };
  request.query = "matching_attribute=email_addresses";
  request.body = { data: { values } };
  return request;
});
