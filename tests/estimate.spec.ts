import { test, expect } from "@playwright/test";
import cases from "./fixtures/handshake-calculator.json" with { type: "json" };
import {
  calculateEstimate,
  formatEstimate,
  type Region,
} from "../src/lib/estimate";

test("formula matches captured live Handshake outputs in every region", () => {
  for (const row of cases) {
    expect(
      formatEstimate(
        calculateEstimate(row.employees, row.years, row.region as Region),
      ),
      JSON.stringify(row),
    ).toBe(row.display.replace(" - ", "–"));
  }
});

test("rejects unsupported inputs rather than extrapolating the benchmark", () => {
  for (const [employees, years, region] of [
    [19, 10, "USA"],
    [201, 10, "USA"],
    [100, 2, "USA"],
    [100, 21, "USA"],
    [NaN, 10, "USA"],
    [100, Infinity, "USA"],
    [20.5, 10, "USA"],
    [100, 10, "Unknown"],
  ] as const) {
    expect(() => calculateEstimate(employees, years, region as Region)).toThrow(
      RangeError,
    );
  }
});
