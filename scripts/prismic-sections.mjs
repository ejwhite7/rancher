// One-time conversion from the original fragment model to page sections.
// All values come from the supplied document; no editorial copy is replaced.
export const text = (label) => ({ type: "Text", config: { label } });
export const rich = (label, multi = "paragraph,strong,em,hyperlink") => ({
  type: "StructuredText",
  config: { label, multi },
});
export const heading = (label = "Heading", level = "heading2") => ({
  type: "StructuredText",
  config: { label, single: `${level},strong,em` },
});
export const link = (label) => ({
  type: "Link",
  config: { label, select: "web" },
});
export const image = (label) => ({
  type: "Image",
  config: { label, thumbnails: [] },
});
export const group = (label, fields) => ({
  type: "Group",
  config: { label, fields },
});
export const rt = (text, type = "paragraph", spans = []) => [
  { type, text, spans },
];
export const url = (value) => ({ link_type: "Web", url: value });
const slice = (id, primary, items = []) => ({
  slice_type: id,
  variation: "default",
  primary,
  items,
});
const shared = (id, name, primary, items = {}) => ({
  id,
  type: "SharedSlice",
  name,
  description: `${name} section of the Rancher homepage.`,
  variations: [
    {
      id: "default",
      name: "Default",
      docURL: "",
      version: "initial",
      description: name,
      imageUrl: "",
      primary,
      items,
    },
  ],
});
export const sliceModels = [
  shared(
    "navigation",
    "Navigation",
    {
      brand_name: text("Brand name"),
      brand_label: text("Home link accessibility label"),
      menu_label: text("Menu button accessibility label"),
      nav_label: text("Navigation accessibility label"),
      cta_label: text("Button label"),
      cta_link: link("Button destination"),
    },
    { label: text("Link label"), link: link("Link destination") },
  ),
  shared(
    "hero",
    "Hero",
    {
      heading: heading("Main headline", "heading1"),
      description: rich("Introduction"),
      cta_label: text("Primary button label"),
      cta_link: link("Primary button destination"),
      secondary_label: text("Secondary link label"),
      secondary_link: link("Secondary link destination"),
      illustration_alt: text("Illustration description"),
      source_label: text("Illustration: source label"),
      source_caption: text("Illustration: source caption"),
      outcome_label: text("Illustration: outcome label"),
      outcome_caption: text("Illustration: outcome caption"),
      trust_heading: text("Reassurance heading"),
    },
    { text: text("Reassurance point") },
  ),
  shared("opportunity", "The opportunity", {
    eyebrow: text("Section label"),
    heading: heading(),
    lead: rich("Lead paragraph"),
    body: rich("Explanation"),
  }),
  shared("calculator", "Opportunity calculator", {
    heading: heading(),
    estimate_label: text("Result label"),
    below_floor_label: text("Low-range prefix"),
    disclaimer: text("Estimate disclaimer"),
    employees_label: text("Employee slider label"),
    years_label: text("History slider label"),
    years_min_label: text("Minimum history label"),
    years_max_label: text("Maximum history label"),
    region_label: text("Region selector label"),
    usa_label: text("USA option label"),
    canada_label: text("Canada option label"),
    europe_label: text("Europe option label"),
    other_label: text("Other region label"),
    cta_label: text("Button label"),
    cta_link: link("Button destination"),
  }),
  shared(
    "data_categories",
    "Data categories",
    {
      heading: heading(),
      note: rich("Eligibility note"),
      tabs_label: text("Tabs accessibility label"),
      signal_label: text("Signal panel label"),
    },
    {
      label: text("Tab label"),
      title: text("Category heading"),
      description: text("Category description"),
      examples: rich("Example record types", "list-item"),
      signal: text("Potential signal"),
    },
  ),
  shared(
    "use_cases",
    "Use cases",
    {
      heading: heading(),
      description: rich("Introduction"),
      custom_eyebrow: text("Custom systems: section label"),
      custom_title: text("Custom systems: heading"),
      custom_description: rich("Custom systems: description"),
      cta_label: text("Custom systems: button label"),
      cta_link: link("Custom systems: button destination"),
      note: rich("Platform disclaimer"),
    },
    {
      title: text("Card heading"),
      description: text("Card description"),
      platforms: text("Platform names"),
      image: image("Platform logos"),
    },
  ),
  shared(
    "process",
    "How it works",
    {
      eyebrow: text("Section label"),
      heading: heading(),
      description: rich("Introduction"),
      cta_label: text("Button label"),
      cta_link: link("Button destination"),
    },
    { title: text("Step heading"), description: text("Step explanation") },
  ),
  shared(
    "protection",
    "Data protection",
    {
      eyebrow: text("Section label"),
      heading: heading(),
      description: rich("Introduction"),
      checks: group("Control checklist", { text: text("Checklist point") }),
      demo_heading: text("Illustration heading"),
      source_label: text("Source record label"),
      source_record: rich(
        "Source record (bold identifies sensitive text)",
        "paragraph,strong",
      ),
      prepared_label: text("Prepared record label"),
      prepared_record: rich(
        "Prepared record (bold identifies replacements)",
        "paragraph,strong",
      ),
    },
    {
      title: text("Principle heading"),
      description: text("Principle explanation"),
    },
  ),
  shared(
    "faq",
    "Frequently asked questions",
    { heading: heading(), description: rich("Introduction") },
    { question: text("Question"), answer: rich("Answer") },
  ),
  shared("contact", "Contact and partnership form", {
    eyebrow: text("Section label"),
    heading: heading(),
    description: rich("Introduction"),
    note: rich("Privacy reassurance"),
    form: {
      type: "Link",
      config: {
        label: "Partnership form",
        select: "document",
        customtypes: ["form"],
      },
    },
  }),
  shared("footer", "Footer", {
    brand_name: text("Brand name"),
    brand_label: text("Home link accessibility label"),
    copyright: text("Copyright text (year added automatically)"),
    nav_label: text("Footer navigation accessibility label"),
    faq_label: text("FAQ link label"),
    privacy_label: text("Privacy link label"),
    terms_label: text("Terms link label"),
    information_label: text("Site information link label"),
    cta_label: text("Partnership link label"),
    cta_link: link("Partnership link destination"),
    dialog_heading: text("Site information heading"),
    dialog_body: rich("Site information content"),
    close_label: text("Dialog close button label"),
  }),
];
export const homepageModel = {
  id: "homepage",
  label: "Homepage",
  repeatable: false,
  status: true,
  format: "page",
  json: {
    Main: {
      title: text("Page name"),
      meta_title: text("SEO title"),
      meta_description: text("SEO description"),
      social_image: image("Social sharing image"),
      slices: {
        type: "Slices",
        fieldset: "Page sections",
        config: {
          choices: Object.fromEntries(
            sliceModels.map((s) => [s.id, { type: "SharedSlice" }]),
          ),
        },
      },
    },
  },
};
export function restructureHomepage(h) {
  const used = new Set();
  const get = (k) => {
    if (!(k in h)) throw Error(`Missing source field: ${k}`);
    used.add(k);
    return h[k];
  };
  const H = (a, b, c) =>
    rt([get(a), get(b), ...(c ? [get(c)] : [])].join("\n"), "heading2");
  const headline =
    get("hero_make_your_business_data") +
    "\n" +
    get("hero_work_as_hard_as") +
    " " +
    get("hero_you_do");
  const mark = (value, terms) =>
    rt(
      value,
      "paragraph",
      terms.map((term) => ({
        type: "strong",
        start: value.indexOf(term),
        end: value.indexOf(term) + term.length,
      })),
    );
  const processPairs = [
    ["find_the_opportunity", "map_your_systems_data_history_and_licensing"],
    ["set_your_boundaries", "define_what_s_included_what_stays_out"],
    ["prepare_with_care", "agree_on_a_transfer_method_remove_or"],
    ["license_earn_repeat", "deliver_under_signed_terms_and_receive_payment"],
  ];
  const cards = [
    [
      "chat_messaging",
      "message_threads_handoffs_and_meeting_context",
      "slack_microsoft_teams_google_chat_zoom",
    ],
    [
      "email_calendar",
      "email_exchanges_scheduling_and_linked_follow_ups",
      "gmail_outlook_google_calendar",
    ],
    [
      "documents_files",
      "documents_versions_authorship_and_related_files",
      "google_drive_onedrive_sharepoint_dropbox",
    ],
    [
      "work_knowledge",
      "tasks_specifications_design_iterations_and_proje",
      "jira_linear_asana_monday_com_notion_figma",
    ],
    [
      "crm_sales_support",
      "opportunity_histories_service_conversations_and_",
      "salesforce_hubspot_google_calendar_intercom_zend",
    ],
    [
      "business_platforms",
      "operational_tickets_approved_workflows_and_proce",
      "servicenow_workday_sap_microsoft_dynamics",
    ],
    [
      "finance_operations",
      "invoices_reconciliations_order_histories_and_led",
      "quickbooks_stripe_netsuite_pigment_shopify",
    ],
    [
      "data_code",
      "repositories_issues_schemas_and_documented_chang",
      "github_snowflake_databricks_gitlab",
    ],
  ];
  const source =
    get("protection_alex_chen") +
    " " +
    get("protection_resolved_the_renewal_blocker_for") +
    " " +
    get("protection_acme_co") +
    " " +
    get("protection_after_the_support_handoff");
  const prepared =
    get("protection_person_01") +
    " " +
    get("protection_resolved_the_renewal_blocker_for") +
    " " +
    get("protection_company_02") +
    " " +
    get("protection_after_the_support_handoff");
  const result = {
    title: "Home",
    meta_title: get("meta_title"),
    meta_description: get("meta_description"),
    social_image: get("social_image"),
    slices: [
      slice(
        "navigation",
        {
          brand_name: get("navigation_rancher"),
          brand_label: get("navigation_rancher_home"),
          menu_label: get("navigation_toggle_navigation"),
          nav_label: get("navigation_main_navigation"),
          cta_label: get("navigation_explore_a_partnership"),
          cta_link: url("#contact"),
        },
        [
          ["calculator", "#calculator"],
          ["use_cases", "#use-cases"],
          ["how_it_works", "#how-it-works"],
          ["your_control", "#protection"],
        ].map(([k, v]) => ({ label: get("navigation_" + k), link: url(v) })),
      ),
      slice(
        "hero",
        {
          heading: rt(headline, "heading1", [
            {
              type: "em",
              start: headline.length - get("hero_you_do").length,
              end: headline.length,
            },
          ]),
          description: rt(
            get("hero_your_team_creates_valuable_knowledge_every_day"),
          ),
          cta_label: get("hero_put_your_data_to_work"),
          cta_link: url("#contact"),
          secondary_label: get("hero_estimate_your_opportunity"),
          secondary_link: url("#calculator"),
          illustration_alt: get(
            "hero_an_illustrated_landscape_of_cultivated_fields_connect",
          ),
          source_label: get("hero_already_in_your_business"),
          source_caption: get("hero_conversations_decisions_know_how"),
          outcome_label: get("hero_a_new_use_for_existing_data"),
          outcome_caption: get("hero_from_everyday_work_ai_progress"),
          trust_heading: get("hero_built_around_your_business_not_the_other"),
        },
        [
          "hero_you_define_the_scope",
          "hero_you_approve_the_terms",
          "hero_you_retain_ownership",
        ].map((k) => ({ text: get(k) })),
      ),
      slice("opportunity", {
        eyebrow: get("intro_the_opportunity"),
        heading: H(
          "intro_the_next_frontier_of_ai",
          "intro_is_everyday_expertise",
        ),
        lead: rt(
          get("intro_the_internet_shows_ai_what_people_say") +
            "\n" +
            get("intro_your_workflows_show_it_how_work_gets"),
        ),
        body: [
          ...rt(get("intro_a_resolved_support_ticket_a_project_that")),
          ...rt(
            get("intro_rancher_helps_you_explore_that_opportunity_identify"),
          ),
        ],
      }),
      slice("calculator", {
        heading: H(
          "calculator_section_what_could_your",
          "calculator_section_data_be_worth",
        ),
        estimate_label: get("calculator_estimated_payout_range"),
        below_floor_label: get("calculator_up_to"),
        disclaimer: get("calculator_a_starting_point_for_a_conversation_not"),
        employees_label: get("calculator_number_of_employees"),
        years_label: get("calculator_years_of_available_history"),
        years_min_label: get("calculator_3_years"),
        years_max_label: get("calculator_20_years"),
        region_label: get("calculator_company_location"),
        usa_label: get("calculator_usa"),
        canada_label: get("calculator_canada"),
        europe_label: get("calculator_europe"),
        other_label: get("calculator_other"),
        cta_label: get("calculator_explore_my_partnership"),
        cta_link: url("#contact"),
      }),
      slice(
        "data_categories",
        {
          heading: H(
            "data_section_ordinary_records",
            "data_section_extraordinary_context",
          ),
          note: rt(get("data_section_examples_of_data_to_assess_not_a")),
          tabs_label: get("data_tabs_business_data_categories"),
          signal_label: get("data_tabs_the_potential_signal"),
        },
        get("datasets").map((d) => ({
          label: d.label,
          title: d.title,
          description: d.description,
          examples: d.chips
            .split("\n")
            .map((t) => ({ type: "list-item", text: t, spans: [] })),
          signal: d.signal,
        })),
      ),
      slice(
        "use_cases",
        {
          heading: H(
            "use_cases_every_system_holds",
            "use_cases_part_of_your_story",
          ),
          description: rt(
            get("use_cases_explore_the_records_behind_everyday_work_and"),
          ),
          custom_eyebrow: get("use_cases_your_own_ecosystem"),
          custom_title: get("use_cases_internal_custom_systems"),
          custom_description: rt(
            get("use_cases_homegrown_tools_can_hold_distinctive_workflows_s"),
          ),
          cta_label: get("use_cases_tell_us_about_your_stack"),
          cta_link: url("#contact"),
          note: rt(
            get("use_cases_platforms_shown_are_examples_of_potential_data"),
          ),
        },
        cards.map(([title, description, platforms], i) => ({
          title: get("use_cases_" + title),
          description: get("use_cases_" + description),
          platforms: get("use_cases_" + platforms),
          image: get(`platform_${i + 1}_image`),
        })),
      ),
      slice(
        "process",
        {
          eyebrow: get("process_from_discovery_to_delivery"),
          heading: H("process_a_clear_path", "process_no_leap_of_faith"),
          description: rt(get("process_a_hands_on_partnership_with_the_scope")),
          cta_label: get("process_explore_your_opportunity"),
          cta_link: url("#contact"),
        },
        processPairs.map(([title, description]) => ({
          title: get("process_" + title),
          description: get("process_" + description),
        })),
      ),
      slice(
        "protection",
        {
          eyebrow: get("protection_your_data_your_boundaries"),
          heading: H(
            "protection_value_shouldn_t_come",
            "protection_at_the_cost_of_control",
          ),
          description: rt(
            get("protection_good_data_partnerships_start_with_clear_permiss"),
          ),
          checks: [
            "choose_eligible_systems_date_ranges_and_exclusi",
            "define_de_identification_and_review_requirement",
            "specify_permitted_uses_and_onward_sharing_restr",
            "agree_on_retention_deletion_and_payment_terms",
          ].map((k) => ({ text: get("protection_" + k) })),
          demo_heading: get("protection_context_in_identifiers_out"),
          source_label: get("protection_illustrative_source_record"),
          source_record: mark(source, [
            h.protection_alex_chen,
            h.protection_acme_co,
          ]),
          prepared_label: get("protection_illustrative_prepared_record"),
          prepared_record: mark(prepared, [
            h.protection_person_01,
            h.protection_company_02,
          ]),
        },
        [
          [
            "ownership_stays_with_you",
            "a_license_grants_defined_usage_rights_it",
          ],
          [
            "no_blanket_permissions",
            "buyer_access_exclusivity_and_future_uses_belong",
          ],
          [
            "fit_before_a_forecast",
            "value_depends_on_buyer_demand_usable_history",
          ],
        ].map(([title, description]) => ({
          title: get("protection_" + title),
          description: get("protection_" + description),
        })),
      ),
      slice(
        "faq",
        {
          heading: H("faq_a_little_clarity", "faq_goes_a_long_way"),
          description: rt(
            get("faq_data_licensing_is_a_commercial_decision_here"),
          ),
        },
        get("faqs").map((f) => ({
          question: f.question,
          answer: rt(f.answer),
        })),
      ),
      slice("contact", {
        eyebrow: get("contact_let_s_see_what_s_possible"),
        heading: H(
          "contact_you_ve_built_a_business",
          "contact_let_s_uncover_what",
          "contact_else_it_can_grow",
        ),
        description: rt(get("contact_start_with_the_basics_tell_us_about")),
        note: rt(
          get("contact_no_data_uploads_no_system_credentials") +
            "\n" +
            get("contact_just_a_starting_point_for_a_better"),
        ),
        form: h.form || {
          link_type: "Document",
          id: "snapshot-form",
          type: "form",
          isBroken: false,
        },
      }),
      slice("footer", {
        brand_name: get("footer_rancher"),
        brand_label: get("footer_rancher_home"),
        copyright: get("footer_rancher_cultivate_what_comes_next"),
        nav_label: get("footer_footer"),
        faq_label: get("footer_faqs"),
        privacy_label: get("footer_privacy_policy"),
        terms_label: get("footer_terms_of_use"),
        information_label: get("footer_site_information"),
        cta_label: get("footer_start_a_partnership"),
        cta_link: url("#contact"),
        dialog_heading: get("footer_about_this_webpage"),
        dialog_body: [
          ...rt(get("footer_this_is_a_rancher_service_website_concept")),
          ...rt(get("footer_the_inquiry_form_saves_your_contact_details")),
        ],
        close_label: get("footer_close"),
      }),
    ],
  };
  const derived = [
    "form",
    "protection_alex_chen_resolved_the_renewal_blocker_for",
    "protection_person_01_resolved_the_renewal_blocker_for",
  ];
  const missing = Object.keys(h).filter(
    (k) => !used.has(k) && !derived.includes(k),
  );
  if (missing.length) throw Error("Unmapped content: " + missing.join(", "));
  return result;
}
export const formFields = {
  title: ["explore_a_data_partnership", "Form heading"],
  description: ["share_your_details_then_choose_a_time", "Form introduction"],
  honeypot_label: ["website", "Honeypot label"],
  name_label: ["your_name", "Name field label"],
  name_placeholder: ["alex_morgan", "Name placeholder"],
  email_label: ["work_email", "Email field label"],
  email_placeholder: ["alex_company_com", "Email placeholder"],
  job_title_label: ["job_title", "Job title field label"],
  job_title_placeholder: ["your_role", "Job title placeholder"],
  company_label: ["company", "Company field label"],
  company_placeholder: ["company_name", "Company placeholder"],
  size_label: ["company_size_full_time_employees", "Company size field label"],
  select_placeholder: ["select_range", "Select placeholder"],
  history_label: ["available_data_history", "Data history field label"],
  records_label: ["what_types_of_records_could_be_in", "Record types question"],
  records_hint: [
    "select_all_that_apply_choose_at_least",
    "Record types help text",
  ],
  context_label: ["anything_else_to_know", "Additional context field label"],
  optional_label: ["optional", "Optional field indicator"],
  context_placeholder: [
    "share_any_additional_context",
    "Additional context placeholder",
  ],
  consent: [
    "i_consent_to_outreach_from_rancher_about",
    "Outreach consent statement",
  ],
  no_javascript: [
    "enable_javascript_to_submit_your_request_",
    "JavaScript requirement message",
  ],
  save_error: ["we_could_not_save_your_request_please", "Save failure message"],
  success: [
    "your_request_is_saved_opening_the_booking",
    "Submission success message",
  ],
  network_error: [
    "could_not_connect_your_entries_are_still",
    "Connection failure message",
  ],
  unknown_error: ["please_try_again_shortly", "Unexpected failure message"],
  submitting_label: ["submitting", "Submitting button label"],
  submit_label: ["submit_book_a_call", "Submit button label"],
};
export const formModel = {
  id: "form",
  label: "Form",
  repeatable: true,
  status: true,
  format: "custom",
  json: {
    Main: {
      uid: { type: "UID", config: { label: "Form identifier" } },
      ...Object.fromEntries(
        Object.entries(formFields).map(([key, [, label]]) => [
          key,
          text(label),
        ]),
      ),
    },
  },
};
export function restructureForm(data) {
  return Object.fromEntries(
    Object.entries(formFields).map(([key, [old]]) => [
      key,
      data["partnership_form_" + old],
    ]),
  );
}
