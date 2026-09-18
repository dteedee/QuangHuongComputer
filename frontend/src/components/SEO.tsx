import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  /** Working props (D11, wave 3). */
  title?: string;
  description?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  /** Chỉ bật khi muốn chặn cả việc bò theo link trên trang (hiếm). Xem D11. */
  nofollow?: boolean;
  /**
   * Deprecated no-ops (D11): the .NET SEO shell (W2-17) now renders OG/JSON-LD
   * server-side per URL, so the client no longer duplicates them. Kept in the
   * prop type only so W3-1 (CategoryPage) and W3-7 (ProductDetailPage) keep
   * compiling through wave 3 without editing their call sites; W4-5 removes
   * these once every call site is clean. Do not read or render these here.
   */
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Client-side <head> tags for navigation after first paint.
 *
 * D11 (wave 3): the server-rendered SEO shell (`index.html` between the
 * `<!-- seo:head -->` markers, replaced per-URL by the .NET shell) owns the
 * first-paint title/description/OG/JSON-LD for crawlers. This component only
 * owns title/description/canonical/robots for the SPA once React has taken
 * over, and on first mount removes any leftover `[data-seo-shell]` nodes from
 * `<head>` so react-helmet-async never renders a second `<title>`/`og:*` set
 * alongside the shell's.
 */
const SEO: React.FC<SEOProps> = ({
  title,
  description = 'Quang Hưởng Computer - Chuyên cung cấp linh kiện máy tính, laptop, PC gaming chính hãng. Bảo hành tận nơi, xuất hoá đơn VAT.',
  canonicalUrl,
  noindex = false,
  nofollow = false,
}) => {
  const siteTitle = title
    ? `${title} | Quang Hưởng Computer`
    : 'Quang Hưởng Computer - Máy tính chính hãng, dịch vụ tận tâm';
  const canonical = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-seo-shell]').forEach((node) => node.remove());
  }, []);

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      {/* D11: trang lọc/tìm kiếm KHÔNG index, nhưng vẫn phải follow — "nofollow" chặn luôn
          đường bò tới các trang sản phẩm bên dưới, tức là tự cắt index của chính PDP.
          Chỉ đặt nofollow khi thật sự muốn chặn cả link (mặc định: không). */}
      {noindex && <meta name="robots" content={nofollow ? 'noindex, nofollow' : 'noindex, follow'} />}
      <link rel="canonical" href={canonical} />
    </Helmet>
  );
};

export default SEO;
