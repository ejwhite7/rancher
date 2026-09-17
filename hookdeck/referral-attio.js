// Attached only to referral.submission.created on Rancher-Referral-to-Attio.
const attributionLines = (attribution) =>
  ["first", "last"].flatMap((touch) =>
    Object.entries(attribution?.[touch] || {}).map(
      ([key, value]) => `Attribution ${touch} ${key}: ${String(value)}`,
    ),
  );
addHandler("transform", (request) => {
  const event =
    typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  const submission = event?.data;
  const required = [
    "submission_id",
    "referrer_first_name",
    "referrer_last_name",
    "referrer_email",
    "referral_first_name",
    "referral_last_name",
    "referral_email",
    "company_size",
    "industry",
  ];
  if (
    event?.type !== "referral.submission.created" ||
    required.some(
      (key) => typeof submission?.[key] !== "string" || !submission[key].trim(),
    )
  ) {
    throw new Error("Invalid Rancher referral submission");
  }
  const email = submission.referral_email.trim().toLowerCase();
  request.headers = { ...request.headers, "content-type": "application/json" };
  request.query = "matching_attribute=email_addresses";
  // The referred person is the CRM contact. Preserve attribution in the existing
  // workflow's context field; a referral does not grant outreach consent.
  request.body = {
    data: {
      values: {
        email_addresses: [email],
        name: [
          {
            full_name: `${submission.referral_first_name} ${submission.referral_last_name}`,
          },
        ],
        rancher_submission_id: submission.submission_id,
        domain: email.split("@")[1],
        company_size: submission.company_size,
        additional_context: [
          "Rancher referral",
          `Referred by: ${submission.referrer_first_name} ${submission.referrer_last_name} <${submission.referrer_email.trim().toLowerCase()}>`,
          `Referral: ${submission.referral_first_name} ${submission.referral_last_name} <${email}>`,
          `Company size: ${submission.company_size}`,
          `Industry: ${submission.industry}`,
          ...attributionLines(submission.attribution),
        ].join("\n"),
      },
    },
  };
  return request;
});
