# Prismic content

Repository: **[Rancher](https://rancher.prismic.io/)** (`rancher`, locale `en-us`).

## Inspected repository and migration

The repository uses Prismic's Legacy Builder. The existing custom types were inspected through the Custom Types API using a write token created with the authenticated Prismic CLI:

- Homepage (`homepage`, singleton)
- Form (`form`, repeatable)
- Navigation (`navigation`, singleton; added after the initial import)
- Footer (`footer`, singleton; added after the initial import)
- Legal (`legal`, repeatable)
- Blog, Blog Index, For Model Builders, Glossary Entry, Glossary Index, Industries, Industry Index, Referral

All models were initially empty. One published Homepage document existed with no content. The migration adds fields to the **existing Homepage, Form, and Legal models**, updates that Homepage in place, and creates the partnership form and two legal documents. The other eight models remain unchanged.

| Document         | Type         | UID / existing ID                     |
| ---------------- | ------------ | ------------------------------------- |
| Homepage         | `homepage`   | Existing singleton `aqis7xUAADIAUoI-` |
| Site navigation  | `navigation` | Singleton `aqltoBUAADEAU_-i`          |
| Site footer      | `footer`     | Singleton `aqlujBUAADEAVAKN`          |
| Partnership form | `form`       | `partnership`                         |
| Privacy Policy   | `legal`      | `privacy-policy`                      |
| Terms of Use     | `legal`      | `terms-of-use`                        |

The Homepage has a single **Main** tab for page name, SEO, social image, and an ordered **Page sections** slice zone:

1. Hero (complete headline, introduction, buttons, illustration labels, three reassurance points)
2. The opportunity
3. Opportunity calculator
4. Data categories (four repeatable categories)
5. Use cases (eight platform cards and the custom-systems card)
6. How it works (four steps)
7. Data protection (checklist, complete illustrated records, three principles)
8. Frequently asked questions (six questions and answers)
9. Contact and partnership form

Navigation is a separate singleton. Homepage and Legal have a **Site navigation** content relationship restricted to `navigation`, and all three current page documents reference the same singleton. Edit brand text, accessibility labels, the primary button, and repeatable navigation links there once. To reuse it in another custom type, add the same relationship field and select **Site navigation**. Fetch the referenced document and pass its validated data to `Navigation.astro`; `getNavigationContent(id)` provides this for additional page layouts.

The navigation move was published separately using `scripts/prismic-navigation.mjs`, with source backups and verification in `.prismic-migration/navigation/`. All other page content was preserved. The old navigation slice is no longer selectable on Homepage.

Footer is also a separate singleton. Homepage and Legal reference it through **Site footer**, restricted to the `footer` type. It contains all footer copy, the partnership link, and the site-information dialog content. To reuse it on another page type, add this content relationship, select **Site footer**, and render `Footer.astro` using `getFooterContent(id)`. Navigation and Footer are outside the Homepage slice zone.

The footer move uses `scripts/prismic-footer.mjs`, with source backups and verification in `.prismic-migration/footer/`. The migration preserves other page content, the form, and the Navigation singleton.

Headings and paragraphs are complete rich-text fields. Repeated content is modeled as slice items, with descriptive labels such as “Card heading” and “Step explanation.” The form uses semantic field names and is linked from the Contact slice. Legal documents each contain their own title, description, rich-text body, update date, operator and optional contact email.

`customtypes/` contains the five types used by this frontend. `prismic/slices/` contains nine active shared slice models, plus the historical navigation/footer slice definitions. Other repository types must be preserved. `prismic:push` updates the five local custom type models and nine shared slices; it does not write document content or unrelated custom types.

The September 15 section repair updated the existing Home and form documents in place. It replaced the earlier flat fragment model. Backups and verification evidence are in the ignored `.prismic-migration/section-redesign/` directory. All original homepage values were accounted for by the converter; legal edits made after the initial import were preserved.

## Frontend behavior

Astro reads published Prismic content at build time. React hydration remains unchanged: calculator (`client:load`), data tabs (`client:visible`), and partnership form (`client:idle`). Vercel continues hosting the frontend and submission API.

Copy uses escaped text fields and validated Prismic rich text. Existing markup, section IDs, animations and interaction hooks remain in source. Eight platform SVG strips and the social PNG are uploaded to Prismic; inline SVG illustrations, CSS, brand icons and generated favicons remain frontend assets.

Form names and option values, validation, calculator calculations, booking destination, submission persistence and webhook delivery remain application contracts. CMS consent wording must match `CONSENT_TEXT` in `src/lib/submission.ts`, the wording recorded in PostgreSQL. A consent change must update both together.

PostHog initialization, identify calls, event names and properties remain unchanged. Keep `PUBLIC_POSTHOG_PROJECT_TOKEN` and `PUBLIC_POSTHOG_HOST` configured. Analytics credentials do not belong in Prismic.

## Authentication and environment

```sh
npx prismic login
npx prismic repo list --json
npx prismic token create --write --name 'Rancher content migration' --repo rancher --json
```

Save the returned write token securely; never commit it or paste it into chat. The write token also authenticates the Custom Types API. The CLI's `pull`/`push` model commands require Type Builder and do not directly support this Legacy Builder/Astro project. Use the repository scripts below for these operations.

Local `.env.local`:

```dotenv
PRISMIC_REPOSITORY_NAME=rancher
PRISMIC_LOCALE=en-us
PRISMIC_CONTENT_MODE=prismic
PRISMIC_ACCESS_TOKEN=
PRISMIC_CUSTOM_TYPES_TOKEN=your-write-token
PRISMIC_WRITE_TOKEN=your-write-token
```

The repository's Content API is public, so no read token is currently needed. Migration tokens are server-only and needed locally, not in the deployed frontend. None of these variables should have a `PUBLIC_` prefix.

## Inspect and verify

```sh
npm run prismic:inspect   # Reads remote custom types and shared slices
npm run prismic:plan      # Writes the model/content snapshot plan; no remote writes
npm run prismic:push      # Updates Homepage, Form, and their shared slice models
npm run prismic:verify    # Checks the published section inventory and linked documents
```

The initial import and section repair are complete. Seed files are offline snapshots, not an authority over subsequent editor changes. The old `prismic:migrate` and `prismic:publish` commands refuse to repeat that initial import.

`scripts/prismic-redesign.mjs` records the one-time repair. Its stages are `prepare`, `import`, `publish`, and `verify`; the repair is already at `verified`. It converts the saved flat fields, updates the same document IDs, and verifies all content and images against its plan. It also checks that legal documents and unrelated models were preserved. Do not rerun a repair against new editorial content. Publishing affects the entire migration release, so unrelated migrations must not share that release.

## Build, test and deployment

```sh
npm run check
npm run build      # Fetches published content from Rancher
npm test           # Isolated server uses original-content snapshots and dummy analytics
```

For offline development, explicitly set `PRISMIC_CONTENT_MODE=snapshot`. Production defaults to `prismic` and fails on missing or incomplete content rather than silently falling back. Legal pages fetch their own published `legal` documents by UID. Full-website previews and the slice simulator use the uncached server routes described below.

Set `PRISMIC_REPOSITORY_NAME=rancher`, `PRISMIC_LOCALE=en-us` and `PRISMIC_CONTENT_MODE=prismic` in Vercel's deployment environments before deploying these changes. Preserve the existing submission, booking and PostHog variables.

## Preview configuration

Both environments expose the same routes:

| Environment | Full-website preview                     | Slice simulator                                  |
| ----------- | ---------------------------------------- | ------------------------------------------------ |
| Staging     | `https://staging.gorancher.com/preview/` | `https://staging.gorancher.com/slice-simulator/` |
| Production  | `https://www.gorancher.com/preview/`     | `https://www.gorancher.com/slice-simulator/`     |

These are separate features. The repository has a preview entry for each environment, but only **one active simulator URL**. Use the production simulator in Prismic so editor thumbnails are not blocked by staging's Vercel login. The staging simulator remains available to signed-in testers.

Open a document in Prismic and click **Preview**, then choose Staging or Production. Prismic supplies the token and document ID automatically. Visiting `/preview/` directly displays a readiness message, not a draft. A successful callback starts a host-only preview cookie and redirects to `/preview/view/` or `/preview/view/<legal-slug>/`. Navigation, footer, form, and page queries all use that session's ref. Follow site links to remain in the preview; use **Exit preview** to return to published content. An expired ref reports an error instead of falling back to published content.

Published pages stay prerendered. Preview routes use fresh clients per request, `private, no-store` responses, and noindex headers; draft refs never enter the published build cache. The Prismic toolbar is included in the shared layout.

The Astro simulator implements Prismic's official `@prismicio/simulator` messaging protocol. It renders the same nine Astro section components and React islands through `/slice-simulator/render/`. It supports repeated live updates, measures slice height, and disables links and form submission within thumbnails. Required fields must be filled before a slice can render. This is a custom Astro integration; it does not install a Next.js/Nuxt Slice Machine adapter or change the repository builder.

CLI configuration (already applied):

```sh
npx prismic preview add https://staging.gorancher.com/preview/ --name Staging --repo rancher
npx prismic preview add https://www.gorancher.com/preview/ --name Production --repo rancher
npx prismic preview set-simulator https://www.gorancher.com --repo rancher
npx prismic preview list --repo rancher --json
```

## Redeploy staging and production on publish

1. Open [Rancher → Settings → Git in Vercel](https://vercel.com/b2b-saas/rancher/settings/git), then **Deploy Hooks**.
2. Create these two hooks and copy their generated URLs:

   | Hook name            | Git branch | Deployment              |
   | -------------------- | ---------- | ----------------------- |
   | Prismic — Staging    | `staging`  | `staging.gorancher.com` |
   | Prismic — Production | `main`     | `www.gorancher.com`     |

3. In [Rancher Prismic](https://rancher.prismic.io/), open **Settings → Webhooks**. Add a webhook for each Vercel URL, with matching names.
4. Enable **A document is published** and **A document is unpublished** for both webhooks. Leave unrelated release/tag events off. No custom authorization header or webhook secret is required for Vercel deploy-hook URLs. Keep the generated URLs private.
5. Confirm these settings exist for both Production and Preview scoped to `staging`: `PRISMIC_REPOSITORY_NAME=rancher`, `PRISMIC_LOCALE=en-us`, and `PRISMIC_CONTENT_MODE=prismic`. These are configured. Preserve each environment's `SITE_URL`, PostHog, booking, and database settings.
6. Publish a change. Check **Prismic → Webhooks → Logs**, then **Vercel → Deployments** for two successful builds, one on each branch. Content becomes visible on each public site after its build finishes. A failed build leaves the last successful deployment serving.

Both branches read the same `rancher` repository, so publishing triggers both environments with the same published content. Deploy hooks rebuild the latest commit on their configured branch; they do not merge staging into main. Code changes still need to reach both branches. Draft previews do not need a publish or rebuild.

References: [Prismic previews](https://prismic.io/docs/previews), [Prismic webhooks](https://prismic.io/docs/webhooks), [Vercel deploy hooks](https://vercel.com/docs/deploy-hooks).
