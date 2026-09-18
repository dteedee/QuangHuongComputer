/**
 * Trang chủ.
 *
 * Content comes from the CMS (`GET /api/content/homepage/sections`) and is
 * rendered by `DynamicHomepage`; every section component behind it is now
 * server-filtered (W3-1). When the CMS returns nothing — or fails — the page
 * still renders a complete, data-driven default layout instead of a blank
 * screen: real categories, real product rows, the real flash sale (which shows
 * nothing when no sale is running) and the statutory policy links (D08).
 */
import { useQuery } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import SEO from '../components/SEO';
import { contentApi, type HomepageSection } from '../api/content';
import { DynamicHomepage } from '../components/DynamicHomepage';
import { HomepageSkeleton } from '../components/homepage/homepage-skeleton';
import { PromoMarqueeStrip } from '../components/homepage/promo-marquee-strip';
import { FallbackHero } from '../components/homepage/fallback-hero';
import { CategoryGridSection } from '../components/homepage/CategoryGridSection';
import { FlashSaleSection } from '../components/homepage/flash-sale-section';
import { ProductSection } from '../components/homepage/product-section';
import { PolicyLinksStrip } from '../components/homepage/policy-links-strip';
import { BrandShowcase } from '../components/homepage/BrandShowcase';
import { DualServiceBanner } from '../components/homepage/dual-service-banner';
import { TrustBadges } from '../components/homepage/trust-badges';
import { NewsletterCta } from '../components/homepage/newsletter-cta';
import { PostGridSection } from '../components/homepage/PostGridSection';
import { StudentTopSection, BusinessTopSection } from '../components/homepage/homepage-audience-top-sections';
import { AudienceSwitcher } from '../components/ui/audience-switcher';
import { useAudience } from '../context/AudienceContext';
import { queryKeys } from '../lib/query-keys';

/* Category ids of the seeded catalogue — used only by the no-CMS fallback
 * layout. Each row is a server-side query scoped to that category. */
const FALLBACK_SECTIONS = [
    { title: 'Laptop - Máy tính xách tay', categoryId: '59809214-8b1c-435b-b877-c98afbbfa27e', limit: 10 },
    { title: 'PC gaming & máy tính đồ hoạ', categoryId: '6874de51-2788-4914-bb36-04c2ef8a0587', limit: 10 },
    { title: 'Linh kiện máy tính', categoryId: 'cea082a1-b483-4796-abcb-370c106b67c2', limit: 10 },
];

export const HomePage = () => {
    const { audience } = useAudience();

    const sectionsQuery = useQuery<HomepageSection[]>({
        queryKey: queryKeys.content.list({ resource: 'homepage-sections' }),
        queryFn: contentApi.getHomepageSections,
        staleTime: 5 * 60 * 1000,
    });

    const sections = sectionsQuery.data ?? [];

    return (
        <div className="min-h-screen bg-bg pb-16 font-sans">
            <SEO
                title="Trang chủ"
                description="Quang Hưởng Computer - Chuyên cung cấp linh kiện máy tính, laptop, PC gaming chính hãng giá tốt tại Hải Phòng."
            />

            <PromoMarqueeStrip />

            <div className="mx-auto w-full max-w-shell px-4 pt-3">
                <AudienceSwitcher className="origin-left scale-90 justify-start" />
            </div>

            {audience === 'student' && <StudentTopSection />}
            {audience === 'business' && <BusinessTopSection />}

            {sectionsQuery.isError && (
                <div className="mx-auto w-full max-w-shell px-4 pt-4">
                    <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning-subtle px-4 py-2.5 text-sm text-fg">
                        <WifiOff size={16} className="shrink-0" aria-hidden />
                        <span>Không tải được nội dung tuỳ chỉnh, đang hiển thị bố cục mặc định.</span>
                    </div>
                </div>
            )}

            {sectionsQuery.isPending ? (
                <HomepageSkeleton />
            ) : sections.length > 0 ? (
                <DynamicHomepage sections={sections} />
            ) : (
                <>
                    <div className="mx-auto mt-4 w-full max-w-shell px-4">
                        <FallbackHero />
                    </div>
                    <CategoryGridSection title="Danh mục sản phẩm" config={{ limit: 10, columns: 5 }} />
                    <FlashSaleSection />
                    {FALLBACK_SECTIONS.map((s) => (
                        <ProductSection key={s.categoryId} title={s.title} categoryId={s.categoryId} limit={s.limit} />
                    ))}
                    <BrandShowcase title="Thương hiệu phân phối" />
                    <DualServiceBanner />
                    <PostGridSection title="TIN TỨC CÔNG NGHỆ" config={{ postType: 'News', limit: 4, columns: 4 }} />
                </>
            )}

            {/* D08 (NĐ52 Đ28.2.đ): the four policy pages must be reachable from
                the HOME page itself, not only from a footer on inner pages. */}
            <PolicyLinksStrip />
            <TrustBadges />
            <NewsletterCta />
        </div>
    );
};

export default HomePage;
