import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Zap, Laptop, Wrench, Shield, Truck, HeadphonesIcon,
    ChevronRight, ShoppingBag, Star, Monitor, Gamepad,
    Cpu, Package, Mail, BadgeCheck
} from 'lucide-react';
import SEO from '../components/SEO';
import { contentApi, type HomepageSection } from '../api/content';
import { DynamicHomepage } from '../components/DynamicHomepage';
import { HomepageSkeleton } from '../components/homepage/homepage-skeleton';
import { FallbackHero } from '../components/homepage/fallback-hero';
import { FallbackCategories } from '../components/homepage/fallback-categories';
import { TrustBadges } from '../components/homepage/trust-badges';
import { NewsletterCta } from '../components/homepage/newsletter-cta';

export const HomePage = () => {
    const [sections, setSections] = useState<HomepageSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

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

            {/* Content */}
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
