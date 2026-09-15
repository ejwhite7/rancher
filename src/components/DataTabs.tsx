import type { DataTabsContent } from "../lib/content";
import { useRef, useState, type KeyboardEvent } from "react";
export default function DataTabs({ copy }: { copy: DataTabsContent }) {
  const datasets = copy.items.map((item) => ({
    ...item,
    chips: item.examples.map((example) => example.text),
  }));
  const labels = datasets.map((item) => item.label);
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const data = datasets[active];
  function navigate(event: KeyboardEvent, index: number) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % labels.length
        : event.key === "ArrowLeft"
          ? (index + labels.length - 1) % labels.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? labels.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }
  return (
    <div className="data-layout">
      <div className="tabs" role="tablist" aria-label={copy.tabs_label}>
        {labels.map((label, index) => (
          <button
            type="button"
            className="tab"
            key={label}
            id={`tab-${index}`}
            role="tab"
            ref={(node) => {
              tabs.current[index] = node;
            }}
            aria-controls="data-panel"
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => navigate(event, index)}
          >
            <span className="num">0{index + 1}</span>
            {label}
            <span className="next" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
      <div
        className="data-panel"
        id="data-panel"
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        tabIndex={0}
      >
        <div>
          <h3 id="data-title">{data.title}</h3>
          <p id="data-description">{data.description}</p>
          <div className="chips" id="data-chips">
            {data.chips.map((chip) => (
              <span className="chip" key={chip}>
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="signal">
          <span>{copy.signal_label}</span>
          <p id="data-signal">{data.signal}</p>
        </div>
      </div>
    </div>
  );
}
