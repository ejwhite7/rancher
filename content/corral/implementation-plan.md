# The Corral — Prismic implementation and coordinated launch plan

Planning reference: September 15, 2026 (UTC). Status: PLAN ONLY. No code changes, content-engine execution, Prismic writes, publication or deployment have occurred.

## 1. Agreed scope and definition of done

Implement Rancher’s blog, **The Corral**, in https://github.com/ejwhite7/rancher using the exact Prismic type IDs `blog-index` for `/blog` and `blog` for `/blog/[uid]`. Generate the 24 articles from this conversation’s SEO/AEO plan using the user-designated local content-engine project. Review and migrate the resulting content, assets, relationships and SEO fields into Prismic, then launch the full approved library together.

The prior September–December publishing dates are superseded as release dates. Preserve them only as original planning provenance. The launch timestamp L is chosen after approval; do not set September 15 or the old scheduled dates as publication dates. All 24 articles must pass the gates before the coordinated launch; if one fails, delay the launch or obtain explicit approval to reduce scope.

Done means the live site serves one blog index and all 24 approved articles from Prismic, with full content fidelity, working links and downloads, appropriate metadata, published-only discovery, and verified production rendering. Imported drafts alone are not completion.

## 2. Inspection limits and prerequisites

The repository was available in the repository list, but its read-only inspection failed because the configured code harness was not signed in. No source was read. Connected-folder access was requested and declined, so the local content-engine was not inspected or run. Existing Prismic repository/environment, models, SDK versions, web framework, routes, deployment host and publishing permissions remain unverified. Proposed field names below are a target contract, not a description of existing models. No actual CLI/API command is specified until inspected documentation supports it.

Before implementation:
- Authorize source access to the Rancher repository and content-engine project. Inspect README/package manifests, examples, schemas, adapters, tests and operational documentation without reading or exposing credentials.
- Identify the Prismic repository name, locale(s), production versus test environment strategy, role permissions and plan capabilities. Confirm whether `blog-index` and `blog` already exist and inventory every existing document before deciding create versus update.
- Identify supported model synchronization, asset upload, migration, draft/Release creation and publishing workflows. A content-reading API must not be mistaken for a write/publish API. Verify current Prismic product and SDK support before choosing automation.
- Confirm the actual website framework, route conventions, client setup, previews, cache/revalidation, CI and deployment process.
- Confirm Rancher’s approved factual claims, named authors/reviewers, brand/image policy, legal/privacy review coverage, and launch owner.
- Provide credentials only through an approved secret manager/environment, with least privilege. No secrets in generated briefs, logs, repository files or deliverables.

Exit gate: an approved environment inventory, field mapping, publishing capability check and explicit write/publish authorization for the future execution phase.

## 3. Information architecture and frontend

### `/blog`: The Corral
Use a single `blog-index` document (non-repeatable if creating it fresh). H1: “The Corral”. Suggested supporting line: “Practical guidance on business-data licensing for AI.” Show an introduction, curated start-here/featured articles, topic navigation and the complete article library. Ensure all 24 articles are reachable through ordinary HTML links; pagination must not make discovery depend on client-side filtering.

Suggested topics: Start here; Rights & control; Data use cases; Preparation & quality. Use curated ordering or deterministic secondary ordering by UID when launch timestamps are identical. Do not pretend simultaneous posts were published across three months.

### `/blog/[uid]`: article
Render one `blog` document: breadcrumbs, H1, excerpt/direct answer, actual publication and meaningful update dates, author/reviewer information, hero, optional generated table of contents, body sections, citations, original decision aid, related posts and one relevant CTA. Use the website’s established responsive/accessibility system after inspection.

Use route resolver mappings `{type: 'blog-index', path: '/blog'}` and `{type: 'blog', path: '/blog/:uid'}` only if compatible with the installed Prismic client; otherwise implement the equivalent in its actual framework. The blog index must query the collection, not assume it is an article UID. Define draft/not-found behavior and avoid a generic route capturing `/blog`.

Add The Corral to primary/footer navigation as appropriate, a homepage entry point, breadcrumbs, and sitemap discovery. Redirect only real legacy article paths found in the audit—do not invent redirects for a previously missing route.

## 4. Proposed Prismic content contract

Retain exact type IDs. Reuse compatible existing fields and slices; record mapping differences instead of renaming live field APIs casually. Generate framework types after approved model changes. Validation rules must be enforced by the generation/migration pipeline even where the CMS cannot enforce them.

### `blog-index` (singleton target)
| Proposed field ID | Prismic field approach | Purpose |
|---|---|---|
| title | Key Text | The Corral |
| introduction | Rich Text | Search-readable intro |
| featured_articles | Group with Content Relationship restricted to blog | Curated entry points |
| meta_title | Key Text | Unique index title |
| meta_description | Key Text | Unique index description |
| meta_image | Image | Branded social image |
| meta_image_alt | Key Text, if image alt needs explicit override | Accessible social description |

### `blog` (repeatable target)
| Proposed field ID | Prismic field approach | Purpose |
|---|---|---|
| uid | UID | Stable public slug |
| content_key | Key Text | Stable migration identity such as corral-01; uniqueness enforced by importer |
| title | Title/Rich Text restricted to heading1, adapted to existing schema | Single article H1 |
| excerpt | Key Text | Card summary distinct from metadata where useful |
| answer_summary | Rich Text restricted to paragraph | Standalone direct answer |
| topic | Select | Controlled topic taxonomy |
| published_at | Timestamp | Actual public launch time |
| updated_at | Timestamp | Meaningful editorial update, not every build |
| author_name / author_bio | Key Text / Rich Text | Approved attribution; reuse existing author relationships if present |
| reviewer_name / reviewer_role | Key Text | Only populated when real review occurred |
| hero_image | Image | Article hero with intrinsic dimensions and alt text |
| slices | Slice Zone | Full body, tables, original assets and explanations |
| sources | Group: source_title, source_url (Link), accessed_on (Date) | Reader-visible source references; access date is actual research date |
| related_articles | Group with Content Relationship restricted to blog | Resolved article IDs, not placeholders |
| cta_label / cta_link | Key Text / Link | Contextual approved next step |
| meta_title | Key Text | Explicit search/social title |
| meta_description | Key Text | Unique accurate summary |
| meta_image | Image | Explicit social-sharing image |
| meta_image_alt | Key Text, if needed | Social image description |

Canonical URL defaults to the production origin plus stable route, computed by application code. Add a CMS canonical override only if a genuine syndication requirement exists, with strict validation. Avoid routine editor-controlled noindex on the launch library; environment and publication state govern indexability. Reading time and table of contents can be derived rather than manually maintained.

### Required body features
Reuse existing slices where possible. Proposed semantic equivalents: RichTextSection, Callout, ImageWithCaption, ComparisonTable, Checklist, DownloadableAsset, FAQ and CTA. Native rich-text structures do not automatically represent arbitrary Markdown tables. Define explicit table headers, rows and cells in the schema; if nested structures are not supported, use flat rows/cells keyed by row/column in a repeatable slice structure. Validate renderer and migration together using a pilot. Do not flatten tables into prose or screenshots as the only version.

Rich text must preserve headings, lists, emphasis, hyperlinks and inline citations. Escape content safely; do not inject untrusted raw HTML. Resolve inline internal document links after the article ID map exists. FAQs must be rendered visibly; no hidden schema-only content.

## 5. SEO and social metadata

Suggested index metadata (draft, subject to editorial approval):
- meta_title: “The Corral | AI Data Licensing Insights | Rancher”
- meta_description: “Explore practical guides to licensing business data for AI, including eligibility, privacy, valuation, contracts, and dataset preparation.”
- canonical: https://www.gorancher.com/blog (use the confirmed canonical origin/trailing-slash convention)

For every article generate and review a distinct meta title, meta description, hero alt, social-image alt and stable slug. Titles roughly 45–60 characters and descriptions roughly 140–160 are editorial targets, not rigid ranking rules; validate display width and meaning. Do not pad titles with keywords or promise rankings/revenue.

Render: HTML title and description, one canonical, Open Graph title/description/type/url/image, image dimensions/alt, Twitter large-image card, and appropriate article date/author information. Use a branded 1200×630 share-image template with a concise title, The Corral and Rancher identity. Export a real image, upload it into Prismic assets and populate `meta_image` on every document; a temporary local path or placeholder URL is not migration success. Hero images may reuse an approved design where appropriate; metadata must not silently fall back to an unrelated site image. Track asset rights and source files.

Generate BlogPosting and BreadcrumbList structured data from actual fields. Include headline, canonical/mainEntityOfPage, valid image URLs, author, publisher and actual dates. The index can use CollectionPage/ItemList where appropriate. Do not claim reviewer credentials or Organization sameAs profiles that have not been verified. FAQPage is optional and only for visible matching FAQs; it is not a promised rich-result or AI-answer tactic.

Production serves only published content. Staging/previews require access controls plus noindex and must not expose drafts through public APIs, sitemaps or client bundles. Robots disallow alone is not a sufficient noindex mechanism. Sitemap lastmod should reflect meaningful content modification, not every deployment. Use source citations, direct answers, accessible tables and semantic HTML for AEO; no guarantee of answer-engine inclusion.

## 6. Content-engine workflow

### Inputs
Use the existing `rancher-seo-aeo-calendar.csv` as the authoritative set of 24 briefs and the strategy report as the editorial policy. Preserve IDs 01–24, titles, target query hypotheses, audiences, assets, reviewer roles, CTA intent and link graph. Move old dates into `original_planned_date`, never the actual publication field. Target queries are hypotheses, not measured demand.

Build a versioned launch manifest containing: batch ID; content_key; approved UID; brief version; primary query; topic; source requirements; dependencies; approved brand facts; forbidden/unverified claims; asset requirements; source ledger; author/reviewer status; workflow state; engine/config versions; generation timestamps; content/asset checksums; target locale; and Prismic migration identifiers. The manifest is an internal handoff format, not a claim about what the engine natively accepts.

### Verify engine contract before running
Inspect supported job/config format, model/provider settings, source retrieval behavior, output schema, resume/retry semantics, cost controls, image support and any Prismic adapter. Confirm which operations contact external services and obtain appropriate access. Adapt the manifest to the documented interface; do not fabricate a `content-engine publish` command. If no adapter exists, implement a separately tested mapping layer that consumes validated engine output and uses a supported Prismic import path.

### Pilot then scale
Pilot posts 01, 04 and 20: these exercise a pillar/process diagram, legal term table and downloadable data-card template. Generate into a local build area or unpublished test target, never straight to production. Test every body block, citation, download, metadata field and internal relationship. After acceptance, generate the remaining 21 in dependency-aware batches:
- Foundations: 02, 03, 05, 06, 07, 08.
- Use cases and workflow examples: 09, 10, 11, 12, 13, 14, 15.
- Quality and decision support: 16, 17, 18, 19, 21, 22, 23, 24.
These are production batches, not public release waves.

### Editorial controls
Research each article’s claims with current primary sources. Competitor articles are inspiration, not copy to paraphrase or authority for legal advice. Keep a claim/source/reviewer ledger. Require fresh human review for legal, privacy, security, valuation and service-capability statements. The existing Rancher site disclosure describes an offering concept; establish which claims are now defensible before writing operational promises.

Prohibit invented customers, certifications, partner relationships, buyer demand, earnings, expert identities and performance results. Do not imply listed software platforms are integrations. Use synthetic examples with prominent labels and no real sensitive records. De-identification must not be described as automatic legal permission or complete anonymity. Do not claim model training can always be reversed by deleting source data.

Each article needs its specified useful asset—not simply a sentence promising a download. Keep core answers and tables available in HTML; downloadable worksheets supplement them. Check similarity/cannibalization across all 24 and preserve distinct intents. Review original images for brand quality, factual implications and licensing.

Workflow: brief_ready → generated → structurally_valid → factual_reviewed → specialist_approved → editorial_approved → assets_ready → migration_ready → imported_draft → preview_verified → release_approved → published → live_verified. Automated generation must not self-approve editorial or specialist gates.

## 7. Migration and reconciliation

1. Inventory and export/backup current target models, documents, IDs, UIDs, asset references and publication state with a rollback ledger. Do not recreate or replace unrelated content.
2. Apply reviewed models and deploy compatible renderers to a protected preview/test deployment before importing rich content. Generate application types and run schema/component tests.
3. Freeze a validated launch payload. Normalize rich text, assets, sources and metadata; validate every required field and total count (one index plus 24 launch articles). Existing unrelated content is outside this count.
4. Upload new assets through the verified supported Prismic workflow. Deduplicate by checksum and keep local source-to-Prismic ID/URL mappings. Include hero/social images, diagrams and downloadable files. Avoid hotlinks to scratch or generation services.
5. Create or safely update article drafts using type + locale + stable content_key/UID reconciliation. Stable keys are enforced by importer logic, not assumed native uniqueness. Store returned IDs. Confirm updates cannot auto-publish an existing live document unexpectedly.
6. Resolve article relationships and inline document links in a second pass using the ID map. Populate the index’s curated relationships. Verify cycles, missing targets and all IDs 01–24 resolve to the intended launch documents.
7. Read back through the supported draft/preview mechanism. Compare normalized sections, text, tables, list counts, citations, download references, links and metadata with the approved payload. Do not rely solely on a successful import response or raw JSON byte equality.
8. Render every article in protected preview and verify mobile/desktop layout, SEO head, dates, alt text, download opening, anchors and related links. Confirm no lost blocks, placeholder media, literal Markdown, broken table cells or truncation.
9. Rerun the dry-run importer and prove it plans zero unexpected creates/updates. Rate-limit retries; resume only failed steps. Log bounded results without secrets or article drafts that should remain private.

Deliver reconciliation reports: document map, asset map, relationship checks, field completeness, source ledger, review approvals and preview screenshots. No destructive overwrite or automatic publication during migration.

## 8. Coordinated release strategy

Preferred: group the index and all 24 approved articles in a named Prismic Release if supported by the account/workflow, then publish it at the approved launch time L. Verify actual Prismic Release/locale capabilities rather than assume availability or API support. A CMS Release does not itself guarantee atomic frontend visibility because CDN caches/builds may differ.

If Releases are unavailable, use an approved publication runbook with a site visibility gate or immutable production deployment. Publish the approved content while public blog discovery is gated, perform a single controlled rebuild/revalidation, verify a private deployment containing the complete batch, then promote it and enable navigation. For runtime-fetching sites, a UI feature flag alone does not hide public Prismic API content; agree on the exact confidentiality and atomicity requirements before using this fallback. If truly atomic visibility is required and the platform cannot provide it, do not silently substitute sequential publication.

Launch sequence:
- Freeze approvals and confirm all 25 documents/assets, actual launch dates and scope.
- Obtain explicit release/deployment authorization in the execution phase.
- Deploy tested schema-compatible code with the blog initially hidden/gated if necessary.
- Publish the approved batch through the supported CMS action. A migration endpoint is not presumed to publish.
- Rebuild or revalidate all affected article routes, index/pagination, navigation and sitemap; verify authenticated webhook handling and retry behavior where used.
- Promote/enable the complete library. Verify the public Prismic content and production HTML agree, then expose discovery links and submit the sitemap through the approved Search Console account.

Do not reuse the former per-article release schedule. If launch moves, update only the actual publication metadata deliberately before publication; do not auto-update all editorial modified dates on every build.

## 9. Acceptance tests and launch blockers

### Automated checks
- Exactly one intended `blog-index` and 24 intended `blog` records in the launch manifest; each unique UID/content_key in the target locale.
- Required content and SEO fields complete; unique accurate titles/descriptions; resolvable Prismic image URLs, valid dimensions and alt descriptions.
- Every planned asset exists, downloads open, and no temporary/placeholder URLs remain.
- Full body fidelity against approved payload: headings, lists, tables, FAQs, citations, links, callouts and downloadable assets.
- All internal links resolve to correct production paths; all related-content IDs resolve. Source-link failures are triaged rather than blindly treated as proof a claim is false.
- Production URLs return intended status, one H1/canonical, valid head tags and structured data; genuine missing UIDs return 404.
- Drafts and previews are absent from production lists, sitemaps, metadata and public page generation.
- Sitemap includes index and all intended published article routes without staging domains; navigation/pagination reaches every article.
- Import dry-run is idempotent, interrupted migration can resume, and unaffected content remains unchanged.
- Application type checks, unit/integration tests and production build succeed in the actual framework.

### Human checks
- Named editorial and specialist approvals present where required.
- All 24 previews reviewed; representative complex pages 01, 04, 07, 10, 16 and 20 checked deeply at mobile and desktop sizes, with remaining pages also checked for overflow/media defects.
- Keyboard navigation, contrast, heading hierarchy, descriptive links, image alternatives and accessible tables pass review.
- No unsupported capabilities, fake proof, invented citations, guaranteed revenue or unlabeled synthetic data.
- Launch index ordering and CTAs work; inquiry flow asks for metadata, not raw data or credentials.

Launch is blocked by any missing article, required metadata/media, unresolved relationship, failed specialist approval, draft leak, broken critical route or unreliable rollback. No “publish now and fill metadata later.”

## 10. Rollback and maintenance

Keep the prior deployment, CMS snapshot/change ledger and launch manifest. On failure, disable discovery/promote the prior compatible deployment, and unpublish or restore only this batch using the supported CMS process as authorized. Revalidate caches and remove unpublished URLs from the sitemap. A code rollback alone does not unpublish Prismic data. Do not delete assets while any documents reference them. Treat UID changes as migrations with redirects, not casual edits.

At L+1 day: verify all routes, images, sitemap, metadata, inquiry tracking and publication state. At L+7: inspect indexing and crawler errors. At L+28: review actual query data, qualified inquiries and a fixed answer-engine prompt panel. Mark all article content updates accurately; refresh legal/market claims when necessary. Track article CTA clicks, inquiry completion and qualified opportunities separately. No promise of rankings, citations or immediate leads from publishing 24 posts at once.

## 11. Work packages and ownership

| Phase | Owner roles (to assign) | Outputs | Exit gate |
|---|---|---|---|
| Discovery | Technical lead + CMS admin + engine owner | Verified source/config inventory, schema mapping, publish capability decision | Access and architecture approved |
| CMS/frontend foundation | Frontend engineer + CMS admin | Models, renderers, routes, previews, metadata, sitemap, tests | Representative fixture renders correctly |
| Engine integration/pilot | Engine owner + editor + specialists | Manifest, adapter if needed, posts 01/04/20 and assets | Pilot passes content and migration QA |
| Full generation/review | Editor + writer/engine owner + reviewers | Remaining 21 approved articles and all assets | 24 approved migration-ready packages |
| Draft migration | CMS admin + engineer | Idempotent import, relationship resolution and reports | 25 intended documents verified in preview |
| Coordinated launch | Release owner + CMS admin + engineer | Approved Release or equivalent deployment runbook | CMS and production live checks pass |
| Post-launch | SEO/editor + engineer | Indexing, conversion and defect reports | L+1/L+7/L+28 reviews recorded |

Do not assign a firm launch date before source inspection and reviewer capacity are known. CMS build and factual research can proceed in parallel after the field contract is agreed; full generation waits for the successful pilot, and publication waits for all approval gates.

## 12. Execution handoff checklist

The next implementation phase needs: access to Rancher and content-engine; exact Prismic repository/environment/locale; an approved write/publish mechanism; confirmed author/reviewer identities; claim and brand-asset approvals; a chosen release owner and timestamp; and authorization for the staged writes and eventual live launch. Deliver source changes/PR, model definitions, generation configuration, approved article packages, migration/asset manifests, QA reports and rollback runbook as versioned artifacts. Actual commands will be documented only after the relevant tool interfaces are inspected.
