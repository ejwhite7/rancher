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
  const mock = (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? { configured: true }
          : {
              top: "MC",
              source: "jev",
              model: "jev-1.13.0",
              confidence: 0.9,
              probabilities: { AO: 0.02, OS: 0.04, MC: 0.94 },
            },
    });
  await page.route("**/api/quiz/classify/", mock);
  async function choice(id, value = `${id}_0`) {
    await page.locator(`form[data-question-id="${id}"]`).waitFor();
    await page.locator(`input[value="${value}"]`).check();
    await page.getByRole("button", { name: "Continue", exact: false }).click();
    await page.waitForFunction(
      (previous) =>
        document.querySelector(".quiz-panel form")?.dataset.questionId !==
        previous,
      id,
    );
  }
  await page.goto(`${base}/quiz/`);
  await choice("q1", "q1_2");
  if (events.length)
    throw new Error("Shares answers before saved site consent");
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
      throw new Error("SDK not memory-only");
    instance.set_config({ opt_out_useragent_filter: true }); // Synthetic test instance only.
    instance.capture("quiz_session_started", {
      quiz_session_id: instance.get_distinct_id(),
      quiz_version: "rancher-quiz-v5-sellers-jev",
    });
  });
  await choice("q2", "q2_4");
  await page.waitForTimeout(200);
  const answered = events.find((event) => event.event === "quiz_answered");
  if (
    !answered ||
    answered.properties.scoring_source !== "jev" ||
    answered.properties.classifier_model !== "jev-1.13.0" ||
    Object.keys(answered.properties.probabilities).length !== 3 ||
    answered.properties.quiz_version !== "rancher-quiz-v5-sellers-jev"
  )
    throw new Error("Consented answer lacks current Jev metadata");
  await choice("q3_MC");
  await choice("q4_MC");
  await choice("q5_transaction");
  await choice("q6_timing");
  await page
    .locator("#quiz-written")
    .fill("Synthetic dataset characteristics.");
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.locator('form[data-question-id="q8_discussion"]').waitFor();
  await page.waitForTimeout(200);
  const written = events.find(
    (event) =>
      event.event === "quiz_answered" &&
      event.properties.question_id === "q7_dataset",
  );
  if (
    written?.properties.answer !== "Synthetic dataset characteristics." ||
    written.properties.answers.q7_dataset !== written.properties.answer
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
    .fill("Nothing specific after withdrawal.");
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.locator("#landing_MC").waitFor();
  await page.waitForTimeout(200);
  if (events.length !== before)
    throw new Error("Analytics continue after withdrawal");
  await context.close();

  const gpcContext = await browser.newContext({ ignoreHTTPSErrors: true });
  await gpcContext.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
      configurable: true,
      get: () => true,
    }),
  );
  const gpcPage = await gpcContext.newPage();
  let captured = 0;
  await gpcPage.route("https://posthog.test/**", (route) => {
    captured++;
    return route.fulfill({ status: 200, json: { status: 1 } });
  });
  await gpcPage.route("**/api/quiz/classify/", mock);
  await gpcPage.goto(`${base}/quiz/`);
  await gpcPage.locator('input[value="q1_3"]').check();
  await gpcPage.getByRole("button", { name: "Continue", exact: false }).click();
  await gpcPage.locator('form[data-question-id="q2"]').waitFor();
  if (captured) throw new Error("GPC permits quiz analytics");
  await gpcContext.close();
  console.log(
    "New-prospect SDK saved-consent, written payload, withdrawal, GPC and seller-only v5-cohort checks passed.",
  );
}
