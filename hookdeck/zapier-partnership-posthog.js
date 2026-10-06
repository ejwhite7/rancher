// Normalize Rancher Meta lead-form submissions relayed by Zapier into the
// canonical partnership_request_submitted PostHog event used by the website.
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
const canonicalSize = (value) => {
  const size = sizeMap[text(value)];
  if (!size) throw new Error("Unsupported Rancher company size");
  return size;
};
const canonicalHistory = (value) => text(value).replace(/-/g, "–");
const isoTime = (value) => {
  const date = new Date(text(value));
  if (!Number.isFinite(date.getTime()))
    throw new Error("created_at must be a valid timestamp");
  return date.toISOString();
};

addHandler("transform", (request) => {
  const lead =
    typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  if (!lead || typeof lead !== "object" || Array.isArray(lead))
    throw new Error("Invalid Zapier lead");
  const token = text(process.env.POSTHOG_PROJECT_TOKEN);
  if (!token || token.indexOf("phx_") === 0)
    throw new Error("Invalid POSTHOG_PROJECT_TOKEN");
  const identity = leadIdentity(lead);
  const companySize = canonicalSize(lead.company_size);
  const properties = postHogProperties(lead, identity, companySize);

  return {
    headers: { "content-type": "application/json" },
    path: "",
    query: "",
    parsed_query: {},
    body: {
      api_key: token,
      event: "partnership_request_submitted",
      distinct_id: identity.email,
      timestamp: isoTime(lead.created_at),
      properties,
    },
  };
});

function leadIdentity(lead) {
  const leadId = text(lead.lead_id);
  const email = text(lead.email).toLowerCase();
  const name = text(lead.name);
  if (!leadId || !email || !name)
    throw new Error("lead_id, email, and name are required");
  return { leadId, email, name };
}

function postHogProperties(lead, { leadId, email, name }, companySize) {
  const qualifies = bonuses[companySize] > 0;
  const submissionId = `zapier:${leadId}`;
  return {
    submission_id: submissionId,
    name,
    email,
    phone: text(lead.phone),
    domain: email.split("@")[1] || "",
    job_title: text(lead.job_title),
    company: text(lead.company),
    company_size: companySize,
    rancher_company_size: companySize,
    data_history: canonicalHistory(lead.data_history),
    record_types: "",
    additional_context: "Meta lead form via Zapier",
    communications_consent: false,
    consent_version: "",
    consent_recorded_at: "",
    referral_bonus_usd: bonuses[companySize],
    calculator_scenario: "",
    qualifies,
    qualification_status: qualifies ? "qualified" : "does_not_qualify",
    lead_source: "facebook_lead_ads",
    lead_id: leadId,
    first_utm_source: text(lead.first_utm_source),
    first_utm_medium: text(lead.first_utm_medium),
    first_utm_campaign: text(lead.first_utm_campaign),
    first_utm_term: text(lead.first_utm_term),
    first_utm_content: text(lead.first_utm_content),
    first_utm_id: text(lead.first_utm_id),
    conversion_utm_source: text(lead.conversion_utm_source),
    conversion_utm_medium: text(lead.conversion_utm_medium),
    conversion_utm_campaign: text(lead.conversion_utm_campaign),
    conversion_utm_term: text(lead.conversion_utm_term),
    conversion_utm_content: text(
      lead.conversion_utm_content || lead.coversion_utm_content,
    ),
    conversion_utm_id: text(lead.conversion_utm_id),
    $insert_id: `zapier-partnership:${leadId}`,
    $geoip_disable: true,
    $set: {
      email,
      name,
      company: text(lead.company),
      job_title: text(lead.job_title),
    },
  };
}
