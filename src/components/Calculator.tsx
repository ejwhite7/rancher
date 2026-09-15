import type { CalculatorContent } from "../lib/content";
import { useState, type CSSProperties } from "react";
import { setScenario } from "../lib/scenario";
import {
  calculateEstimate,
  formatEstimate,
  money,
  EMPLOYEES,
  YEARS,
  ESTIMATE_FLOOR,
  REGION_MULTIPLIERS,
  type Region,
} from "../lib/estimate";
export default function Calculator({ copy }: { copy: CalculatorContent }) {
  const [employees, setEmployees] = useState(100);
  const [years, setYears] = useState(10);
  const [country, setCountry] = useState<Region>("USA");
  const estimate = calculateEstimate(employees, years, country);
  function buildBrief() {
    window.posthog?.capture("partnership_explored", {
      employee_count: employees === EMPLOYEES.max ? "200_plus" : employees,
      history_years: years === YEARS.max ? "20_plus" : years,
      company_region: country,
      estimate_below_floor: estimate.belowFloor,
      estimate_open_ended: estimate.openEnded,
    });
    setScenario({
      employees,
      years,
      country,
      brief: `Indicative Handshake benchmark: ${employees === EMPLOYEES.max ? "200+" : employees} employees, ${years === 20 ? "20+" : years} years; ${country}; ${formatEstimate(estimate)} USD (regional factor ${REGION_MULTIPLIERS[country]}×). Not a valuation or quote.`,
    });
  }
  return (
    <div className="calculator">
      <div className="estimate-heading">{copy.estimate_label}</div>
      <div className="estimate" aria-live="polite" aria-atomic="true">
        {estimate.belowFloor ? (
          <>
            <span className="range-dash">{copy.below_floor_label}</span>
            <span id="estimate-cap">{money.format(ESTIMATE_FLOOR)}</span>
          </>
        ) : (
          <>
            <span id="estimate-low">{money.format(estimate.low)}</span>
            <span className="range-dash">—</span>
            <span id="estimate-high">
              {money.format(estimate.high)}
              {estimate.openEnded ? "+" : ""}
            </span>
          </>
        )}
      </div>
      <p className="estimate-caption">{copy.disclaimer}</p>
      <div className="calc-controls">
        <div className="range-card">
          <label htmlFor="employees">
            {copy.employees_label}{" "}
            <output id="employee-value" htmlFor="employees">
              {employees === EMPLOYEES.max ? "200+" : employees}
            </output>
          </label>
          <input
            type="range"
            id="employees"
            min={EMPLOYEES.min}
            max={EMPLOYEES.max}
            step={EMPLOYEES.step}
            value={employees}
            onChange={(event) => setEmployees(Number(event.target.value))}
            style={
              {
                "--fill": `${((employees - EMPLOYEES.min) / (EMPLOYEES.max - EMPLOYEES.min)) * 100}%`,
              } as CSSProperties
            }
          />
          <div className="range-limits">
            <span>20</span>
            <span>200+</span>
          </div>
        </div>
        <div className="range-card">
          <label htmlFor="years">
            {copy.years_label}{" "}
            <output id="year-value" htmlFor="years">
              {years === 20 ? "20+" : years}
            </output>
          </label>
          <input
            type="range"
            id="years"
            min={YEARS.min}
            max={YEARS.max}
            step="1"
            value={years}
            onChange={(event) => setYears(Number(event.target.value))}
            style={
              {
                "--fill": `${((years - YEARS.min) / (YEARS.max - YEARS.min)) * 100}%`,
              } as CSSProperties
            }
          />
          <div className="range-limits">
            <span>{copy.years_min_label}</span>
            <span>{copy.years_max_label}</span>
          </div>
        </div>
        <fieldset className="country-card">
          <legend>{copy.region_label}</legend>
          <div className="country-options">
            <label>
              <input
                type="radio"
                name="calc-country"
                value="USA"
                checked={country === "USA"}
                onChange={() => setCountry("USA")}
              />
              <span>{copy.usa_label}</span>
            </label>
            <label>
              <input
                type="radio"
                name="calc-country"
                value="Canada"
                checked={country === "Canada"}
                onChange={() => setCountry("Canada")}
              />
              <span>{copy.canada_label}</span>
            </label>
            <label>
              <input
                type="radio"
                name="calc-country"
                value="Europe"
                checked={country === "Europe"}
                onChange={() => setCountry("Europe")}
              />
              <span>{copy.europe_label}</span>
            </label>
            <label>
              <input
                type="radio"
                name="calc-country"
                value="Other"
                checked={country === "Other"}
                onChange={() => setCountry("Other")}
              />
              <span>{copy.other_label}</span>
            </label>
          </div>
        </fieldset>
      </div>
      <a
        className="btn"
        id="estimate-cta"
        onClick={buildBrief}
        href={copy.cta_link}
      >
        {copy.cta_label} <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
