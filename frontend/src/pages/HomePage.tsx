import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Laptop, Wrench, Shield, Truck, HeadphonesIcon, ChevronRight, ShoppingBag, Star, Monitor, Gamepad, Cpu, Package } from 'lucide-react';
import SEO from '../components/SEO';
import { contentApi, type HomepageSection } from '../api/content';
import { DynamicHomepage } from '../components/DynamicHomepage';

// Skeleton shimmer for loading state
const HomepageSkeleton = () => (
    <div className="space-y-8 pb-20 animate-pulse">
        {/* Hero Skeleton */}
        <div className="max-w-[1400px] mx-auto px-4 pt-6">
            <div className="grid lg:grid-cols-4 gap-6">
                <div className="hidden lg:block bg-gray-200 rounded-2xl h-[500px]" />
                <div className="lg:col-span-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl h-[500px] relative overflow-hidden">
                    <div className="absolute inset-0 shimmer-fast" />
                </div>
            </div>
        </div>

        {/* Banner Skeleton */}
        <div className="max-w-[1400px] mx-auto px-4 mt-6">
            <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-gray-200 rounded-xl h-24 relative overflow-hidden">
                        <div className="absolute inset-0 shimmer-fast" />
                    </div>
                ))}
            </div>
        </div>

        {/* Product Grid Skeleton */}
        <div className="max-w-[1400px] mx-auto px-4 mt-12">
            <div className="bg-gray-200 rounded-t-2xl h-14 relative overflow-hidden">
                <div className="absolute inset-0 shimmer-fast" />
            </div>
            <div className="bg-white rounded-b-2xl border-2 border-t-0 border-gray-200 p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="space-y-3">
                            <div className="aspect-square bg-gray-200 rounded-lg relative overflow-hidden">
                                <div className="absolute inset-0 shimmer-fast" />
                            </div>
                            <div className="h-3 bg-gray-200 rounded w-full" />
                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                            <div className="h-5 bg-gray-200 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Another Product Grid */}
        <div className="max-w-[1400px] mx-auto px-4 mt-12">
            <div className="bg-gray-200 rounded-t-2xl h-14 relative overflow-hidden">
                <div className="absolute inset-0 shimmer-fast" />
            </div>
            <div className="bg-white rounded-b-2xl border-2 border-t-0 border-gray-200 p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="space-y-3">
                            <div className="aspect-square bg-gray-100 rounded-lg relative overflow-hidden">
                                <div className="absolute inset-0 shimmer-fast" />
                            </div>
                            <div className="h-3 bg-gray-100 rounded w-full" />
                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                            <div className="h-5 bg-gray-200 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Fallback hero when no sections load
const FallbackHero = () => (
    <div className="max-w-[1400px] mx-auto px-4 pt-6">
        <div className="relative bg-gradient-to-br from-accent via-[#c50016] to-[#8b0000] rounded-2xl overflow-hidden shadow-2xl h-[400px] md:h-[480px]">
            {/* Animated background shapes */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    className="absolute top-10 right-10 w-64 h-64 border border-white/10 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute bottom-10 left-10 w-40 h-40 border border-white/10 rounded-2xl"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-black/10 to-transparent" />
            </div>

            <div className="relative h-full flex items-center p-8 md:p-16 z-10">
                <div className="max-w-2xl">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center gap-2 bg-yellow-400 text-red-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg mb-6"
                    >
                        <Star size={14} className="fill-current" />
                        SỐ 1 HẢI PHÒNG
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-2xl"
                    >
                        Quang Hưởng<br />
                        <span className="text-yellow-300">Computer</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg mt-4 text-white/90 font-semibold drop-shadow max-w-lg"
                    >
                        Chuyên cung cấp Laptop, PC Gaming, Linh kiện máy tính chính hãng giá tốt nhất tại Hải Phòng
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-8 flex flex-wrap gap-4"
                    >
                        <Link
                            to="/products"
                            className="inline-flex items-center gap-3 bg-white text-red-600 px-8 py-4 rounded-full font-black text-lg uppercase hover:bg-yellow-400 hover:text-red-700 transition-all shadow-2xl hover:scale-105 active:scale-95"
                        >
                            <ShoppingBag className="fill-current" size={24} />
                            MUA NGAY
                            <ChevronRight size={24} />
                        </Link>
                        <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 bg-white/20 text-white px-6 py-4 rounded-full font-bold text-sm uppercase hover:bg-white/30 transition-all backdrop-blur-sm border border-white/30"
                        >
                            Liên hệ tư vấn
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    </div>
);

// Fallback category grid
const FallbackCategories = () => {
    const items = [
        { icon: Laptop, name: 'Laptop', color: 'from-blue-500 to-indigo-600' },
        { icon: Gamepad, name: 'PC Gaming', color: 'from-red-500 to-pink-600' },
        { icon: Monitor, name: 'Màn hình', color: 'from-purple-500 to-violet-600' },
        { icon: Cpu, name: 'Linh kiện', color: 'from-amber-500 to-orange-600' },
        { icon: Wrench, name: 'Sửa chữa', color: 'from-emerald-500 to-teal-600' },
        { icon: Package, name: 'Phụ kiện', color: 'from-sky-500 to-blue-600' },
    ];

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-12">
            <h2 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tight text-center mb-8">
                Danh mục sản phẩm
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
                {items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -8 }}
                        >
                            <Link
                                to="/products"
                                className="block bg-white rounded-2xl p-6 text-center border-2 border-gray-50 hover:border-accent/30 shadow-lg hover:shadow-2xl transition-all group"
                            >
                                <div className={`w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon size={28} />
                                </div>
                                <h4 className="font-bold text-gray-800 text-xs uppercase leading-tight">
                                    {item.name}
                                </h4>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

// Trust badges section
const TrustBadges = () => (
    <div className="max-w-[1400px] mx-auto px-4 mt-12">
        <div className="bg-gradient-to-br from-white via-red-50 to-amber-50 rounded-3xl border-2 border-red-100 p-8 shadow-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { icon: Truck, title: 'Giao hàng miễn phí', desc: 'Đơn từ 500K toàn quốc', color: 'text-blue-600 bg-blue-50' },
                    { icon: Shield, title: 'Bảo hành chính hãng', desc: 'Cam kết 100% authentic', color: 'text-emerald-600 bg-emerald-50' },
                    { icon: HeadphonesIcon, title: 'Hỗ trợ 24/7', desc: 'Hotline: 0904.235.090', color: 'text-amber-600 bg-amber-50' },
                    { icon: Star, title: 'Uy tín #1', desc: 'Số 1 tại Hải Phòng', color: 'text-accent bg-red-50' },
                ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center group"
                        >
                            <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <Icon size={28} />
                            </div>
                            <h4 className="font-black text-gray-800 text-sm uppercase mb-1">{item.title}</h4>
                            <p className="text-xs text-gray-500 font-medium">{item.desc}</p>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    </div>
);

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
                title="Trang chủ"
                description="Quang Hưởng Computer - Chuyên cung cấp linh kiện máy tính, laptop, PC gaming chính hãng giá tốt tại Hải Phòng. Hệ thống bán lẻ máy tính uy tín số 1."
            />

            {/* Promotional Banner with marquee effect */}
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

            {/* Content */}
            {isLoading ? (
                <HomepageSkeleton />
            ) : sections.length > 0 ? (
                <DynamicHomepage sections={sections} />
            ) : (
                // Fallback content when API fails or returns empty
                <div className="space-y-4 pb-20">
                    <FallbackHero />
                    <FallbackCategories />
                    <TrustBadges />
                </div>
            )}
        </div>
    );
};
