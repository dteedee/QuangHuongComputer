import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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

    const tetDecorations = [
        { icon: '🎊', x: '10%', y: '20%', delay: 0, size: 'text-4xl' },
        { icon: '🧧', x: '85%', y: '15%', delay: 0.5, size: 'text-5xl' },
        { icon: '🎆', x: '5%', y: '70%', delay: 1, size: 'text-3xl' },
        { icon: '🏮', x: '90%', y: '65%', delay: 0.8, size: 'text-4xl' },
        { icon: '✨', x: '50%', y: '10%', delay: 0.3, size: 'text-3xl' },
        { icon: '🎁', x: '15%', y: '85%', delay: 1.2, size: 'text-4xl' },
        { icon: '🌸', x: '80%', y: '80%', delay: 0.6, size: 'text-3xl' },
    ];

    if (isLoading) return (
        <div className="flex justify-center items-center py-40 min-h-[60vh] bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-red-100 border-t-[#D70018] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg font-bold text-gray-600">Đang khởi tạo không gian Tết...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 min-h-screen pb-20 font-sans selection:bg-red-100 relative overflow-hidden">
            <SEO
                title="Trang chủ"
                description="Quang Hưởng Computer - Chuyên cung cấp linh kiện máy tính, laptop, PC gaming chính hãng giá tốt tại Hải Phòng. Hệ thống bán lẻ máy tính uy tín số 1."
            />
            {/* Tết Decorations - Floating Icons */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                {tetDecorations.map((deco, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -50, rotate: 0 }}
                        animate={{
                            opacity: [0.3, 0.7, 0.3],
                            y: [-20, 20, -20],
                            rotate: [0, 10, -10, 0]
                        }}
                        transition={{
                            duration: 5 + i,
                            repeat: Infinity,
                            delay: deco.delay,
                            ease: "easeInOut"
                        }}
                        className={`absolute ${deco.size} drop-shadow-lg`}
                        style={{ left: deco.x, top: deco.y }}
                    >
                        {deco.icon}
                    </motion.div>
                ))}
            </div>

            {/* Tết Banner Greeting */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-red-600 via-red-700 to-amber-600 text-white py-3 text-center relative overflow-hidden z-20"
            >
                <div className="flex items-center justify-center gap-3 relative z-10">
                    <Sparkles className="text-yellow-300 animate-pulse" size={20} />
                    <p className="text-sm font-black uppercase tracking-widest">
                        🧧 Tết Bính Ngọ 2026 - Ưu đãi lên đến 50% + Quà tặng hấp dẫn 🎁
                    </p>
                    <Sparkles className="text-yellow-300 animate-pulse" size={20} />
                </div>
            </motion.div>

            {/* Dynamic Content Rendering */}
            <div className="relative z-10">
                <DynamicHomepage sections={sections} />
            </div>
        </div>
    );
};
