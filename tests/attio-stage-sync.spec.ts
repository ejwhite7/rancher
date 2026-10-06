import { test, expect } from "@playwright/test";
import {
  stageForSheetRow,
  stageForSheetStatus,
} from "../src/server/attio-stage-sync";

test("maps supported sheet statuses to Attio deal stages", () => {
  expect(stageForSheetStatus("Introduced")).toBe("Introduced");
  expect(stageForSheetStatus("inventory")).toBe("Inventory");
  expect(stageForSheetStatus("Rejected")).toBe("Lost");
  expect(stageForSheetStatus(" Closed Lost ")).toBe("Lost");
  expect(stageForSheetStatus("Closed Won")).toBe("Won 🎉");
});

test("reads status from column G, not data sources in column H", () => {
  expect(stageForSheetRow(["", "", "", "", "", "", "Introduced", "CRM"])).toBe(
    "Introduced",
  );
  expect(
    stageForSheetRow(["", "", "", "", "", "", "", "Closed Won"]),
  ).toBeNull();
});

test("ignores empty and unsupported sheet statuses", () => {
  expect(stageForSheetStatus("")).toBeNull();
  expect(stageForSheetStatus("  ")).toBeNull();
  expect(stageForSheetStatus("Discovery")).toBeNull();
  expect(stageForSheetStatus("Maybe")).toBeNull();
  expect(stageForSheetStatus(42)).toBeNull();
});
