import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, WifiOff } from 'lucide-react';
import SEO from '../components/SEO';
import { contentApi, type HomepageSection } from '../api/content';
import { DynamicHomepage } from '../components/DynamicHomepage';
import { HomepageSkeleton } from '../components/homepage/homepage-skeleton';
import { FallbackHero } from '../components/homepage/fallback-hero';
import { FallbackCategories } from '../components/homepage/fallback-categories';
import { FallbackFlashStrip } from '../components/homepage/fallback-flash-strip';
import { BrandRow } from '../components/homepage/brand-row';
import { DualServiceBanner } from '../components/homepage/dual-service-banner';
import { SkyscraperBanner } from '../components/homepage/skyscraper-banner';
import { CategorySidebarMenu } from '../components/homepage/category-sidebar-menu';
import { TrustBadges } from '../components/homepage/trust-badges';
import { NewsletterCta } from '../components/homepage/newsletter-cta';
import { ProductGridSection } from '../components/homepage/ProductGridSection';
import { PostGridSection } from '../components/homepage/PostGridSection';
import { StudentTopSection, BusinessTopSection } from '../components/homepage/homepage-audience-top-sections';
import { AudienceSwitcher } from '../components/ui/audience-switcher';
import { useAudience } from '../context/AudienceContext';

// Category IDs (Catalog seed data) — dùng cho fallback ProductGridSection theo category thật
const CATEGORY_LAPTOP = '59809214-8b1c-435b-b877-c98afbbfa27e';
const CATEGORY_PC_GAMING = '6874de51-2788-4914-bb36-04c2ef8a0587';
const CATEGORY_LINH_KIEN = 'cea082a1-b483-4796-abcb-370c106b67c2';

// ---------------------------------------------------------------------------
// Trang chủ
// ---------------------------------------------------------------------------

export const HomePage = () => {
    const [sections, setSections] = useState<HomepageSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const { audience } = useAudience();

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const data = await contentApi.getHomepageSections();
                setSections(data);
                setHasError(false);
            } catch (error) {
                console.error('Failed to load homepage sections', error);
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSections();
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen pb-20 font-sans selection:bg-red-100">
            <SEO
                title="Trang chủ"
                description="Quang Hưởng Computer - Chuyên cung cấp linh kiện máy tính, laptop, PC gaming chính hãng giá tốt tại Hải Phòng. Hệ thống bán lẻ máy tính uy tín số 1."
            />

            {/* Promotional marquee banner */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-accent to-[#b91c1c] text-white py-2.5 text-center overflow-hidden"
            >
                <div className="flex items-center justify-center gap-2">
                    <Zap className="text-yellow-300 flex-shrink-0" size={18} />
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold tracking-wide whitespace-nowrap animate-marquee">
                            Miễn phí giao hàng cho đơn từ 500K &nbsp;&bull;&nbsp; Trả góp 0% lãi suất &nbsp;&bull;&nbsp; Bảo hành chính hãng &nbsp;&bull;&nbsp; Hỗ trợ 24/7 &ensp;|&ensp; Hotline: 0904.235.090
                        </p>
                    </div>
                    <Zap className="text-yellow-300 flex-shrink-0" size={18} />
                </div>
            </motion.div>

            {/* Audience switcher strip — nằm dưới Header, trên nội dung động */}
            <div className="bg-white border-b" style={{ borderColor: 'var(--border, #E5E5E5)' }}>
                <div className="max-w-6xl mx-auto px-4 py-3">
                    <AudienceSwitcher />
                </div>
            </div>

            {/* Section top hardcode theo audience (student/business) */}
            {audience === 'student' && <StudentTopSection />}
            {audience === 'business' && <BusinessTopSection />}

            {/* Thông báo khi tải nội dung động thất bại — vẫn hiển thị bố cục mặc định bên dưới */}
            {!isLoading && hasError && (
                <div className="max-w-[1400px] mx-auto px-4 pt-4">
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm rounded-xl px-4 py-2.5">
                        <WifiOff size={16} className="flex-shrink-0" />
                        <span>Không tải được nội dung tuỳ chỉnh, đang hiển thị trang chủ mặc định.</span>
                    </div>
                </div>
            )}

            {/* Content — DynamicHomepage cho mọi audience; Phase 08 sẽ lọc phía server */}
            {isLoading ? (
                <HomepageSkeleton />
            ) : sections.length > 0 ? (
                <DynamicHomepage sections={sections} />
            ) : (
                <div className="space-y-4 pb-20">
                    {/* Skyscraper banner phải — chỉ hiện ở màn hình rất rộng (>=1536px) */}
                    <SkyscraperBanner />

                    {/* Body 3 cột: sidebar danh mục + hero, theo bố cục hacom.vn */}
                    <div className="max-w-[1400px] mx-auto px-4 pt-6 flex gap-4 items-stretch">
                        <CategorySidebarMenu />
                        <div className="flex-1 min-w-0">
                            <FallbackHero />
                        </div>
                    </div>

                    <FallbackCategories />
                    <FallbackFlashStrip />

                    <ProductGridSection
                        title="LAPTOP - MÁY TÍNH XÁCH TAY"
                        config={{ categoryId: CATEGORY_LAPTOP, limit: 10, icon: 'Laptop', showViewAll: true }}
                    />
                    <ProductGridSection
                        title="PC GAMING & MÁY TÍNH ĐỒ HỌA"
                        config={{ categoryId: CATEGORY_PC_GAMING, limit: 8, icon: 'Gamepad', showViewAll: true }}
                    />
                    <ProductGridSection
                        title="LINH KIỆN MÁY TÍNH"
                        config={{ categoryId: CATEGORY_LINH_KIEN, limit: 8, icon: 'Cpu', showViewAll: true }}
                    />

                    <BrandRow />
                    <DualServiceBanner />

                    <PostGridSection title="TIN TỨC CÔNG NGHỆ" config={{ postType: 'News', limit: 4, columns: 4 }} />

                    <TrustBadges />
                    <NewsletterCta />
                </div>
            )}
        </div>
    );
};
