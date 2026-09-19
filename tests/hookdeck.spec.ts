import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("partnership transformation emits structured Attio attribution and preserves manual context", async () => {
  const code = await readFile("hookdeck/website-attio.js", "utf8");
  const sample = JSON.parse(
    await readFile("hookdeck/website-sample.json", "utf8"),
  );
  let transform: any;
  runInNewContext(code, {
    addHandler: (_event: string, handler: unknown) => {
      transform = handler;
    },
  });
  const output = JSON.parse(
    JSON.stringify(transform({ headers: {}, body: sample.body })),
  );
  expect(output.query).toBe("matching_attribute=email_addresses");
  expect(output.body.data.values.email_addresses).toEqual([
    "partner@example.com",
  ]);
  expect(output.body.data.values.company_size).toBe("51-250");
  expect(output.body.data.values.phone_numbers).toEqual(["+12125550123"]);
  expect(output.body.data.values.rancher_communications_consent).toBe(true);
  expect(output.body.data.values.rancher_consent_version).toBe(
    "communications-v1-2026-09-19",
  );
  expect(output.body.data.values.rancher_consent_recorded_at).toBe(
    "2026-09-17T18:00:00Z",
  );
  expect(output.body.data.values.rancher_consent_source).toBe(
    "Rancher partnership form",
  );
  expect(output.body.data.values.additional_context).toBe(
    "Synthetic transformation test.",
  );
  expect(output.body.data.values.attribution_submission_id).toBe(
    sample.body.data.submission_id,
  );
  expect(output.body.data.values.attribution_converted_at).toBe(
    "2026-09-17T18:00:00Z",
  );
  expect(output.body.data.values.first_utm_source).toBe("google");
  expect(output.body.data.values.first_attribution_id).toBe(
    "gclid-first-123",
  );
  expect(output.body.data.values.first_ad_group_id).toBe("ag-101");
  expect(output.body.data.values.conversion_utm_source).toBe("linkedin");
  expect(output.body.data.values.conversion_utm_campaign).toBe("retargeting");
  expect(output.body.data.values.conversion_attribution_id).toBe(
    "li-click-456",
  );
  expect(output.body.data.values.conversion_network).toBe("linkedin");
  expect(output.body.data.values.additional_context).not.toContain(
    "Attribution",
  );
});

test("contact transformation maps the message without writing partnership or consent fields", async () => {
  const code = await readFile("hookdeck/contact-attio.js", "utf8");
  const sample = JSON.parse(
    await readFile("hookdeck/contact-sample.json", "utf8"),
  );
  let transform: any;
  runInNewContext(code, {
    addHandler: (event: string, handler: unknown) => {
      expect(event).toBe("transform");
      transform = handler;
    },
  });
  for (const body of [sample.body, JSON.stringify(sample.body)]) {
    const output = JSON.parse(JSON.stringify(transform({ headers: {}, body })));
    expect(output.query).toBe("matching_attribute=email_addresses");
    expect(output.body.data.values).toEqual({
      email_addresses: ["contact-test@example.com"],
      name: [{ full_name: "Synthetic transformation test" }],
      rancher_submission_id: sample.body.id,
      domain: "example.com",
      additional_context:
        "Synthetic contact transformation test.\nAttribution first source: google\nAttribution first medium: cpc\nAttribution first campaign: spring\nAttribution last source: linkedin\nAttribution last medium: paid-social\nAttribution last campaign: retargeting",
    });
  }
  expect(() =>
    transform({
      headers: {},
      body: { ...sample.body, type: "submission.created" },
    }),
  ).toThrow("Invalid Rancher contact submission");
});

test("HeyReach transformation normalizes the approved campaign and rejects other campaigns", async () => {
  const code = await readFile("hookdeck/heyreach-attio.js", "utf8");
  const sample = JSON.parse(
    await readFile("hookdeck/heyreach-sample.json", "utf8"),
  );
  let transform: any;
  runInNewContext(code, {
    Date,
    addHandler: (_event: string, handler: unknown) => {
      transform = handler;
    },
  });
  for (const body of [sample.body, JSON.stringify(sample.body)]) {
    const output = JSON.parse(JSON.stringify(transform({ headers: {}, body })));
    expect(output.body).toEqual({
      event_name: "heyreach_lead_activity",
      event_id:
        "heyreach:608725:lead_auto_tagged_interested:synthetic-heyreach-event-001",
      occurred_at: "2026-09-19T15:30:00Z",
      activity: "lead_auto_tagged_interested",
      campaign: {
        id: 608725,
        name: "Rancher - heyreach-founders-v1",
      },
      person: {
        first_name: "Integration",
        last_name: "Test",
        email: "integration-test@gorancher.com",
        linkedin_url: "https://www.linkedin.com/in/integration-test",
        job_title: "Founder",
      },
      company: {
        name: "Rancher Integration Test",
        domain: "gorancher.com",
        linkedin_url:
          "https://www.linkedin.com/company/rancher-integration-test",
      },
      source_context: {
        provider: "heyreach",
        event_type: "LEAD_AUTO_TAGGED_INTERESTED",
        campaign_scoped: true,
      },
    });
  }
  expect(() =>
    transform({ headers: {}, body: { ...sample.body, campaignId: 123 } }),
  ).toThrow("Unexpected HeyReach campaign");
});

test("referral transformation targets the referred person and preserves referrer attribution without granting consent", async () => {
  const code = await readFile("hookdeck/referral-attio.js", "utf8");
  const sample = JSON.parse(
    await readFile("hookdeck/referral-sample.json", "utf8"),
  );
  let transform: any;
  runInNewContext(code, {
    addHandler: (_event: string, handler: unknown) => {
      transform = handler;
    },
  });
  for (const body of [sample.body, JSON.stringify(sample.body)]) {
    const output = JSON.parse(JSON.stringify(transform({ headers: {}, body })));
    expect(output.query).toBe("matching_attribute=email_addresses");
    expect(output.body.data.values).toEqual({
      email_addresses: ["referred@example.org"],
      name: [{ full_name: "Test Referral" }],
      rancher_submission_id: sample.body.id,
      domain: "example.org",
      company_size: "51-250",
      additional_context:
        "Rancher referral\nReferred by: Test Referrer <referrer@example.com>\nReferral: Test Referral <referred@example.org>\nCompany size: 50–199\nIndustry: Technology\nAttribution first source: google\nAttribution first medium: cpc\nAttribution first campaign: spring\nAttribution last source: newsletter\nAttribution last medium: email\nAttribution last campaign: partner-update",
    });
  }
  expect(() =>
    transform({ body: { ...sample.body, type: "contact.submission.created" } }),
  ).toThrow("Invalid Rancher referral submission");
  expect(() =>
    transform({
      body: {
        ...sample.body,
        data: { ...sample.body.data, referrer_email: "" },
      },
    }),
  ).toThrow("Invalid Rancher referral submission");
  expect(() =>
    transform({
      body: {
        ...sample.body,
        data: { ...sample.body.data, company_size: "unknown" },
      },
    }),
  ).toThrow("Unsupported Rancher company size");
});
