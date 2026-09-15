import { writeFile, mkdir } from "node:fs/promises";
export const categories = {
  "licensing-economics": "Licensing & economics",
  "rights-privacy-control": "Rights, privacy & control",
  "business-data-workflows": "Business data & workflows",
  "data-quality-preparation": "Data quality & preparation",
  "ai-training-agents-evaluation": "AI training, agents & evaluation",
  "video-robotics-physical-ai": "Video, robotics & physical AI",
};
const text = (label) => ({ type: "Text", config: { label } }),
  rich = (
    label,
    multi = "paragraph,heading3,heading4,list-item,o-list-item,strong,em,hyperlink",
  ) => ({ type: "StructuredText", config: { label, multi } }),
  relationship = (label, type) => ({
    type: "Link",
    config: { label, select: "document", customtypes: [type] },
  }),
  group = (label, fields) => ({ type: "Group", config: { label, fields } }),
  web = (label) => ({ type: "Link", config: { label, select: "web" } }),
  date = (label) => ({ type: "Date", config: { label } }),
  image = {
    type: "Image",
    config: { label: "Social sharing image", thumbnails: [] },
  };
const shared = {
  navigation: relationship("Site navigation", "navigation"),
  footer: relationship("Site footer", "footer"),
};
export const indexModel = {
  id: "glossary-index",
  label: "Glossary Index",
  repeatable: false,
  status: true,
  format: "page",
  json: {
    Main: {
      title: {
        type: "StructuredText",
        config: { label: "Page heading", single: "heading1" },
      },
      intro: rich("Introduction", "paragraph,hyperlink"),
      search_placeholder: text("Search placeholder"),
      empty_state_title: text("No results heading"),
      empty_state_body: rich("No results guidance", "paragraph,hyperlink"),
      featured_terms: group("Featured terms (up to six)", {
        term: relationship("Featured term", "glossary"),
      }),
      cta_heading: text("Contact invitation heading"),
      cta_body: rich("Contact invitation copy", "paragraph,hyperlink"),
      cta_label: text("Contact button label"),
      cta_link: web("Contact destination"),
      meta_title: text("SEO title"),
      meta_description: text("SEO description"),
      social_image: image,
      ...shared,
    },
  },
};
export const termModel = {
  id: "glossary",
  label: "Glossary Term",
  repeatable: true,
  status: true,
  format: "page",
  json: {
    Main: {
      uid: { type: "UID", config: { label: "URL slug" } },
      term: text("Term"),
      short_definition: text("Short definition"),
      definition: rich("Definition", "paragraph,hyperlink"),
      category: {
        type: "Select",
        config: { label: "Primary category", options: Object.keys(categories) },
      },
      aliases: group("Search aliases", { alias: text("Alias") }),
      how_it_works: rich("How it works"),
      licensing_relevance: rich("Why it matters for licensing"),
      example: rich("Fictional example"),
      limitations: rich("Limitations and misconceptions"),
      review_questions: group("Questions to ask", {
        question: text("Review question"),
      }),
      related_terms: group("Related terms (three to five)", {
        term: relationship("Related term", "glossary"),
      }),
      sources: group("Sources", {
        label: text("Source title"),
        url: web("Source URL"),
        accessed_on: date("Date accessed"),
      }),
      reviewer_name: text("Reviewer public name (completed review only)"),
      reviewer_role: text("Reviewer role"),
      last_reviewed: date("Completed review date"),
      show_cta: {
        type: "Boolean",
        config: {
          label: "Show shared contact invitation",
          default_value: false,
        },
      },
      meta_title: text("SEO title"),
      meta_description: text("SEO description"),
      social_image: image,
      ...shared,
    },
  },
};
if (process.argv[1]?.endsWith("glossary-models.mjs"))
  for (const model of [indexModel, termModel]) {
    await mkdir(`customtypes/${model.id}`, { recursive: true });
    await writeFile(
      `customtypes/${model.id}/index.json`,
      JSON.stringify(model, null, 2) + "\n",
    );
  }
