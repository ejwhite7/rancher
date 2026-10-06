// One public origin for canonical tags, structured data, and every sitemap.
export const PUBLIC_SITE = "https://www.gorancher.com";

export function canonicalUrl(path: string) {
  const pathname = new URL(path, PUBLIC_SITE).pathname.replace(
    /^\/preview\/view(?=\/|$)/,
    "",
  );
  return new URL(`${pathname.replace(/\/+$/, "")}/`, PUBLIC_SITE);
}

export function includeInStaticSitemap(url: string) {
  // Glossary URLs belong exclusively to the live Prismic sitemap.
  return !/^\/(?:preview|slice-simulator|api|glossary|blog|authors)(?:\/|$)/.test(
    new URL(url).pathname,
  );
}

export function isIndexableDeployment(
  environment: string | undefined,
  site: URL,
) {
  return environment
    ? environment === "production"
    : site.origin === PUBLIC_SITE;
}

// Vercel Skew Protection makes Astro append ?dpl=<deployment> to chunk imports
// after content hashing, so every deployment ships different bytes under the
// same /_astro/ file names. A cache that reuses one deployment's chunk for
// another then loads a second React copy. A per-deployment directory keeps
// each asset URL bound to one set of bytes.
export function clientAssetsDir(env: Record<string, string | undefined>) {
  const deployment = env.VERCEL_DEPLOYMENT_ID;
  return env.VERCEL_SKEW_PROTECTION_ENABLED === "1" &&
    deployment &&
    /^[\w-]+$/.test(deployment)
    ? `_astro/${deployment}`
    : "_astro";
}
