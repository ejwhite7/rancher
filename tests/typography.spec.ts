import { expect, test } from "@playwright/test";
import {
  expectReadableLayout,
  expectReadableText,
} from "./fixtures/readable-text";

for (const path of [
  "/",
  "/intake/",
  "/contact/",
  "/referral/",
  "/quiz/",
  "/blog/",
  "/privacy-policy/",
  "/terms-of-use/",
]) {
  test(`text stays at least 14px on ${path}`, async ({ page }) => {
    await page.route("**/api/quiz/classify/", (route) =>
      route.fulfill({ json: { configured: true } }),
    );
    await page.route("**/ingest/**", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
    await expectReadableLayout(page);
  });
}

test("homepage omits the requested copy and keeps privacy controls readable", async ({
  page,
}) => {
  await page.goto("/");
  for (const text of [
    "Let’s see what’s possible",
    "No data uploads. No system credentials.",
    "Just a starting point for a better conversation.",
    "Your data. Your boundaries.",
    "Examples of data to assess—not a request for unrestricted access.",
  ]) {
    await expect(page.getByText(text, { exact: false })).toHaveCount(0);
  }
  await expect(
    page.getByRole("combobox", {
      name: "Company Size (FTE Count)",
      exact: true,
    }),
  ).toHaveCount(1);
  const activeCompany = page.locator("label.business-active");
  await expect(activeCompany).toHaveCSS("margin-top", "0px");
  await expect(activeCompany).toHaveCSS("margin-bottom", "0px");
  await page.getByRole("button", { name: "Manage choices" }).click();
  await expect(page.locator('[data-consent-tpl="modal"]')).toBeVisible();
  await expectReadableText(page);
});
