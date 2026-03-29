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
        <div className="relative bg-gradient-to-br from-slate-900 via-red-900 to-black rounded-3xl overflow-hidden shadow-2xl h-[400px] md:h-[520px]">
            {/* Animated background shapes */}
            <div className="absolute inset-0 overflow-hidden opacity-40">
                <motion.div
                    className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-red-600/30 blur-[100px] rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-accent/20 blur-[80px] rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            <div className="relative h-full flex items-center p-8 md:p-16 z-10">
                <div className="max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg mb-8"
                    >
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        Đại lý ủy quyền chính hãng
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-5xl lg:text-7xl font-black text-white leading-[1.1] drop-shadow-2xl"
                    >
                        Nâng Tầm<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-yellow-400">Trải Nghiệm</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg md:text-xl mt-6 text-gray-300 font-medium max-w-lg leading-relaxed mix-blend-lighten"
                    >
                        Chuyên cung cấp Laptop, PC Gaming, và linh kiện máy tính cao cấp với dịch vụ hậu mãi tốt nhất tại Hải Phòng.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-10 flex flex-wrap gap-4"
                    >
                        <Link
                            to="/products"
                            className="inline-flex items-center gap-3 bg-gradient-to-r from-accent to-[#b91c1c] text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-red-500/30 transition-all hover:-translate-y-1"
                        >
                            <ShoppingBag size={22} />
                            Khám Phá Ngay
                        </Link>
                        <Link
                            to="/build-pc"
                            className="inline-flex items-center gap-2 bg-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all backdrop-blur-md border border-white/20 hover:-translate-y-1"
                        >
                            <Cpu size={22} />
                            Build PC
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
        { icon: Laptop, name: 'Laptop', color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600' },
        { icon: Gamepad, name: 'PC Gaming', color: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600' },
        { icon: Monitor, name: 'Màn hình', color: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600' },
        { icon: Cpu, name: 'Linh kiện', color: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white hover:border-amber-600' },
        { icon: Wrench, name: 'Sửa chữa', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600' },
        { icon: Package, name: 'Phụ kiện', color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-600 hover:text-white hover:border-purple-600' },
    ];

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-16">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                    Khám phá danh mục
                </h2>
                <Link to="/products" className="text-sm font-semibold text-accent hover:underline flex items-center gap-1">
                    Xem tất cả <ChevronRight size={16} />
                </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Link
                                to="/products"
                                className={`flex flex-col items-center justify-center p-6 bg-white rounded-2xl border transition-all duration-300 group ${item.color}`}
                            >
                                <Icon size={32} className="mb-4 transition-transform duration-300 group-hover:scale-110" />
                                <h4 className="font-semibold text-sm">
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
    <div className="max-w-[1400px] mx-auto px-4 mt-16">
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { icon: Truck, title: 'Giao hàng tận nơi', desc: 'Miễn phí cho đơn từ 500K', color: 'text-blue-600 bg-blue-50' },
                    { icon: Shield, title: 'Bảo hành an tâm', desc: 'Cam kết 100% chính hãng', color: 'text-emerald-600 bg-emerald-50' },
                    { icon: HeadphonesIcon, title: 'Hỗ trợ chu đáo', desc: 'Hotline: 0904.235.090', color: 'text-amber-600 bg-amber-50' },
                    { icon: Star, title: 'Đánh giá uy tín', desc: 'Hàng ngàn khách hàng tin dùng', color: 'text-accent bg-red-50' },
                ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-4 group"
                        >
                            <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                                <Icon size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h4>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
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
