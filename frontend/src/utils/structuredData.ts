/**
 * Structured Data (JSON-LD) generators for SEO.
 * Follows Schema.org specifications for Vietnamese e-commerce.
 */
import type { Product } from '../api/catalog';

const SITE_NAME = 'Quang Hưởng Computer';
const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://quanghuongcomputer.com';

/** Organization schema — used site-wide */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ComputerStore',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'Chuyên cung cấp linh kiện máy tính, laptop, PC gaming chính hãng giá tốt tại Hải Dương.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Hải Dương',
      addressCountry: 'VN',
    },
    sameAs: [],
  };
}

/** Website schema with SearchAction */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/danh-muc/search?query={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** BreadcrumbList schema */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url?: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}` } : {}),
    })),
  };
}

/** Product schema for product detail pages */
export function generateProductSchema(product: Product) {
  const imageUrl = product.imageUrl?.startsWith('http')
    ? product.imageUrl
    : `${SITE_URL}${product.imageUrl || '/logo.png'}`;

  const availability =
    product.status === 'InStock' || product.status === 'LowStock'
      ? 'https://schema.org/InStock'
      : product.status === 'PreOrder'
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description?.replace(/<[^>]*>/g, '').slice(0, 300) || '',
    image: imageUrl,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brandId, // Will be resolved to brand name by caller if available
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/san-pham/${product.id}`,
      priceCurrency: 'VND',
      price: product.price,
      availability,
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
      ...(product.oldPrice && product.oldPrice > product.price
        ? {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: product.price,
              priceCurrency: 'VND',
            },
          }
        : {}),
    },
    ...(product.averageRating > 0 && product.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.averageRating.toFixed(1),
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

/** ItemList schema for category / search results pages */
export function generateItemListSchema(
  products: Product[],
  listName: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/san-pham/${product.id}`,
      name: product.name,
    })),
  };
}

/** FAQ schema — for policy / about pages */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
