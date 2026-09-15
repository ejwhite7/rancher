// Attached only to contact.submission.created events on Rancher-Contact-to-Attio.
addHandler("transform", (request) => {
  const event =
    typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  const submission = event?.data;
  if (
    event?.type !== "contact.submission.created" ||
    !submission?.submission_id ||
    typeof submission.email !== "string" ||
    typeof submission.name !== "string" ||
    typeof submission.message !== "string"
  ) {
    throw new Error("Invalid Rancher contact submission");
  }
  const email = submission.email.trim().toLowerCase();
  request.headers = { ...request.headers, "content-type": "application/json" };
  request.query = "matching_attribute=email_addresses";
  request.body = {
    data: {
      values: {
        email_addresses: [email],
        name: [{ full_name: submission.name }],
        rancher_submission_id: submission.submission_id,
        domain: email.split("@")[1],
        additional_context: submission.message,
      },
    },
  };
  // Contact enquiries do not overwrite company details or marketing consent.
  return request;
});
