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
  return !/^\/(?:preview|slice-simulator|api|glossary)(?:\/|$)/.test(
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
