import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, WifiOff } from 'lucide-react';
import SEO from '../components/SEO';
import { contentApi, type HomepageSection } from '../api/content';
import { DynamicHomepage } from '../components/DynamicHomepage';
import { HomepageSkeleton } from '../components/homepage/homepage-skeleton';
import { FallbackHero } from '../components/homepage/fallback-hero';
import { FallbackCategories } from '../components/homepage/fallback-categories';
import { CategorySidebarMenu } from '../components/homepage/category-sidebar-menu';
import { TrustBadges } from '../components/homepage/trust-badges';
import { NewsletterCta } from '../components/homepage/newsletter-cta';
import { ProductGridSection } from '../components/homepage/ProductGridSection';
import { StudentTopSection, BusinessTopSection } from '../components/homepage/homepage-audience-top-sections';
import { AudienceSwitcher } from '../components/ui/audience-switcher';
import { useAudience } from '../context/AudienceContext';

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
                title="Trang chu"
                description="Quang Huong Computer - Chuyen cung cap linh kien may tinh, laptop, PC gaming chinh hang gia tot tai Hai Phong. He thong ban le may tinh uy tin so 1."
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
                            Mien phi giao hang cho don tu 500K &nbsp;&bull;&nbsp; Tra gop 0% lai suat &nbsp;&bull;&nbsp; Bao hanh chinh hang &nbsp;&bull;&nbsp; Ho tro 24/7 &ensp;|&ensp; Hotline: 0904.235.090
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
                    {/* Body 3 cột: sidebar danh mục + hero, theo bố cục hacom.vn */}
                    <div className="max-w-[1400px] mx-auto px-4 pt-6 flex gap-4 items-stretch">
                        <CategorySidebarMenu />
                        <div className="flex-1 min-w-0">
                            <FallbackHero />
                        </div>
                    </div>
                    <FallbackCategories />
                    <ProductGridSection
                        title="Sản phẩm nổi bật"
                        config={{ limit: 10, icon: 'Sparkles', showViewAll: true }}
                    />
                    <TrustBadges />
                    <NewsletterCta />
                </div>
            )}
        </div>
    );
};
