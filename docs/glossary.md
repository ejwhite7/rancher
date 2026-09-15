# Glossary implementation and release

## Current rollout state (September 15, 2026)

Edward White, Co-Founder of Rancher, confirmed review of all 60 entries on September 15, 2026. All entries record his name, role, and that completed review date. The rollout includes the index, 60 entry pages, a Glossary navigation link, and repeatable Footer links.

Footer editors can add, remove, and reorder **Footer links** in the Footer singleton, with a label and destination for each row. Use `#site-note` to open the shared information dialog. Historical fixed-link fields are retained in the **Legacy links** tab for compatibility with older deployments; the current frontend uses only the repeatable list.

## Content model and routes

- `glossary-index`: singleton, `/glossary/`.
- `glossary`: repeatable, `/glossary/:uid/`.
- Both reference the existing Navigation and Footer singletons.
- `prismic/glossary/manifest.json` is the 60-term scope and category contract. The original empty `glossary_index` type is retained but unused; do not create content in it.
- Model JSON lives in `customtypes/`. `scripts/glossary-models.mjs` regenerates those two local definitions. The installed Prismic CLI and Custom Types API both support the required hyphenated ID.
- Fixed category values are mapped to reader-facing labels in `src/lib/glossary-search.ts`. Prismic displays the stored values in its Select field.

Published glossary routes render on demand through Astro/Vercel. Each request uses a fresh published-content client; `getAllByType` traverses pages of 20. Glossary HTML and its dynamic sitemap use `no-store`, so publish, update, and unpublish changes appear after Prismic’s Content API propagates them. No application cache invalidation is required. Existing homepage/legal builds and React islands retain their previous architecture.

The React search island receives only compact index records. All term links and definitions are in the initial HTML. Search covers names, aliases, and short definitions with exact/prefix/other ranking, category AND filtering, current-result letter anchors, clear filters, and a live result count. Query strings are not added to URLs. Without JavaScript, all terms and letter links remain usable.

Canonical glossary URLs use the production origin `https://www.gorancher.com`. The sitemap index includes `/glossary-sitemap.xml`, whose contents come only from published documents. Unknown or unpublished UIDs return 404. Missing required singleton/content produces 503 rather than a misleading empty success page. A never-published glossary has an empty glossary sitemap until launch.

## Preview

Open a draft in Prismic’s Migration Release, click **Preview the page**, and choose **Staging**. This refreshes the release snapshot and creates an actual Prismic preview session. The raw migration ref may be stale until that refresh.

- Staging callback: `https://staging.gorancher.com/preview/`
- Production callback: `https://www.gorancher.com/preview/`
- Index preview renderer: `/preview/view/glossary/`
- Term preview renderer: `/preview/view/glossary/:uid/`

Callbacks resolve both types and retain the existing preview cookie. Internal glossary links stay in the preview session. The renderers use fresh request-scoped draft clients, `no-store`, `noindex`, and no-referrer headers. Expired refs fail closed; they do not silently render published content. Editorial warnings appear only in preview. The existing homepage/legal previews and Astro slice simulator remain available. The glossary has structured fields rather than a Slice Zone, so its preview uses the page renderer, not a new simulator slice.

Vercel deployment protection still applies to staging: reviewers must be signed into the Vercel team or use an approved protection bypass.

## Import and verification

Use the existing Prismic CLI login and server-only write token in `.env.local`. Migration credentials, editor snapshots, preview sessions, and checkpoints are in ignored `.prismic-migration/glossary/`; do not commit or deploy them.

```sh
npm run glossary:validate
npm run glossary:plan
npm run glossary:import
npm run glossary:verify -- --drafts
# Publication acceptance: exits unsuccessfully until actual reviews are complete.
npm run glossary:verify
```

The import uses the supported `@prismicio/client` Migration API. Pass one creates identities and complete copy; pass two attaches relationships using real IDs. It matches tracked documents by type/locale/UID and saves a resumable checkpoint. Before writing, it compares current editor content with the saved payload, accounting for editor serialization. It refuses untracked documents, missing tracked documents, unexpected locales, or editorial changes. Current editor data is read with the same authenticated read endpoints used by the installed CLI because public release refs can lag working drafts. Imports do not publish.

Do not delete the checkpoint or rerun the importer to override editor changes. Reconcile changes deliberately from the saved backups. A failed write may leave a document incomplete in the migration release; inspect and repair it before proceeding. The verifier checks all 61 glossary documents directly in Prismic, including names, categories, copy, source links, metadata uniqueness, and related IDs. It keeps private verification details outside public content fields.

Original draft source: `prismic/glossary/drafts/`. Generated review artifact: [Glossary editorial review](glossary-editorial-review.md). The JSON export contains UID placeholders for relationships; use the importer, which resolves them to real IDs.

## Publication gate and release steps

The supplied implementation plan requires actual qualified review and publication approval. No entry is marked reviewed merely because a build or technical validation passed.

1. Assign the content owner and qualified legal/privacy and technical reviewers. Review the complete Prismic drafts and source support. All invented examples are explicitly fictional.
2. In each term, enter the actual reviewer’s public name, accurate role, and actual completed review date. Do not enter planned reviews or future dates. Do not place private review notes in CMS content fields.
3. Open Preview to refresh the release. Run `npm run glossary:verify`; require 60 reviewed terms, one index, and zero errors. Confirm the Navigation draft adds the Glossary link and otherwise preserves existing navigation.
4. Review staging on desktop/mobile, including search, related links, forms, analytics, and both glossary preview routes. Obtain the content owner’s publication approval.
5. Merge the tested frontend commit from staging to main and wait for Vercel Production to be Ready. This ensures routes exist before the content becomes public.
6. Inspect Prismic’s entire Migration Release, including any unrelated drafts added since this work. Publish only the approved release through Prismic’s publication controls. Never blindly call `publishMigrationRelease()` on a shared repository: it publishes every document in that release.
7. Verify `/glossary/` has 60 cards, every canonical UID returns 200, an unknown UID returns 404, the glossary sitemap has 61 URLs, and review metadata is visible. Check Navigation after the deploy hooks finish rebuilding the static homepage/legal pages.
8. Monitor Vercel runtime errors and existing PostHog pageviews and conversions. Assign monthly content/analytics review and re-review legal/privacy entries when relevant rules or practices change.

## Publish hooks and analytics

Already verified in Prismic and Vercel:

| Prismic webhook | Events | Vercel hook | Git branch |
| --- | --- | --- | --- |
| Deploy Staging | Publish and unpublish | Prismic — Staging | `staging` |
| Deploy Production | Publish and unpublish | Prismic — Production | `main` |

Both hooks are active and point to the matching HTTPS Vercel deploy-hook URLs. Vercel’s unguessable hook URL is the supported bearer credential; keep it secret. The hooks rebuild static shared content. Glossary SSR also reads newly published content directly, including after an unpublish.

Existing PostHog initialization, calculator, form, submission, and booking events remain unchanged. Glossary pageviews and links use existing tracking. The optional `glossary_filter_used` event sends only category, whether a query is present, and result count after a short debounce; it is suppressed in preview. Search input has PostHog capture/masking attributes and raw search text is neither an event property nor a URL parameter. Existing opt-out behavior is respected by the same PostHog client.

## Validation and rollback

```sh
npm run check
npm run build
PRISMIC_CONTENT_MODE=prismic npm test
npm run test:glossary
```

Run Astro builds and browser test servers sequentially to avoid sharing generated build state. The glossary browser suite uses an isolated localhost Prismic fixture and never publishes real documents. Fixture reviewer identities exist only in tests.

Before this work, staging and main were at `348f0e4fd564634a92e01b56434cf859de0081c2`. Keep the prior Vercel deployment and ignored Prismic model/content backups. If rollback is required, restore the compatible previous application deployment, withdraw affected content through Prismic’s supported controls, and verify public routes/cache behavior. Do not bulk-delete glossary documents or remove existing schema fields as a first response. Obtain the release owner’s authorization for a production rollback; test the selected rollback in staging.
