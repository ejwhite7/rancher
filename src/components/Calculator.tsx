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
export default function Calculator() {
  const [employees, setEmployees] = useState(100);
  const [years, setYears] = useState(10);
  const [country, setCountry] = useState<Region>("USA");
  const estimate = calculateEstimate(employees, years, country);
  function buildBrief() {
    setScenario({
      employees,
      years,
      country,
      brief: `Indicative Handshake benchmark: ${employees === EMPLOYEES.max ? "200+" : employees} employees, ${years === 20 ? "20+" : years} years; ${country}; ${formatEstimate(estimate)} USD (regional factor ${REGION_MULTIPLIERS[country]}×). Not a valuation or quote.`,
    });
  }
  return (
    <div className="calculator">
      <div className="estimate-heading">
        Estimated payout range
      </div>
      <div className="estimate" aria-live="polite" aria-atomic="true">
        {estimate.belowFloor ? (
          <>
            <span className="range-dash">Up to</span>
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
      <p className="estimate-caption">
        A starting point for a conversation. Not a quote or guaranteed earnings.
      </p>
      <div className="calc-controls">
        <div className="range-card">
          <label htmlFor="employees">
            Number of employees{" "}
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
            Years of available history{" "}
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
            <span>3 years</span>
            <span>20+ years</span>
          </div>
        </div>
        <fieldset className="country-card">
          <legend>Company location</legend>
          <div className="country-options">
            <label>
              <input
                type="radio"
                name="calc-country"
                value="USA"
                checked={country === "USA"}
                onChange={() => setCountry("USA")}
              />
              <span>USA</span>
            </label>
            <label>
              <input
                type="radio"
                name="calc-country"
                value="Canada"
                checked={country === "Canada"}
                onChange={() => setCountry("Canada")}
              />
              <span>Canada</span>
            </label>
            <label>
              <input
                type="radio"
                name="calc-country"
                value="Europe"
                checked={country === "Europe"}
                onChange={() => setCountry("Europe")}
              />
              <span>Europe</span>
            </label>
            <label>
              <input
                type="radio"
                name="calc-country"
                value="Other"
                checked={country === "Other"}
                onChange={() => setCountry("Other")}
              />
              <span>Other</span>
            </label>
          </div>
        </fieldset>
      </div>
      <a className="btn" id="estimate-cta" onClick={buildBrief} href="#contact">
        Explore my partnership <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
