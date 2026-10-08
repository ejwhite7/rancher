export async function runQuizBrowser({ page }) {
  page.setDefaultTimeout(8000);
  const base = new URL(page.url()).origin;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  let top = "AO",
    probability = 0.94,
    fail = false,
    malformed = false;
  const calls = [];
  await page.addInitScript(() => {
    Math.random = () => 0;
  }); // Deterministic shuffle only in this synthetic browser.
  await page.route("**/api/quiz/classify/", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { configured: true } });
    calls.push(route.request().postDataJSON().answers);
    if (fail)
      return route.fulfill({
        status: 502,
        json: { error: "We couldn’t process your answer. Please try again." },
      });
    if (malformed)
      return route.fulfill({
        json: {
          top: "AP",
          source: "jev",
          probabilities: { AO: 0, OS: 0, MC: 0, AP: 0 },
        },
      });
    return route.fulfill({
      json: {
        top,
        source: "jev",
        model: "jev-1.13.0",
        confidence: 0.99,
        probabilities: Object.fromEntries(
          ["AO", "OS", "MC", "AP"].map((id) => [
            id,
            id === top ? probability : (1 - probability) / 3,
          ]),
        ),
      },
    });
  });
  await page.route("https://posthog.test/**", (route) =>
    route.fulfill({ status: 200, json: { status: 1 } }),
  );
  const title = page.locator(".quiz-panel h1");
  const continueButton = page.getByRole("button", {
    name: "Continue",
    exact: false,
  });
  const current = () =>
    page.locator(".quiz-panel form").getAttribute("data-question-id");
  async function start() {
    await page.goto(`${base}/quiz/`);
    await page.locator('input[value="q1_0"]').waitFor();
    const allow = page.getByRole("button", { name: "Allow all", exact: true });
    if (await allow.isVisible()) await allow.click();
    await page.waitForFunction(
      () => document.querySelector(".quiz-options")?.disabled === false,
    );
    check(
      (await page.locator(".quiz-option-number").count()) === 0,
      "Selection numbers remain",
    );
    check(
      (await page.locator(".footer").count()) === 1,
      "Missing main-site footer",
    );
    check(
      (await page.locator(".header .brand svg path").getAttribute("d")) ===
        "M3 29V6l13-4 13 4v23M3 18l13-4 13 4M10 31V10m12 21V10M3 25l13-4 13 4",
      "Wrong main-site logo",
    );
    check(
      (
        await page
          .locator('input[name="answer"]')
          .evaluateAll((inputs) => inputs.map((input) => input.value))
      ).join(",") !== "q1_0,q1_1,q1_2,q1_3,q1_4",
      "Options were not shuffled",
    );
  }
  async function answerChoice(value) {
    const id = await current();
    await page.locator(`input[value="${value || `${id}_0`}"]`).check();
    await continueButton.click();
    await page.waitForFunction(
      (previous) =>
        document.querySelector(".quiz-panel form")?.dataset.questionId !==
        previous,
      id,
    );
  }
  async function write(text) {
    const id = await current();
    await page.locator("#quiz-written").fill(text);
    await continueButton.click();
    await page.waitForFunction(
      (previous) =>
        document.querySelector(".quiz-panel form")?.dataset.questionId !==
        previous,
      id,
    );
  }
  for (const id of ["AO", "OS", "MC", "AP"]) {
    top = id;
    probability = 0.94;
    await start();
    const before = calls.length;
    await answerChoice(`q1_${["AO", "OS", "MC", "AP"].indexOf(id)}`);
    check(
      (await title.innerText()) ===
        "Which describes where you are in the process?",
      "Wrong process question",
    );
    await answerChoice(`q2_${{ AO: 0, OS: 3, MC: 4, AP: 5 }[id]}`);
    await answerChoice();
    const motivation = await current();
    check(
      motivation ===
        (id === "AP" ? "q4_AP" : id === "MC" ? "q4_MC" : "q4_motivation"),
      "Wrong motivation branch",
    );
    await answerChoice();
    check(
      (await title.innerText()).includes(
        id === "AP" ? "budget" : "hoping to receive",
      ),
      "Wrong money question",
    );
    await answerChoice();
    check(
      (await title.innerText()) ===
        "How quickly are you hoping to make a decision?",
      "Wrong timing question",
    );
    check(
      (await page.locator("textarea").count()) === 0,
      "Timing must be discrete choices",
    );
    await answerChoice();
    check(
      (await title.innerText()).startsWith("Does your dataset contain"),
      "Wrong dataset question",
    );
    await write("Synthetic dataset characteristics, no actual records.");
    check(
      (await title.innerText()) ===
        "Is there anything in particular that you would like to discuss?",
      "Wrong discussion question",
    );
    check(
      (await page.locator("#quiz-question-help").innerText()).includes(
        "existing open offers",
      ),
      "Missing relevant offer terms prompt",
    );
    await write(
      id === "OS"
        ? "Synthetic offer terms for comparison."
        : "Nothing specific.",
    );
    await page.locator(`#landing_${id}`).waitFor();
    check(calls.length - before === 8, `${id}: not exactly eight submissions`);
    for (const banned of [
      "Archive owners",
      "Offer shoppers",
      "Multi-company dealmakers",
      "Acquisition partners",
      "Your notes for the conversation",
      "A verbatim research excerpt",
    ])
      check(
        !(await page.locator(".quiz-panel").innerText()).includes(banned),
        `Rejected public copy: ${banned}`,
      );
    if (id === "OS") {
      const cta = page.getByRole("link", { name: "Discuss my existing offer" });
      check(
        (await cta.getAttribute("href")) === "/intake/",
        "Wrong intake destination",
      );
      await cta.click();
      await page.locator(".intake-wizard").waitFor();
    }
  }
  top = "AP";
  probability = 0.85;
  await start();
  await answerChoice("q1_4");
  await answerChoice("q2_6");
  check(
    (await current()) === "q3_shared",
    "Cutoff equality incorrectly branches",
  );
  await answerChoice("q3_shared_5");
  check(
    (await current()) === "q4_shared",
    "Uncertainty did not use shared motivation",
  );
  probability = 0.94;
  await answerChoice();
  check(
    (await current()) === "q5_AP",
    "Fresh Jev correction did not select buyer budget",
  );
  await answerChoice();
  await answerChoice();
  top = "OS";
  await write(
    "Actually, I supply our own archive and have an existing licensing offer to compare.",
  );
  await write("Synthetic offer terms, exclusivity and deadline.");
  await page.locator("#landing_OS").waitFor();
  check(
    calls.at(-1).q7_dataset.includes("existing licensing offer"),
    "Written correction omitted from active history",
  );

  top = "AO";
  await start();
  const firstOrder = await page
    .locator('input[name="answer"]')
    .evaluateAll((inputs) => inputs.map((input) => input.value));
  fail = true;
  await page.locator('input[value="q1_0"]').check();
  await continueButton.click();
  await page
    .getByRole("status")
    .getByText(/couldn’t process/)
    .waitFor();
  check((await current()) === "q1", "Failure advanced the quiz");
  fail = false;
  malformed = true;
  await continueButton.click();
  await page.waitForTimeout(150);
  check((await current()) === "q1", "Malformed DTO advanced the quiz");
  check(
    await page.locator('input[value="q1_0"]').isChecked(),
    "Retry lost selected ID",
  );
  malformed = false;
  const before = calls.length;
  await page.evaluate(() => {
    const form = document.querySelector(".quiz-panel form");
    form.requestSubmit();
    form.requestSubmit();
  });
  await page.locator('form[data-question-id="q2"]').waitFor();
  check(
    calls.length === before + 1,
    "Duplicate submit invoked classification twice",
  );
  const secondOrder = await page
    .locator('input[name="answer"]')
    .evaluateAll((inputs) => inputs.map((input) => input.value));
  await page.locator('input[value="q2_3"]').check();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  check(
    JSON.stringify(firstOrder) ===
      JSON.stringify(
        await page
          .locator('input[name="answer"]')
          .evaluateAll((inputs) => inputs.map((input) => input.value)),
      ),
    "Back reshuffled prior options",
  );
  check(
    await page.locator('input[value="q1_0"]').isChecked(),
    "Back lost selected answer",
  );
  await answerChoice("q1_0");
  check(
    JSON.stringify(secondOrder) ===
      JSON.stringify(
        await page
          .locator('input[name="answer"]')
          .evaluateAll((inputs) => inputs.map((input) => input.value)),
      ),
    "Returning reshuffled options",
  );
  check(
    await page.locator('input[value="q2_3"]').isChecked(),
    "Returning lost draft ID",
  );
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow at ${width}`,
    );
  }
  check(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  console.log(
    `New-prospect browser checks passed: shuffled stable IDs/order, no numbers, all four eight-question landings, written corrections, retry/back and responsive checks; ${calls.length} mocked classifications.`,
  );
}
