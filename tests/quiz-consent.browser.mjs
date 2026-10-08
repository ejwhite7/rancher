export async function runQuizConsentBrowser({ browser, base }) {
  const { gunzipSync } = await import("node:zlib");
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const events = [];
  await page.route("https://posthog.test/**", async (route) => {
    const buffer = route.request().postDataBuffer();
    if (buffer) {
      const payload = JSON.parse(
        buffer[0] === 31 && buffer[1] === 139
          ? gunzipSync(buffer).toString()
          : buffer.toString(),
      );
      events.push(
        ...(payload.batch || [payload]).filter((event) =>
          event.event?.startsWith("quiz_"),
        ),
      );
    }
    await route.fulfill({ status: 200, json: { status: 1 } });
  });
  await page.route("**/api/quiz/classify/", (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? { configured: true }
          : {
              top: "AP",
              source: "jev",
              model: "jev-1.13.0",
              confidence: 0.9,
              probabilities: { AO: 0.01, OS: 0.02, MC: 0.03, AP: 0.94 },
            },
    }),
  );
  await page.goto(`${base}/quiz/`);
  await page.locator('input[name="answer"]').first().check();
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".quiz-progress span")?.textContent ===
      "Question 2 of 6–8",
  );
  if (events.length)
    throw new Error("Shares quiz answers before a saved site privacy choice");
  await page.getByRole("button", { name: "Allow all", exact: true }).click();
  await page.waitForFunction(() =>
    performance
      .getEntriesByType("resource")
      .some((entry) => entry.name.includes("posthog-js.js")),
  );
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .find((entry) => entry.name.includes("posthog-js.js")).name;
    const factory = (await import(url)).default;
    const instance = factory.rancherQuiz;
    if (!instance || instance.config.persistence !== "memory")
      throw new Error("Quiz SDK not memory-only");
    // Automated user agents are filtered in production. Override only this isolated synthetic instance.
    instance.set_config({ opt_out_useragent_filter: true });
    instance.capture("quiz_session_started", {
      quiz_session_id: instance.get_distinct_id(),
      quiz_version: "rancher-quiz-v3-jev",
    });
  });
  await page.locator('input[name="answer"]').first().check();
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".quiz-progress span")?.textContent ===
      "Question 3 of 6",
  );
  await page.waitForTimeout(200);
  const answered = events.find((event) => event.event === "quiz_answered");
  if (
    !answered ||
    answered.properties.scoring_source !== "jev" ||
    answered.properties.classifier_model !== "jev-1.13.0" ||
    Object.keys(answered.properties.probabilities).length !== 4
  )
    throw new Error("Consented answer lacks Jev scores/model");
  await page.locator('input[name="answer"]').first().check();
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".quiz-progress span")?.textContent ===
      "Question 4 of 6",
  );
  await page.locator('input[name="answer"]').first().check();
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.locator("#quiz-written").fill("Synthetic written obstacle.");
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".quiz-panel h1")?.textContent ===
      "What would make this worth your time?",
  );
  await page.waitForTimeout(200);
  const written = events.find(
    (event) =>
      event.event === "quiz_answered" &&
      event.properties.question_id === "q4_problem",
  );
  if (
    written?.properties.answer !== "Synthetic written obstacle." ||
    written.properties.answers.q4_problem !== written.properties.answer
  )
    throw new Error("Consented written answer not captured");
  await page
    .getByRole("button", { name: "Privacy choices", exact: true })
    .click();
  const modal = page.locator('[data-consent-tpl="modal"]');
  await modal.getByLabel("Analytics and performance").uncheck();
  await modal
    .getByRole("button", { name: "Save choices", exact: true })
    .click();
  const before = events.length;
  await page
    .locator("#quiz-written")
    .fill("Synthetic desired outcome after withdrawal.");
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.locator("#landing_AP").waitFor();
  await page.waitForTimeout(200);
  if (events.length !== before)
    throw new Error("Analytics continue after site privacy withdrawal");
  await context.close();

  const gpcContext = await browser.newContext({ ignoreHTTPSErrors: true });
  await gpcContext.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
      configurable: true,
      get: () => true,
    }),
  );
  const gpcPage = await gpcContext.newPage();
  let analyticsRequests = 0;
  await gpcPage.route("https://posthog.test/**", (route) => {
    analyticsRequests++;
    return route.fulfill({ status: 200, json: { status: 1 } });
  });
  await gpcPage.route("**/api/quiz/classify/", (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? { configured: true }
          : {
              top: "AO",
              source: "jev",
              model: "jev-1.13.0",
              confidence: 0.9,
              probabilities: { AO: 0.94, OS: 0.02, MC: 0.03, AP: 0.01 },
            },
    }),
  );
  await gpcPage.goto(`${base}/quiz/`);
  await gpcPage.locator('input[name="answer"]').first().check();
  await gpcPage.getByRole("button", { name: "Continue", exact: false }).click();
  await gpcPage.waitForFunction(
    () =>
      document.querySelector(".quiz-progress span")?.textContent ===
      "Question 2 of 6–8",
  );
  if (analyticsRequests) throw new Error("GPC permits quiz analytics");
  await gpcContext.close();
  console.log(
    "Saved site privacy choice, actual SDK payloads, withdrawal and GPC checks passed.",
  );
}
