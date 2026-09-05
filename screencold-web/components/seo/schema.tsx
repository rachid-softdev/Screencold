import type { JSX } from "react";

/**
 * Safe JSON-LD script component - uses dangerouslySetInnerHTML which is required
 * for JSON-LD structured data injection. This is safe because the content is
 * JSON.stringify() output, not user-generated HTML.
 */
function JsonLdScript({ schema }: { schema: Record<string, unknown> }): JSX.Element {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface OrganizationSchemaProps {
  name?: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

interface ProductSchemaProps {
  name: string;
  description: string;
  price: string;
  priceCurrency: string;
  brand?: string;
}

interface ArticleSchemaProps {
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  image?: string;
  url: string;
}

interface FAQSchemaProps {
  faqs: Array<{ question: string; answer: string }>;
}

/**
 * Organization Schema - JSON-LD for structured data
 */
export function OrganizationSchema({
  name = "ScreenCold",
  url,
  logo,
  description,
  sameAs = [],
}: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    ...(logo && { logo }),
    ...(description && { description }),
    ...(sameAs.length > 0 && { sameAs }),
  };

  return <JsonLdScript schema={schema} />;
}

/**
 * Product Schema - For pricing page
 */
export function ProductSchema({
  name,
  description,
  price,
  priceCurrency = "EUR",
  brand = "ScreenCold",
}: ProductSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    brand: {
      "@type": "Brand",
      name: brand,
    },
    offers: {
      "@type": "Offer",
      price,
      priceCurrency,
      availability: "https://schema.org/InStock",
    },
  };

  return <JsonLdScript schema={schema} />;
}

/**
 * Article Schema - For blog posts
 */
export function ArticleSchema({
  headline,
  description,
  datePublished,
  dateModified,
  author = "ScreenCold Team",
  image,
  url,
}: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    ...(dateModified && { dateModified }),
    datePublished,
    author: {
      "@type": "Person",
      name: author,
    },
    ...(image && { image }),
    url,
    publisher: {
      "@type": "Organization",
      name: "ScreenCold",
      logo: {
        "@type": "ImageObject",
        url: `${url}/logo.png`,
      },
    },
  };

  return <JsonLdScript schema={schema} />;
}

/**
 * FAQ Schema - For FAQ page
 */
export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return <JsonLdScript schema={schema} />;
}

/**
 * Breadcrumb Schema
 */
export function BreadcrumbSchema({
  items,
}: {
  items: Array<{ name: string; url: string }>;
  url: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLdScript schema={schema} />;
}

/**
 * WebSite Schema with SearchAction
 */
export function WebSiteSchema({ url }: { url: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ScreenCold",
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/blog?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLdScript schema={schema} />;
}

/**
 * SoftwareApplication Schema
 */
export function SoftwareApplicationSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://screencold.com";
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ScreenCold",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    description:
      "Automate your B2B prospecting with AI-powered website audits and personalized outreach emails.",
    url: baseUrl,
  };

  return <JsonLdScript schema={schema} />;
}
