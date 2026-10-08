import { expect, test } from "@playwright/test";
import { runQuizBrowser } from "./quiz.browser.mjs";
import { runQuizConsentBrowser } from "./quiz-consent.browser.mjs";
import { collectBrowserCoverage } from "../scripts/quiz-browser-coverage.mjs";

test("unavailable or failed readiness prevents submissions without discarding the opening", async ({
  page,
}) => {
  const stop = await collectBrowserCoverage(page);
  let networkFailure = true;
  let posts = 0;
  await page.route("**/api/quiz/classify/", (route) => {
    if (route.request().method() !== "GET") posts++;
    return networkFailure
      ? route.abort("failed")
      : route.fulfill({ status: 503, json: { configured: false } });
  });
  try {
    for (const failed of [true, false]) {
      networkFailure = failed;
      await page.goto("/quiz/");
      await expect(page.getByRole("status")).toContainText(
        "temporarily unavailable",
      );
      await expect(
        page.getByRole("button", { name: "Continue", exact: false }),
      ).toBeDisabled();
      await page
        .locator(".quiz-panel form")
        .evaluate((form) => (form as HTMLFormElement).requestSubmit());
      await expect(page.locator(".quiz-panel h1")).toHaveText(
        "What would you like to do with your business data?",
      );
    }
    expect(posts).toBe(0);
  } finally {
    await stop();
  }
});

test("seller quiz browser behavior and consent generate source-mapped coverage", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await page.goto("/quiz/");
  const base = new URL(page.url()).origin;
  const stop = await collectBrowserCoverage(page);
  try {
    await runQuizBrowser({ page });
    await runQuizConsentBrowser({
      browser,
      base,
      coverage: collectBrowserCoverage,
    });
  } finally {
    await stop();
  }
});
