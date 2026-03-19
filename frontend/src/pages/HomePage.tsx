<<<<<<< HEAD
=======
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';
import {
    Monitor, ChevronRight, Gamepad, Server, Cpu,
    Wifi, Wrench, Zap, Laptop, ShieldCheck,
    Truck, Award, MousePointer2,
    Speaker, Camera, Headset, Gift, Sparkles, Star
} from 'lucide-react';
import { PromotionSection } from '../components/PromotionSection';
import FlashSaleBanner from '../components/FlashSaleBanner';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { catalogApi, type Category } from '../api/catalog';
>>>>>>> bf48e5ee90719c89aab02df3203b7dbb9b1bb077
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import SEO from '../components/SEO';
import { contentApi, type HomepageSection } from '../api/content';
import { DynamicHomepage } from '../components/DynamicHomepage';

export const HomePage = () => {
    const [sections, setSections] = useState<HomepageSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { data: products, isLoading, error } = useProducts();
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryIds, setCategoryIds] = useState<{
        laptop?: string;
        gaming?: string;
        components?: string;
        gear?: string;
        screens?: string;
    }>({});

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const data = await contentApi.getHomepageSections();
                setSections(data);
            } catch (error) {
                console.error('Failed to load homepage sections', error);
            } finally {
                setIsLoading(false);
                const data = await catalogApi.getCategories();
                // Filter only active categories
                const activeCategories = data.filter(c => c.isActive);
                setCategories(activeCategories);

                // Find category IDs for each section
                // Use description field to match categories - matches seeder exactly
                const categoryMap = {
                    laptop: activeCategories.find(c => c.description === 'laptop')?.id,
                    gaming: activeCategories.find(c => c.description === 'pc-gaming')?.id,
                    components: activeCategories.find(c => c.description === 'components')?.id,
                    gear: activeCategories.find(c => c.description === 'gear')?.id,
                    screens: activeCategories.find(c => c.description === 'screens')?.id,
                };
                setCategoryIds(categoryMap);
            } catch (err) {
                console.error('Failed to fetch categories', err);
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

<<<<<<< HEAD
    {/* Dynamic Content Rendering */ }
    <div className="relative z-10">
        <DynamicHomepage sections={sections} />
    </div>
=======
            {/* Hero Section */}
            <div className="max-w-[1400px] mx-auto px-4 pt-6 relative z-10">
                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Left Categories Sidebar */}
                    {/* Left Categories Sidebar - Fixed Height matching Slider */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="hidden lg:flex flex-col bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-red-200 overflow-hidden shadow-xl h-[500px]"
                    >
                        <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white px-4 py-3 flex-shrink-0">
                            <h3 className="font-black uppercase text-sm tracking-wider flex items-center gap-2">
                                <Gift size={18} />
                                DANH MỤC SẢN PHẨM
                            </h3>
                        </div>
                        <div className="py-2 flex-1 overflow-y-auto custom-scrollbar">
                            {categories
                                .filter(cat => (cat.productCount ?? 0) > 0)
                                .map((cat) => (
                                <Link
                                    key={cat.id}
                                    to={`/products?category=${cat.id}`}
                                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-amber-50 hover:text-[#D70018] transition-all group border-l-4 border-transparent hover:border-[#D70018]"
                                >
                                    <span className="text-gray-400 group-hover:text-[#D70018] transition-colors">
                                        {getCategoryIcon(cat.name)}
                                    </span>
                                    <span className="flex-1 line-clamp-1">{cat.name}</span>
                                    <span className="text-xs text-gray-400 group-hover:text-[#D70018]">({cat.productCount})</span>
                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#D70018]" />
                                </Link>
                            ))}
                        </div>
                    </motion.div>

                    {/* Main Banner Carousel */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="lg:col-span-3 space-y-6"
                    >
                        {/* Hero Slider */}
                        <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                            <Swiper
                                modules={[Navigation, Pagination, Autoplay, EffectFade]}
                                navigation
                                pagination={{ clickable: true }}
                                autoplay={{ delay: 5000, disableOnInteraction: false }}
                                effect="fade"
                                loop
                                className="h-[400px] md:h-[500px]"
                            >
                                {heroSlides.map((slide, i) => (
                                    <SwiperSlide key={i}>
                                        <div className="relative w-full h-full">
                                            {/* Background Image */}
                                            <div
                                                className="absolute inset-0 bg-cover bg-center"
                                                style={{ backgroundImage: `url(${slide.image})` }}
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} opacity-80`} />
                                            </div>

                                            {/* Content */}
                                            <div className="relative h-full flex items-center p-8 md:p-16 text-white z-10">
                                                <div className="max-w-2xl">
                                                    {/* Badge */}
                                                    <motion.div
                                                        initial={{ scale: 0, rotate: -180 }}
                                                        whileInView={{ scale: 1, rotate: 0 }}
                                                        transition={{ duration: 0.6, type: "spring" }}
                                                        className="inline-block"
                                                    >
                                                        <span className="bg-yellow-400 text-red-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg inline-flex items-center gap-2">
                                                            <Star size={14} className="fill-current" />
                                                            {slide.badge}
                                                        </span>
                                                    </motion.div>

                                                    {/* Title */}
                                                    <motion.h1
                                                        initial={{ opacity: 0, x: -50 }}
                                                        whileInView={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.2 }}
                                                        className="text-4xl md:text-6xl font-black mt-4 leading-tight drop-shadow-2xl"
                                                    >
                                                        {slide.title}
                                                    </motion.h1>

                                                    {/* Subtitle */}
                                                    <motion.h2
                                                        initial={{ opacity: 0, x: -50 }}
                                                        whileInView={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.3 }}
                                                        className="text-xl md:text-3xl font-bold mt-2 text-yellow-200 drop-shadow-lg"
                                                    >
                                                        {slide.subtitle}
                                                    </motion.h2>

                                                    {/* Description */}
                                                    <motion.p
                                                        initial={{ opacity: 0 }}
                                                        whileInView={{ opacity: 1 }}
                                                        transition={{ delay: 0.4 }}
                                                        className="text-lg md:text-xl mt-4 text-white/90 font-semibold drop-shadow"
                                                    >
                                                        {slide.description}
                                                    </motion.p>

                                                    {/* CTA Button */}
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        whileInView={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.5 }}
                                                        className="mt-8"
                                                    >
                                                        <Link
                                                            to={slide.link}
                                                            className="inline-flex items-center gap-3 bg-white text-red-600 px-8 py-4 rounded-full font-black text-lg uppercase hover:bg-yellow-400 hover:text-red-700 transition-all shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95"
                                                        >
                                                            <Zap className="fill-current" size={24} />
                                                            {slide.buttonText}
                                                            <ChevronRight size={24} />
                                                        </Link>
                                                    </motion.div>
                                                </div>
                                            </div>

                                            {/* Decorative Elements */}
                                            <div className="absolute top-10 right-10 text-white/20 pointer-events-none hidden md:block">
                                                <Sparkles size={120} className="animate-pulse" />
                                            </div>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>

                        {/* Promo Banners Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 hidden">
                            {/* Hidden logic required to ensure structure stays intact if referenced elsewhere, but effectively removed from here */}
                        </div>
                    </motion.div>
                </div>

                {/* Promo Banners Grid - Moved below Hero Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {[
                        {
                            icon: <Gift size={32} />,
                            title: 'Quà Tặng Tết',
                            sub: 'Trị giá lên đến 5 triệu',
                            gradient: 'from-red-500 to-pink-600',
                            link: '/products'
                        },
                        {
                            icon: <Award size={32} />,
                            title: 'Trả Góp 0%',
                            sub: 'Duyệt nhanh 5 phút',
                            gradient: 'from-blue-500 to-cyan-600',
                            link: '/products'
                        },
                        {
                            icon: <Truck size={32} />,
                            title: 'Freeship Toàn Quốc',
                            sub: 'Đơn từ 500.000đ',
                            gradient: 'from-emerald-500 to-green-600',
                            link: '/products'
                        }
                    ].map((banner, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ scale: 1.05, y: -5 }}
                        >
                            <Link
                                to={banner.link}
                                className={`block bg-gradient-to-br ${banner.gradient} rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all group relative overflow-hidden`}
                            >
                                <motion.div
                                    className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity"
                                    animate={{ rotate: [0, 10, 0] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                >
                                    {banner.icon}
                                </motion.div>
                                <div className="relative z-10">
                                    <div className="mb-3">{banner.icon}</div>
                                    <h4 className="text-xl font-black uppercase leading-tight">
                                        {banner.title}
                                    </h4>
                                    <p className="text-sm font-semibold text-white/90 mt-1">
                                        {banner.sub}
                                    </p>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Flash Sale Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mt-8"
                >
                    <FlashSaleBanner variant="hero" />
                </motion.div>
            </div>

            {/* Hot Deals Section */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-[1400px] mx-auto px-4 mt-12"
            >
                <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-600 rounded-t-2xl py-4 px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-4">
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 10, 0]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="bg-yellow-400 text-red-700 rounded-full p-2"
                        >
                            <Zap className="fill-current" size={28} />
                        </motion.div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                DEALS TẾT - FLASH SALE
                                <span className="bg-yellow-400 text-red-700 px-3 py-1 rounded-full text-xs">HOT</span>
                            </h2>
                            <p className="text-white/80 text-sm font-semibold">Chỉ trong ngày hôm nay!</p>
                        </div>
                    </div>
                    <Link
                        to="/products"
                        className="hidden md:flex items-center gap-2 bg-white text-red-600 px-6 py-3 rounded-full font-black text-sm hover:bg-yellow-400 hover:text-red-700 transition-all shadow-lg hover:scale-105"
                    >
                        Xem tất cả
                        <ChevronRight size={16} />
                    </Link>
                </div>
                <div className="bg-white rounded-b-2xl border-2 border-red-200 p-6 shadow-xl">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {products?.slice(0, 5).map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Product Categories Sections */}
            {[
                { title: 'LAPTOP - MÁY TÍNH XÁCH TAY', filter: 'laptop', icon: <Laptop size={24} />, categoryId: categoryIds.laptop },
                { title: 'PC GAMING - CHIẾN MỌI GAME', filter: 'gaming', icon: <Gamepad size={24} />, categoryId: categoryIds.gaming },
                { title: 'LINH KIỆN MÁY TÍNH', filter: 'linh kiện', icon: <Cpu size={24} />, categoryId: categoryIds.components },
                { title: 'PHÍM, CHUỘT - GAMING GEAR', filter: 'gear', icon: <MousePointer2 size={24} />, categoryId: categoryIds.gear },
                { title: 'MÀN HÌNH MÁY TÍNH', filter: 'màn hình', icon: <Monitor size={24} />, categoryId: categoryIds.screens }
            ].filter(section => {
                // For each section, check if there are products
                if (section.categoryId) {
                    // If we have a category ID, check products in that category
                    return products?.some(p => p.categoryId === section.categoryId) ?? false;
                } else {
                    // For sections without specific category (should not happen with our current setup)
                    // Fallback to filter keywords to ensure we don't break anything
                    return products?.some(p =>
                        p.name.toLowerCase().includes(section.filter)
                    ) ?? false;
                }
            }).map((section, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="max-w-[1400px] mx-auto px-4 mt-12"
                >
                    <div className="bg-white rounded-t-2xl border-2 border-b-4 border-[#D70018] py-3 px-6 flex items-center justify-between shadow-md">
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                            <span className="text-[#D70018]">{section.icon}</span>
                            {section.title}
                        </h2>
                        <Link
                            to={section.categoryId ? `/products?category=${section.categoryId}` : "/products"}
                            className="text-sm font-bold text-[#D70018] hover:underline flex items-center gap-1 uppercase tracking-wider"
                        >
                            Tất cả
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                    <div className="bg-white rounded-b-2xl border-2 border-t-0 border-gray-200 p-6 shadow-lg">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {products
                                ?.filter(p => {
                                    // Only show products from active categories
                                    // Since we don't have isActive in product directly, we'll rely on category ID filtering
                                    // and the fact that we only fetch active categories in useEffect

                                    if (section.categoryId) {
                                        // Filter by category ID for sections that have it
                                        return p.categoryId === section.categoryId;
                                    } else {
                                        // For fallback sections, filter by name but ensure it's not from inactive categories
                                        // This is a limitation since we don't have category.isActive in product data
                                        return p.name.toLowerCase().includes(section.filter);
                                    }
                                })
                                .slice(0, 5)
                                .map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                        </div>
                    </div>
                </motion.div>
            ))}

            {/* Why Choose Us - Tết Edition */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-[1400px] mx-auto px-4 mt-16"
            >
                <div className="bg-gradient-to-br from-white via-red-50 to-amber-50 rounded-3xl border-4 border-red-200 p-8 md:p-12 shadow-2xl">
                    <h2 className="text-3xl md:text-4xl font-black text-center text-gray-800 mb-8 uppercase">
                        🏮 Tại Sao Chọn Quang Hưởng Computer? 🏮
                    </h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { icon: <ShieldCheck size={40} />, title: 'BẢO HÀNH 36 THÁNG', desc: 'Chính hãng toàn quốc' },
                            { icon: <Award size={40} />, title: 'GIÁ TỐT NHẤT', desc: 'Cam kết hoàn tiền 200%' },
                            { icon: <Truck size={40} />, title: 'GIAO HÀNG NHANH', desc: 'Freeship toàn quốc' },
                            { icon: <Wrench size={40} />, title: 'HỖ TRỢ 24/7', desc: 'Tư vấn miễn phí' }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.05, y: -10 }}
                                className="text-center p-6 bg-white rounded-2xl shadow-lg border-2 border-red-100"
                            >
                                <div className="text-[#D70018] flex justify-center mb-4">
                                    {item.icon}
                                </div>
                                <h4 className="font-black text-gray-800 text-sm uppercase mb-2">
                                    {item.title}
                                </h4>
                                <p className="text-xs text-gray-600 font-semibold">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>
>>>>>>> bf48e5ee90719c89aab02df3203b7dbb9b1bb077
        </div >
    );
};
