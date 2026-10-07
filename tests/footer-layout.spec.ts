import { test, expect } from "@playwright/test";

test("footer fills short-page viewport space without overlapping long content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  for (const path of ["/intake/", "/contact/"]) {
    await page.goto(path);
    const layout = await page.evaluate(() => ({
      footer: document.querySelector("footer")!.getBoundingClientRect().bottom,
      height: innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    expect(layout.footer).toBeCloseTo(layout.height, 0);
    expect(layout.scrollHeight).toBe(layout.height);
  }
  await page.setViewportSize({ width: 375, height: 667 });
  for (const path of ["/intake/", "/"]) {
    await page.goto(path);
    const layout = await page.evaluate(() => ({
      footer: document.querySelector("footer")!.getBoundingClientRect().top,
      content: document.querySelector("main")!.getBoundingClientRect().bottom,
      scrollHeight: document.documentElement.scrollHeight,
      height: innerHeight,
    }));
    expect(layout.footer).toBeGreaterThanOrEqual(layout.content - 1);
    expect(layout.scrollHeight).toBeGreaterThan(layout.height);
  }
});
