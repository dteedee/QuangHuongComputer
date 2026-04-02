import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
  canonicalUrl?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

const SEO: React.FC<SEOProps> = ({
  title,
  description = 'Quang Hưởng Computer - Chuyên cung cấp linh kiện máy tính, laptop, PC gaming chính hãng giá tốt tại Hải Dương.',
  keywords = 'máy tính, laptop, pc gaming, linh kiện máy tính, hải dương, quang hưởng computer',
  image = '/logo.png',
  url,
  type = 'website',
  noindex = false,
  canonicalUrl,
  structuredData,
}) => {
  const siteTitle = title ? `${title} | Quang Hưởng Computer` : 'Quang Hưởng Computer - Linh kiện máy tính chính hãng';
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const canonical = canonicalUrl || currentUrl;

  // Ensure image is absolute URL, gracefully handling null
  const safeImage = image || '/logo.png';
  const absoluteImage = safeImage.startsWith('http')
    ? safeImage
    : `${typeof window !== 'undefined' ? window.location.origin : ''}${safeImage}`;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content="Quang Hưởng Computer" />
      <meta property="og:locale" content="vi_VN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />

      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(structuredData) ? structuredData : structuredData,
            null,
            0
          )}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
