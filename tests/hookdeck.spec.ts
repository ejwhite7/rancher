import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
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
      additional_context: sample.body.data.message,
    });
  }
  expect(() =>
    transform({
      headers: {},
      body: { ...sample.body, type: "submission.created" },
    }),
  ).toThrow("Invalid Rancher contact submission");
});
