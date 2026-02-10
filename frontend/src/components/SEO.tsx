import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description = 'Quang Hưởng Computer - Chuyên cung cấp linh kiện máy tính, laptop, PC gaming chính hãng giá tốt tại Hải Dương.',
  keywords = 'máy tính, laptop, pc gaming, linh kiện máy tính, hải dương, quang hưởng computer',
  image = '/logo.png',
  url = window.location.href,
  type = 'website',
}) => {
  const siteTitle = title ? `${title} | Quang Hưởng Computer` : 'Quang Hưởng Computer - Linh kiện máy tính chính hãng';

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <link rel="canonical" href={url} />
    </Helmet>
  );
};

export default SEO;
