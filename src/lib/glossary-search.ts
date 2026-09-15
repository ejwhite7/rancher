export const glossaryCategories = {
  "licensing-economics": "Licensing & economics",
  "rights-privacy-control": "Rights, privacy & control",
  "business-data-workflows": "Business data & workflows",
  "data-quality-preparation": "Data quality & preparation",
  "ai-training-agents-evaluation": "AI training, agents & evaluation",
  "video-robotics-physical-ai": "Video, robotics & physical AI",
} as const;
export type GlossaryCategory = keyof typeof glossaryCategories;
export type GlossaryRecord = {
  id: string;
  uid: string;
  term: string;
  short_definition: string;
  category: GlossaryCategory;
  aliases: string[];
  url: string;
};
export function normalizeSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}
export function compareTerms(a: { term: string }, b: { term: string }) {
  return a.term.localeCompare(b.term, "en-US", { sensitivity: "base" });
}
export function filterGlossary(
  records: GlossaryRecord[],
  query: string,
  category: string,
) {
  const q = normalizeSearch(query);
  const score = (r: GlossaryRecord) => {
    const names = [r.term, ...r.aliases].map(normalizeSearch);
    if (!q || names.includes(q)) return 0;
    if (names.some((n) => n.startsWith(q))) return 1;
    if (
      names.some((n) => n.includes(q)) ||
      normalizeSearch(r.short_definition).includes(q)
    )
      return 2;
    return 3;
  };
  return records
    .filter((r) => (!category || r.category === category) && score(r) < 3)
    .sort((a, b) => score(a) - score(b) || compareTerms(a, b));
}
