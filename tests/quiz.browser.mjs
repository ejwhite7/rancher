export async function runQuizBrowser({ page }) {
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(12000);
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
  await page.route("**/api/quiz/classify/", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { configured: true } });
    const input = route.request().postDataJSON();
    calls.push(input.answers);
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
        confidence: 0.4,
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
  async function start() {
    await page.goto(`${base}/quiz/`);
    await title.waitFor();
    const allow = page.getByRole("button", { name: "Allow all", exact: true });
    if (await allow.isVisible()) await allow.click();
    await page.waitForFunction(
      () =>
        !document.querySelector('.quiz-actions button[type="submit"]')
          ?.disabled || document.querySelector('input[name="answer"]'),
    );
    check(
      (await page.locator(".header .brand svg path").getAttribute("d")) ===
        "M3 29V6l13-4 13 4v23M3 18l13-4 13 4M10 31V10m12 21V10M3 25l13-4 13 4",
      "Main-site logo not reused",
    );
    check(
      (await page.locator(".footer").count()) === 1,
      "Missing main-site footer",
    );
    check(
      (await page
        .locator(
          ".quiz-kicker, .quiz-header, .quiz-story, input[name=archetype], .quiz-consent",
        )
        .count()) === 0,
      "Unwanted quiz chrome or role picker",
    );
    check(
      !(await title.innerText()).includes("Where do you"),
      "Intro screen remains",
    );
  }
  async function answerChoice() {
    await page.locator('input[name="answer"]').first().check();
    await continueButton.click();
    await page.waitForFunction(
      () =>
        !document
          .querySelector('[type="submit"]')
          ?.textContent?.includes("Working"),
    );
  }
  async function write(text) {
    await page.locator("#quiz-written").fill(text);
    await continueButton.click();
    await page.waitForFunction(
      () =>
        !document
          .querySelector('[type="submit"]')
          ?.textContent?.includes("Working"),
    );
  }
  const banned = [
    "Your notes for the conversation",
    "A verbatim research excerpt",
    "The headline fee isn’t",
    "This is an inquiry, not",
    "Private mode",
    "Written answers provide context",
    "Please leave out",
    "Choose your role",
    "of answer weight",
    "Archive owners",
    "Offer shoppers",
    "Multi-company dealmakers",
    "Acquisition partners",
  ];
  for (const id of ["AO", "OS", "MC", "AP"]) {
    console.log(`Checking ${id}`);
    top = id;
    probability = 0.94;
    await start();
    await answerChoice();
    await answerChoice();
    await answerChoice();
    await write("Synthetic obstacle for this test.");
    check(
      (await title.innerText()) === "What would make this worth your time?",
      "Outcome supporting text is in headline",
    );
    check(
      (await page.locator("#quiz-question-help").innerText()).startsWith(
        "Describe the result you want",
      ),
      "Missing outcome supporting text",
    );
    await write("Synthetic desired result.");
    await page.locator(`#landing_${id}`).waitFor();
    const visible = await page.locator(".quiz-panel").innerText();
    for (const text of banned)
      check(!visible.includes(text), `Rejected text remains: ${text}`);
    if (id === "OS") {
      const cta = page.getByRole("link", { name: "Discuss my existing offer" });
      check(
        (await cta.getAttribute("href")) === "/intake/",
        "Incorrect intake CTA",
      );
      await cta.click();
      await page.waitForURL(/\/intake\/?$/);
      await page.locator(".intake-wizard").waitFor();
      check(
        await page
          .getByRole("heading", { name: "Your details", exact: true })
          .isVisible(),
        "Existing intake wizard is not reachable",
      );
    }
  }
  top = "AO";
  probability = 0.5;
  await start();
  await answerChoice();
  await answerChoice();
  await write("A less certain situation.");
  await write("A useful next conversation.");
  await page.locator("#landing_AO").waitFor();
  check(
    (await page.locator('input[name="archetype"]').count()) === 0,
    "Uncertain result asks for manual classification",
  );
  top = "AO";
  probability = 0.94;
  await start();
  await answerChoice();
  await answerChoice();
  await answerChoice();
  top = "AP";
  await write("Actually I acquire corpora for downstream buyers.");
  await write("Full inventory and delivery terms.");
  await page.locator("#landing_AP").waitFor();
  check(
    calls.at(-1).q4_problem.includes("downstream buyers"),
    "Written answer not sent for classification",
  );
  await start();
  fail = true;
  const originalTitle = await title.innerText();
  await answerChoice();
  check((await title.innerText()) === originalTitle, "Advances when Jev fails");
  check(
    (await page.getByRole("status").innerText()).includes("couldn’t process"),
    "Missing retry error",
  );
  fail = false;
  malformed = true;
  await continueButton.click();
  await page.waitForTimeout(200);
  check(
    (await title.innerText()) === originalTitle,
    "Advances with invalid probability distribution/metadata",
  );
  check(
    await page.locator('input[name="answer"]').first().isChecked(),
    "Invalid response discards current draft",
  );
  malformed = false;
  const beforeRetry = calls.length;
  await page.evaluate(() => {
    const form = document.querySelector(".quiz-panel form");
    form.requestSubmit();
    form.requestSubmit();
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".quiz-progress span")?.textContent ===
      "Question 2",
  );
  check(
    calls.length === beforeRetry + 1,
    "Duplicate submit calls Jev more than once",
  );
  await page.locator('input[name="answer"]').first().check();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await answerChoice();
  check(
    await page.locator('input[name="answer"]').first().isChecked(),
    "Unchanged back navigation loses draft",
  );
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow at ${width}px`,
    );
  }
  check(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  console.log(
    `Quiz browser checks passed; ${calls.length} mocked classifications; no live provider requests.`,
  );
}
