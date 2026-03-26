import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import SEO from '../components/SEO';
import { contentApi, type HomepageSection } from '../api/content';
import { DynamicHomepage } from '../components/DynamicHomepage';

export const HomePage = () => {
    const [sections, setSections] = useState<HomepageSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const data = await contentApi.getHomepageSections();
                setSections(data);
            } catch (error) {
                console.error('Failed to load homepage sections', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSections();
    }, []);

    if (isLoading) return (
        <div className="flex justify-center items-center py-40 min-h-[60vh] bg-gray-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-[#D70018] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-500">Đang tải trang chủ...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen pb-20 font-sans selection:bg-red-100">
            <SEO
                title="Trang chủ"
                description="Quang Hưởng Computer - Chuyên cung cấp linh kiện máy tính, laptop, PC gaming chính hãng giá tốt tại Hải Phòng. Hệ thống bán lẻ máy tính uy tín số 1."
            />

            {/* Promotional Banner */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#D70018] to-[#b91c1c] text-white py-2.5 text-center"
            >
                <div className="flex items-center justify-center gap-2">
                    <Zap className="text-yellow-300" size={18} />
                    <p className="text-sm font-bold tracking-wide">
                        Miễn phí giao hàng cho đơn từ 500K • Trả góp 0% lãi suất
                    </p>
                    <Zap className="text-yellow-300" size={18} />
                </div>
            </motion.div>

            {/* Dynamic Content Rendering */}
            <DynamicHomepage sections={sections} />
        </div>
    );
};
