import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  filterGlossary,
  glossaryCategories,
  type GlossaryRecord,
} from "../lib/glossary-search";
interface Props {
  records: GlossaryRecord[];
  placeholder: string;
  emptyTitle: string;
  children?: ReactNode;
  preview?: boolean;
}
export default function GlossarySearch({
  records,
  placeholder,
  emptyTitle,
  children,
  preview = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const results = useMemo(
    () => filterGlossary(records, query, category),
    [records, query, category],
  );
  // Ranking determines the first group and the order inside it. Each letter remains
  // a single anchor rather than another filter, even while searching.
  const groups = new Map<string, GlossaryRecord[]>();
  for (const record of results) {
    const letter = record.term[0].toLocaleUpperCase("en-US");
    groups.set(letter, [...(groups.get(letter) || []), record]);
  }
  useEffect(() => {
    if (preview || (!query && !category)) return;
    const timer = setTimeout(() => {
      const posthog = (
        window as unknown as {
          posthog?: {
            capture: (event: string, props: Record<string, unknown>) => void;
          };
        }
      ).posthog;
      posthog?.capture("glossary_filter_used", {
        category: category || "all",
        has_query: Boolean(query.trim()),
        result_count: results.length,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [query, category, results.length, preview]);
  return (
    <div className="glossary-browser">
      <noscript>
        <p>
          All terms are listed below. Use the A–Z links or your browser’s Find
          command to browse.
        </p>
      </noscript>
      <div className="glossary-controls" hidden={!ready}>
        <div>
          <label htmlFor="glossary-search">Search glossary terms</label>
          <input
            id="glossary-search"
            type="search"
            autoComplete="off"
            className="ph-no-capture ph-no-heatmaps"
            data-ph-mask
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
          />
        </div>
        <div>
          <label htmlFor="glossary-category">Category</label>
          <select
            id="glossary-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {Object.entries(glossaryCategories).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="glossary-clear"
          onClick={() => {
            setQuery("");
            setCategory("");
          }}
        >
          Clear filters
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="glossary-count"
      >
        {results.length} {results.length === 1 ? "term" : "terms"} ·{" "}
        {glossaryCategories[category as keyof typeof glossaryCategories] ||
          "All categories"}
      </p>
      <nav className="glossary-az" aria-label="Glossary letters">
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) =>
          groups.has(letter) ? (
            <a key={letter} href={`#letter-${letter}`}>
              {letter}
            </a>
          ) : (
            <span key={letter} aria-disabled="true">
              {letter}
            </span>
          ),
        )}
      </nav>
      {results.length === 0 ? (
        <section className="glossary-empty">
          <h2>{emptyTitle}</h2>
          {children}
        </section>
      ) : (
        <div className="glossary-results">
          {[...groups].map(([letter, terms]) => (
            <section
              key={letter}
              id={`letter-${letter}`}
              className="glossary-letter"
              aria-labelledby={`heading-${letter}`}
            >
              <h2 id={`heading-${letter}`}>{letter}</h2>
              <dl>
                {terms.map((term) => (
                  <div key={term.id} className="glossary-card">
                    <dt>
                      <a href={term.url}>{term.term}</a>
                    </dt>
                    <dd>{term.short_definition}</dd>
                    <dd className="glossary-category-name">
                      {glossaryCategories[term.category]}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
