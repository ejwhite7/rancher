export const title =
  "Rancher — Make Your Business Data Work as Hard as You Do.";
export const description =
  "Make your business data work as hard as you do. Explore licensing operational records to AI labs and turn everyday work into a new revenue opportunity with Rancher.";
export const imageAlt =
  "Rancher — Make Your Business Data Work as Hard as You Do. An illustrated landscape of cultivated fields.";

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
  faqs: { question: string; answer: string }[] = [],
  socialImage = {
    url: "/images/og-rancher-work-hard.png",
    alt: imageAlt,
    dimensions: { width: 1200, height: 630 },
  },
  siteDescription = description,
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
        description: siteDescription,
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
        description: siteDescription,
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
        url: new URL(socialImage.url, site).href,
        width: socialImage.dimensions.width,
        height: socialImage.dimensions.height,
        caption: socialImage.alt,
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
