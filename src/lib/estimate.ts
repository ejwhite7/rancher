/** Public Handshake AI calculator benchmark, checked 2026-09-12.
 * Evidence and Troveo comparison: docs/calculator-audit.md.
 * This reproduces an indicative calculator, not observed transaction prices.
 */
export const EMPLOYEES = { min: 20, max: 200, step: 1 } as const;
export const YEARS = { min: 3, max: 20, step: 1 } as const;
export const REGION_MULTIPLIERS = {
  USA: 1,
  Canada: 0.75,
  Europe: 0.75,
  Other: 0.3,
} as const;
export type Region = keyof typeof REGION_MULTIPLIERS;
export const ESTIMATE_FLOOR = 100_000;
export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
export type Estimate = {
  low: number;
  high: number;
  belowFloor: boolean;
  openEnded: boolean;
};

export function calculateEstimate(
  employees: number,
  years: number,
  region: Region,
): Estimate {
  if (
    !Number.isInteger(employees) ||
    employees < EMPLOYEES.min ||
    employees > EMPLOYEES.max ||
    !Number.isInteger(years) ||
    years < YEARS.min ||
    years > YEARS.max ||
    !Object.hasOwn(REGION_MULTIPLIERS, region)
  ) {
    throw new RangeError(
      "Estimate inputs must be 20–200 employees, 3–20 years, and a supported region.",
    );
  }
  const multiplier = REGION_MULTIPLIERS[region];
  const employeeYears = employees * years;
  const lowTB = Math.max(0.1, employeeYears / 1000);
  const highTB = Math.max(0.2, (employeeYears * 14) / 1000);
  const base = 140_000 + employees * 2333 + years * 11667;
  // Keep the source's intermediate rounding: applying 1.01 before rounding differs by $1.
  const uplift = (value: number) =>
    Math.max(value + 1, Math.ceil(value * 1.01));
  const lowBase = Math.round(0.75 * (base + lowTB * 1000 * 15.75) * multiplier);
  const highBase = Math.round(
    1.25 * (base + highTB * 1000 * 15.75) * multiplier,
  );
  const smallCompanyAdjustment =
    69_102 * multiplier * Math.max(0, (50 - employees) / 30);
  const low = Math.round(uplift(lowBase) - smallCompanyAdjustment);
  const high = uplift(highBase);
  return {
    low,
    high,
    belowFloor: low < ESTIMATE_FLOOR,
    openEnded: employees === EMPLOYEES.max && years === YEARS.max,
  };
}

export function formatEstimate(estimate: Estimate) {
  return estimate.belowFloor
    ? `Up to ${money.format(ESTIMATE_FLOOR)}`
    : `${money.format(estimate.low)}–${money.format(estimate.high)}${estimate.openEnded ? "+" : ""}`;
}
