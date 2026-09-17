import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("partnership transformation includes attribution in Attio context", async () => {
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
  expect(output.body.data.values.additional_context).toContain(
    "Attribution first source: google",
  );
  expect(output.body.data.values.additional_context).toContain(
    "Attribution last campaign: retargeting",
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
      company_size: "50–199",
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
});
