
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { Link } from 'react-router-dom';
import {
    Monitor, ChevronRight, Gamepad, Server, Cpu,
    Wifi, Wrench, Zap, Laptop, ShieldCheck,
    Truck, Award, MousePointer2,
    Speaker, Camera, Headset
} from 'lucide-react';
import { PromotionSection } from '../components/PromotionSection';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { motion } from 'framer-motion';
import { FireworksEffect } from '../components/FireworksEffect';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export const HomePage = () => {
    const { data: products, isLoading, error } = useProducts();

    const categories = [
        { icon: <Laptop size={16} />, name: 'Laptop - Máy Tính Xách Tay', link: '/laptop' },
        { icon: <Gamepad size={16} />, name: 'Máy Tính Chơi Game', link: '/pc-gaming' },
        { icon: <Server size={16} />, name: 'Máy Tính Đồ Họa', link: '/workstation' },
        { icon: <Monitor size={16} />, name: 'Màn Hình Máy Tính', link: '/screens' },
        { icon: <Cpu size={16} />, name: 'Linh Kiện Máy Tính', link: '/components' },
        { icon: <MousePointer2 size={16} />, name: 'Phím, Chuột - Gaming Gear', link: '/category/gear' },
        { icon: <Wifi size={16} />, name: 'Thiết Bị Mạng', link: '/category/network' },
        { icon: <Camera size={16} />, name: 'Camera', link: '/category/camera' },
        { icon: <Speaker size={16} />, name: 'Loa, Mic, Webcam, Stream', link: '/category/audio' },
        { icon: <Headset size={16} />, name: 'Phụ Kiện Máy Tính - Laptop', link: '/category/accessories' },
    ];

    const sideBanners = [
        { title: 'Build PC Cực Chất', sub: 'Quà tặng tới 5 triệu', color: 'bg-amber-500', link: '/pc-gaming' },
        { title: 'Thu Cũ Đổi Mới', sub: 'Trợ giá lên đời 1 triệu', color: 'bg-blue-500', link: '/warranty' },
        { title: 'Camera Giám Sát', sub: 'Chỉ từ 390.000đ', color: 'bg-emerald-500', link: '/category/camera' },
    ];

    if (isLoading) return (
        <div className="flex justify-center items-center py-40 min-h-[60vh] bg-white">
            <div className="w-12 h-12 border-4 border-red-100 border-t-[#D70018] rounded-full animate-spin" />
        </div>
    );

    if (error) return (
        <div className="container mx-auto px-4 py-20 text-center bg-white rounded-3xl my-10 shadow-sm border border-red-100">
            <h2 className="text-2xl font-bold text-[#D70018]">Lỗi tải dữ liệu</h2>
            <p className="text-gray-500 mt-2">Không thể đồng bộ danh mục sản phẩm. Vui lòng thử lại.</p>
        </div>
    );

    return (
        <div className="bg-[#F4F4F4] min-h-screen pb-20 font-sans selection:bg-red-100 relative overflow-hidden">
            {/* Fireworks on Entry */}
            <FireworksEffect />

            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <motion.div
                    animate={{
                        x: [0, 50, 0],
                        y: [0, 30, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-20 -left-20 w-96 h-96 bg-[#D70018]/5 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{
                        x: [0, -40, 0],
                        y: [0, 60, 0],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 -right-20 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{
                        y: [0, -100, 0],
                        opacity: [0.1, 0.3, 0.1]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-yellow-400/5 rounded-full blur-[120px]"
                />
            </div>

            {/* 1. Hero Section (Sidebar + Banner + Special) */}
            <div className="max-w-[1400px] mx-auto px-4 pt-4 relative z-10">
                <div className="grid lg:grid-cols-4 gap-4">
                    {/* Left Categories Sidebar (Main Body) */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm h-fit"
                    >
                        <div className="space-y-0 text-gray-700">
                            {categories.map((cat, idx) => (
                                <Link
                                    key={idx}
                                    to={cat.link}
                                    className="flex items-center px-4 py-2.5 hover:bg-red-50 group border-b border-gray-50 last:border-0 transition-colors"
                                >
                                    <span className="text-gray-400 group-hover:text-[#D70018] mr-3">{cat.icon}</span>
                                    <span className="text-[13px] font-medium group-hover:text-[#D70018] transition-colors">{cat.name}</span>
                                    <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-[#D70018] transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </motion.div>

                    {/* Main Banner + Side Promo */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="lg:col-span-3 grid md:grid-cols-3 gap-4"
                    >
                        <div className="md:col-span-2 rounded-lg overflow-hidden shadow-sm aspect-[16/9] md:aspect-auto h-[450px]">
                            <Swiper
                                spaceBetween={0}
                                centeredSlides={true}
                                autoplay={{ delay: 5000, disableOnInteraction: false }}
                                pagination={{ clickable: true }}
                                navigation={true}
                                modules={[Autoplay, Pagination, Navigation]}
                                className="h-full w-full"
                            >
                                <SwiperSlide>
                                    <div className="w-full h-full bg-[#D70018] flex items-center justify-center text-white relative">
                                        <div className="p-12 z-10 w-full">
                                            <motion.span
                                                initial={{ opacity: 0, y: 10 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                className="bg-white/20 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                                            >
                                                Khuyến mãi Tết
                                            </motion.span>
                                            <motion.h2
                                                initial={{ opacity: 0, x: -20 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 }}
                                                className="text-5xl font-black mt-4 leading-tight"
                                            >
                                                BUILD PC GAMING<br />GIẢM ĐẾN 20%
                                            </motion.h2>
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                whileInView={{ opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                                className="text-lg opacity-80 mt-2 max-w-sm"
                                            >
                                                Tặng kèm gói vệ sinh máy trọn đời.
                                            </motion.p>
                                            <Link to="/pc-gaming" className="mt-8 inline-block bg-white text-[#D70018] px-8 py-3 rounded-lg font-black text-sm uppercase hover:bg-gray-100 transition-all shadow-xl">Xem ngay</Link>
                                        </div>
                                        <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
                                            <Cpu size={300} />
                                        </div>
                                    </div>
                                </SwiperSlide>
                                <SwiperSlide>
                                    <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white relative">
                                        <div className="p-12 z-10 w-full">
                                            <motion.span
                                                initial={{ opacity: 0, y: 10 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                className="bg-white/20 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                                            >
                                                Siêu phẩm đồ họa
                                            </motion.span>
                                            <motion.h2
                                                initial={{ opacity: 0, x: -20 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 }}
                                                className="text-5xl font-black mt-4 leading-tight"
                                            >
                                                WORKSTATION<br />CHUYÊN NGHIỆP
                                            </motion.h2>
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                whileInView={{ opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                                className="text-lg opacity-80 mt-2 max-w-sm"
                                            >
                                                Tối ưu cho thiết kế 3D và Render.
                                            </motion.p>
                                            <Link to="/workstation" className="mt-8 inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-black text-sm uppercase hover:bg-gray-100 transition-all shadow-xl">Cấu hình ngay</Link>
                                        </div>
                                        <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
                                            <Server size={300} />
                                        </div>
                                    </div>
                                </SwiperSlide>
                            </Swiper>
                        </div>

                        {/* Right promo banners */}
                        <div className="flex flex-col gap-4">
                            {sideBanners.map((banner, i) => (
                                <Link
                                    key={i}
                                    to={banner.link}
                                    className={`flex-1 ${banner.color} rounded-lg p-6 text-white flex flex-col justify-center gap-1 group cursor-pointer hover:shadow-lg transition-all relative overflow-hidden`}
                                >
                                    <h4 className="text-lg font-black leading-tight group-hover:scale-105 transition-transform origin-left relative z-10">{banner.title}</h4>
                                    <p className="text-xs opacity-90 font-bold relative z-10">{banner.sub}</p>
                                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform">
                                        <Zap size={80} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* 2. Hot Deals Section (Flash Sale style) */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="max-w-[1400px] mx-auto px-4 mt-8 relative z-10"
            >
                <div className="bg-[#D70018] rounded-t-xl py-3 px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        >
                            <Zap className="text-yellow-400 fill-yellow-400" size={24} />
                        </motion.div>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">TOP PC GAMING BÁN CHẠY</h2>
                    </div>
                    <Link to="/pc-gaming" className="text-white text-xs font-bold hover:underline flex items-center gap-1 uppercase tracking-widest">
                        Xem tất cả <ChevronRight size={14} />
                    </Link>
                </div>
                <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {products?.slice(0, 5).map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 3. Category Section: PC Gaming */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="max-w-[1400px] mx-auto px-4 mt-8 relative z-10"
            >
                <div className="bg-white rounded-t-xl border border-gray-200 border-b-2 border-b-[#D70018] py-2.5 px-6 flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-800 uppercase italic tracking-tighter">MÁY TÍNH CHƠI GAME - PC GAMING</h2>
                    <div className="hidden md:flex gap-6">
                        <Link to="/pc-gaming" className="text-xs font-bold text-[#D70018] hover:underline flex items-center gap-1 uppercase tracking-widest">
                            Xem tất cả <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>
                <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {products?.filter(p => p.name.toLowerCase().includes('pc')).slice(0, 5).map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 4. Category Section: Laptop */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="max-w-[1400px] mx-auto px-4 mt-8 relative z-10"
            >
                <div className="bg-white rounded-t-xl border border-gray-200 border-b-2 border-b-[#facc15] py-2.5 px-6 flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-800 uppercase italic tracking-tighter">LAPTOP - MÁY TÍNH XÁCH TAY</h2>
                    <div className="hidden md:flex gap-6">
                        <Link to="/laptop" className="text-xs font-bold text-[#facc15] hover:underline flex items-center gap-1 uppercase tracking-widest">
                            Xem tất cả <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>
                <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {products?.filter(p => p.name.toLowerCase().includes('laptop')).slice(0, 5).map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 5. Category Section: Components & Screens */}
            <div className="max-w-[1400px] mx-auto px-4 mt-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="bg-white rounded-t-xl border border-gray-200 border-b-2 border-b-blue-600 py-2.5 px-6 flex items-center justify-between">
                            <h2 className="text-lg font-black text-gray-800 uppercase italic tracking-tighter">LINH KIỆN MÁY TÍNH</h2>
                            <Link to="/components" className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-widest">Tất cả</Link>
                        </div>
                        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-4 grid grid-cols-2 gap-4">
                            {products?.filter(p => !p.name.toLowerCase().includes('laptop') && !p.name.toLowerCase().includes('pc')).slice(0, 4).map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="bg-white rounded-t-xl border border-gray-200 border-b-2 border-b-emerald-600 py-2.5 px-6 flex items-center justify-between">
                            <h2 className="text-lg font-black text-gray-800 uppercase italic tracking-tighter">MÀN HÌNH MÁY TÍNH</h2>
                            <Link to="/screens" className="text-xs font-bold text-emerald-600 hover:underline uppercase tracking-widest">Tất cả</Link>
                        </div>
                        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-4 grid grid-cols-2 gap-4">
                            {products?.filter(p => p.name.toLowerCase().includes('màn hình')).slice(0, 4).map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* 6. Trust Banner */}
            <div className="max-w-[1400px] mx-auto px-4 mt-12 mb-12 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: <ShieldCheck className="text-[#D70018]" />, label: 'Chế độ bảo hành', sub: 'Tận tâm, tin cậy' },
                        { icon: <Truck className="text-[#D70018]" />, label: 'Vận chuyển', sub: 'Bọc hàng cực kỹ' },
                        { icon: <Wrench className="text-[#D70018]" />, label: 'Xây dựng PC', sub: 'Chuyên nghiệp' },
                        { icon: <Award className="text-[#D70018]" />, label: 'Chính hãng 100%', sub: 'Nguồn gốc rõ ràng' },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-xl hover:shadow-red-500/5 transition-all group"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#D70018] group-hover:text-white transition-all transform group-hover:rotate-6">
                                {item.icon}
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-gray-800 uppercase leading-none tracking-tighter">{item.label}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1.5">{item.sub}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* 7. Promotions & News Section */}
            <div className="relative z-10">
                <PromotionSection />
            </div>
        </div>
    );
};
