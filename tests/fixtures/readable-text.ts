import { expect, type Page } from "@playwright/test";

export async function expectReadableText(page: Page) {
  const undersized = await page.locator("body").evaluate((body) =>
    Array.from(body.querySelectorAll<HTMLElement>("*"))
      .filter((element) => {
        const hasText = Array.from(element.childNodes).some(
          (node) =>
            node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        );
        const style = getComputedStyle(element);
        return (
          hasText &&
          element.getClientRects().length > 0 &&
          style.visibility === "visible" &&
          parseFloat(style.fontSize) < 14
        );
      })
      .map((element) => ({
        text: element.textContent?.trim().slice(0, 80),
        fontSize: getComputedStyle(element).fontSize,
      })),
  );
  expect(undersized).toEqual([]);
}

export async function expectReadableLayout(page: Page) {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectReadableText(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
}
