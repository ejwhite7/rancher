import { expect, test } from "@playwright/test";
import { describeMovement, summarize } from "../src/server/pipeline-report";

test("weights pipeline stages and describes movement", () => {
  const previous = [{ id: "1", name: "Acme", stage: "Discovery", value: 100 }];
  const current = [
    { id: "1", name: "Acme", stage: "Introduced", value: 100 },
    { id: "2", name: "Beta", stage: "Inventory", value: 200 },
  ];
  const summary = summarize(current);
  expect(summary.find(({ stage }) => stage === "Introduced")?.weighted).toBe(50);
  expect(summary.find(({ stage }) => stage === "Inventory")?.weighted).toBe(160);
  expect(describeMovement(previous, current)).toBe("Acme: Discovery → Introduced\nBeta: new in Inventory");
});
