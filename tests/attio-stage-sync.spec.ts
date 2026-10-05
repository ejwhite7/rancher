import { expect, test } from "@playwright/test";
import { stageForSheetStatus } from "../src/server/attio-stage-sync";

test("maps supported sheet statuses to Attio stages", () => {
  expect(stageForSheetStatus("Introduced")).toBe("Introduced");
  expect(stageForSheetStatus(" Inventory ")).toBe("Inventory");
  expect(stageForSheetStatus("Rejected")).toBe("Lost");
  expect(stageForSheetStatus("Closed Won")).toBe("Won 🎉");
  expect(stageForSheetStatus("Pending")).toBeNull();
});
