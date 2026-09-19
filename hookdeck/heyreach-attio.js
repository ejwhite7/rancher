// Attached only to campaign-scoped HeyReach webhooks for campaign 608725.
const CAMPAIGN_ID = 608725;
const CAMPAIGN_NAME = "Rancher - heyreach-founders-v1";

const first = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
const clean = (value) =>
  value === undefined || value === null || String(value).trim() === ""
    ? undefined
    : String(value).trim();
const withoutEmpty = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
const slug = (value) => String(value || "unknown").trim().toLowerCase();

addHandler("transform", (request) => {
  const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  if (!body || typeof body !== "object") throw new Error("Invalid HeyReach webhook body");

  const data = body.data && typeof body.data === "object" ? body.data : {};
  const lead = first(body.lead, data.lead, body.linkedInLead, data.linkedInLead, data) || {};
  const campaign = first(body.campaign, data.campaign, {}) || {};
  const suppliedCampaignId = first(body.campaignId, body.campaign_id, data.campaignId, data.campaign_id, campaign.id, campaign.campaignId);
  if (suppliedCampaignId !== undefined && Number(suppliedCampaignId) !== CAMPAIGN_ID) {
    throw new Error("Unexpected HeyReach campaign");
  }

  const eventType = clean(first(body.eventType, body.event_type, body.type, data.eventType, data.event_type, data.type));
  if (!eventType) throw new Error("Missing HeyReach event type");
  const occurredAt = clean(first(body.timestamp, body.occurredAt, body.createdAt, data.timestamp, data.occurredAt, data.createdAt)) || new Date().toISOString();
  const linkedInUrl = clean(first(lead.profileUrl, lead.linkedinUrl, lead.linkedInUrl, lead.linkedin_url, data.profileUrl, data.linkedinUrl));
  const email = clean(first(lead.email, lead.emailAddress, lead.email_address, data.email, data.emailAddress));
  const explicitEventId = clean(first(body.id, body.eventId, body.event_id, data.id, data.eventId));
  const leadId = clean(first(lead.id, lead.leadId, linkedInUrl, email));
  if (!explicitEventId && !leadId) throw new Error("Missing stable HeyReach event identifier");
  const sourceId = explicitEventId || `${leadId}:${occurredAt}`;

  request.headers = { ...request.headers, "content-type": "application/json" };
  request.body = {
    event_name: "heyreach_lead_activity",
    event_id: `heyreach:${CAMPAIGN_ID}:${slug(eventType)}:${sourceId}`,
    occurred_at: occurredAt,
    activity: slug(eventType),
    campaign: {
      id: CAMPAIGN_ID,
      name: CAMPAIGN_NAME,
    },
    person: withoutEmpty({
      first_name: clean(first(lead.firstName, lead.first_name, data.firstName)),
      last_name: clean(first(lead.lastName, lead.last_name, data.lastName)),
      email: email?.toLowerCase(),
      linkedin_url: linkedInUrl,
      job_title: clean(first(lead.jobTitle, lead.position, lead.headline, lead.title, data.jobTitle)),
    }),
    company: withoutEmpty({
      name: clean(first(lead.companyName, lead.company_name, lead.company?.name, data.companyName)),
      domain: clean(first(lead.companyDomain, lead.company_domain, lead.company?.domain, data.companyDomain))?.toLowerCase(),
      linkedin_url: clean(first(lead.companyLinkedinUrl, lead.companyLinkedInUrl, lead.company?.linkedinUrl, data.companyLinkedinUrl)),
    }),
    source_context: {
      provider: "heyreach",
      event_type: eventType,
      campaign_scoped: true,
    },
  };
  return request;
});
