import faqs from "../data/faqs.json";
export const title = "Rancher — Your business data has a second harvest.";
export const description =
  "Rancher helps businesses explore licensing their operational data to AI labs. Turn everyday work into a new revenue opportunity, on your terms.";
export const imageAlt =
  "Rancher — Your business data. A second harvest. An illustrated landscape of cultivated fields.";

export function isPublicSite(site: URL) {
  return (
    !["localhost", "127.0.0.1", "[::1]"].includes(site.hostname) &&
    !/\.(example|test|invalid|localhost)$/.test(site.hostname)
  );
}

export function structuredData(
  site: URL,
  canonical: URL,
  page: { title: string; description: string } = { title, description },
) {
  const isHome = canonical.pathname === "/";
  const id = (hash: string) => new URL(hash, site).href;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": id("#organization"),
        name: "Rancher",
        url: site.href,
        description,
        logo: {
          "@type": "ImageObject",
          url: new URL("/images/rancher-logo.png", site).href,
        },
      },
      {
        "@type": "WebSite",
        "@id": id("#website"),
        name: "Rancher",
        url: site.href,
        description,
        inLanguage: "en-US",
        publisher: { "@id": id("#organization") },
      },
      {
        "@type": "WebPage",
        "@id": `${canonical.href}#webpage`,
        url: canonical.href,
        name: page.title,
        description: page.description,
        inLanguage: "en-US",
        isPartOf: { "@id": id("#website") },
        about: { "@id": id(isHome ? "#service" : "#organization") },
        primaryImageOfPage: { "@id": id("#primaryimage") },
      },
      {
        "@type": "ImageObject",
        "@id": id("#primaryimage"),
        url: new URL("/images/og-rancher.png", site).href,
        width: 1200,
        height: 630,
        caption: imageAlt,
      },
      {
        "@type": "Service",
        "@id": id("#service"),
        name: "Business data licensing exploration",
        serviceType: "Business data licensing",
        provider: { "@id": id("#organization") },
        url: new URL("/#how-it-works", site).href,
        description:
          "Explore operational records for potential licensing to AI labs, with scope, rights, preparation, and commercial terms reviewed before delivery.",
      },
      {
        "@type": "FAQPage",
        "@id": id("#faq"),
        isPartOf: { "@id": `${canonical.href}#webpage` },
        mainEntity: faqs.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ].filter(
      (entity) => isHome || !["Service", "FAQPage"].includes(entity["@type"]),
    ),
  };
}
