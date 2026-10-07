import { test, expect } from "@playwright/test";

test("every wizard data field prefills, survives edits and reaches submission", async ({
  page,
}) => {
  const params = new URLSearchParams({
    name: "Alex Morgan",
    email: "alex@example.com",
    title: "Operations",
    company: "Example",
    phone: "2125550123",
    size: "20-49",
    history: "3-5 years",
    is_business_active: "true",
    communications_consent: "yes",
    website: "spam",
  });
  params.append("recordTypes", "Documents & files");
  params.append("recordTypes", "Email & calendar");
  await page.route("**/api/submissions/", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      name: "Alex Morgan",
      email: "alex@example.com",
      title: "Operations",
      company: "Example",
      phone: "2125550123",
      size: "50–199",
      history: "3–5 years",
      isBusinessActive: true,
      recordTypes: ["Email & calendar", "Documents & files"],
      communicationsConsent: false,
      website: "",
    });
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Checked payload." }),
    });
  });
  await page.goto(`/intake/?${params}`);
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator('[name="size"]')).toHaveValue("20–49");
  await expect(page.locator('[name="history"]')).toHaveValue("3–5 years");
  await expect(page.getByLabel("Is this business active?")).toBeChecked();
  await expect(
    page.getByLabel("Documents & files", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Email & calendar", { exact: true }),
  ).toBeChecked();
  await page.locator('[name="size"]').selectOption("50–199");
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator('[name="size"]')).toHaveValue("50–199");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.locator('[name="communications_consent"]'),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.locator("#form-status")).toHaveText("Checked payload.");
});

test("prefill aliases accept multiple records and reject unknown options", async ({
  page,
}) => {
  await page.goto(
    "/intake/?utm_company_size=11-19&utm_data_history=6-10%20years&utm_isBusinessActive=0&utm_record_types=Documents%20%26%20files,Other,invalid,Other&utm_communications_consent=true",
  );
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  await expect(page.locator('[name="size"]')).toHaveValue("11–19");
  await expect(page.locator('[name="history"]')).toHaveValue("6–10 years");
  await expect(page.locator('[name="is_business_active"]')).not.toBeChecked();
  await expect(page.locator('[name="recordTypes"]:checked')).toHaveCount(2);
  await page.goto(
    "/intake/?size=bogus&utm_size=20-49&history=bogus&record_types=unknown&is_business_active=bogus",
  );
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  await expect(page.locator('[name="size"]')).toHaveValue("");
  await expect(page.locator('[name="history"]')).toHaveValue("");
  await expect(page.locator('[name="recordTypes"]:checked')).toHaveCount(0);
});
