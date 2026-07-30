import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, BadgeCheck, FileText, Wrench, Percent, GraduationCap, Package } from 'lucide-react';
import SEO from '../components/SEO';
import { contentApi, type HomepageSection } from '../api/content';
import { DynamicHomepage } from '../components/DynamicHomepage';
import { HomepageSkeleton } from '../components/homepage/homepage-skeleton';
import { FallbackHero } from '../components/homepage/fallback-hero';
import { FallbackCategories } from '../components/homepage/fallback-categories';
import { TrustBadges } from '../components/homepage/trust-badges';
import { NewsletterCta } from '../components/homepage/newsletter-cta';
import { AudienceSwitcher } from '../components/ui/audience-switcher';
import { AnimatedSection } from '../components/motion/animated-section';
import { useAudience } from '../context/AudienceContext';

// ---------------------------------------------------------------------------
// Section top theo audience — nội dung hardcode ở phase này.
// Phase 08 sẽ chuyển sang lọc HomepageSection.audienceTag phía server.
// ---------------------------------------------------------------------------

const StudentTopSection = () => (
    <AnimatedSection className="max-w-6xl mx-auto px-4 pt-6">
        <div
            className="rounded-2xl p-6 md:p-8 border shadow-sm"
            style={{
                backgroundColor: 'var(--accent-primary-light, #FEF2F2)',
                borderColor: 'var(--accent-primary, #D22B2B)',
            }}
        >
            <div className="flex items-center gap-3 mb-3">
                <GraduationCap size={28} style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--ink-900, #1A1A1A)' }}>
                    Ưu đãi Học sinh–Sinh viên
                </h2>
            </div>
            <p className="text-sm md:text-base mb-5" style={{ color: 'var(--ink-600, #525252)' }}>
                Trang bị máy tính học tập gọn nhẹ, giá tốt. Xuất trình thẻ HS-SV để nhận thêm ưu đãi tại cửa hàng.
            </p>
            <div className="flex flex-wrap gap-3">
                <Link
                    to="/products?installment=0"
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full bg-white border text-sm font-medium hover:brightness-95"
                    style={{ borderColor: 'var(--accent-primary, #D22B2B)', color: 'var(--accent-primary, #D22B2B)' }}
                >
                    <Percent size={18} />
                    Trả góp 0%
                </Link>
                <Link
                    to="/products?maxPrice=15000000"
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full bg-white border text-sm font-medium hover:brightness-95"
                    style={{ borderColor: 'var(--accent-primary, #D22B2B)', color: 'var(--accent-primary, #D22B2B)' }}
                >
                    <BadgeCheck size={18} />
                    Giá dưới 15 triệu
                </Link>
                <Link
                    to="/products?tag=combo-hoc-tap"
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full bg-white border text-sm font-medium hover:brightness-95"
                    style={{ borderColor: 'var(--accent-primary, #D22B2B)', color: 'var(--accent-primary, #D22B2B)' }}
                >
                    <Package size={18} />
                    Combo học tập
                </Link>
            </div>
        </div>
    </AnimatedSection>
);

const BusinessTopSection = () => (
    <AnimatedSection className="max-w-6xl mx-auto px-4 pt-6">
        <div
            className="rounded-2xl p-6 md:p-8 border shadow-sm bg-white"
            style={{ borderColor: 'var(--accent-primary, #D22B2B)' }}
        >
            <div className="mb-4">
                <h2 className="text-xl md:text-2xl font-bold mb-1" style={{ color: 'var(--ink-900, #1A1A1A)' }}>
                    Doanh nghiệp mua số lượng
                </h2>
                <p className="text-sm md:text-base" style={{ color: 'var(--ink-600, #525252)' }}>
                    Giải pháp trang bị máy tính cho văn phòng, xuất hoá đơn VAT đầy đủ, bảo hành linh hoạt.
                </p>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <li className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border, #E5E5E5)' }}>
                    <FileText size={22} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--ink-900, #1A1A1A)' }}>Xuất hoá đơn VAT</p>
                        <p className="text-sm" style={{ color: 'var(--ink-600, #525252)' }}>Đầy đủ chứng từ, hỗ trợ kế toán.</p>
                    </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border, #E5E5E5)' }}>
                    <Wrench size={22} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--ink-900, #1A1A1A)' }}>Bảo hành tận nơi</p>
                        <p className="text-sm" style={{ color: 'var(--ink-600, #525252)' }}>Kỹ thuật tới văn phòng, tối thiểu gián đoạn.</p>
                    </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border, #E5E5E5)' }}>
                    <BadgeCheck size={22} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--ink-900, #1A1A1A)' }}>Giá ưu đãi số lượng lớn</p>
                        <p className="text-sm" style={{ color: 'var(--ink-600, #525252)' }}>Từ 5 máy trở lên nhận báo giá riêng.</p>
                    </div>
                </li>
            </ul>

            <Link
                to="/contact?type=quote"
                className="inline-flex items-center gap-2 min-h-[44px] px-5 py-3 rounded-full text-white text-sm font-semibold hover:brightness-95"
                style={{ backgroundColor: 'var(--accent-primary, #D22B2B)' }}
            >
                Yêu cầu báo giá
            </Link>
        </div>
    </AnimatedSection>
);

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

            {/* Content — DynamicHomepage cho mọi audience; Phase 08 sẽ lọc phía server */}
            {isLoading ? (
                <HomepageSkeleton />
            ) : sections.length > 0 ? (
                <DynamicHomepage sections={sections} />
            ) : (
                <div className="space-y-4 pb-20">
                    <FallbackHero />
                    <FallbackCategories />
                    <TrustBadges />
                    <NewsletterCta />
                </div>
            )}
        </div>
    );
};
