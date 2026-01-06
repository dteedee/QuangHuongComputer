import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { Link } from 'react-router-dom';
import { Camera, Printer, Speaker, Monitor, ChevronRight, Gamepad, Server, Cpu, Wifi, Wrench, Zap } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { motion } from 'framer-motion';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export const HomePage = () => {
    const { data: products, isLoading, error } = useProducts();

    const categories = [
        { icon: <Monitor size={16} />, name: 'Laptop - Máy tính xách tay', link: '/laptop' },
        { icon: <Gamepad size={16} />, name: 'PC Gaming - Máy tính chơi game', link: '/pc-gaming' },
        { icon: <Server size={16} />, name: 'PC Workstation - Máy tính đồ họa', link: '/workstation' },
        { icon: <Monitor size={16} />, name: 'PC Văn Phòng - Máy tính đồng bộ', link: '/office' },
        { icon: <Cpu size={16} />, name: 'Linh kiện máy tính', link: '/components' },
        { icon: <Monitor size={16} />, name: 'Màn hình máy tính', link: '/screens' },
        { icon: <Gamepad size={16} />, name: 'Gaming Gear', link: '/category/gear' },
        { icon: <Wifi size={16} />, name: 'Thiết bị mạng', link: '/category/network' },
        { icon: <Camera size={16} />, name: 'Camera - Thiết bị an ninh', link: '/category/camera' },
        { icon: <Printer size={16} />, name: 'Thiết bị văn phòng - Máy in', link: '/category/printer' },
        { icon: <Speaker size={16} />, name: 'Loa - Tai nghe - Webcam', link: '/category/audio' },
    ];

    const BannerSlide = ({ color, title, sub }: { color: string, title: string, sub: string }) => (
        <div className={`w-full h-full bg-gradient-to-br ${color} flex flex-col items-center justify-center text-white relative`}>
            <motion.h1
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                className="text-4xl lg:text-5xl font-extrabold mb-2 text-center uppercase drop-shadow-lg p-2"
            >
                {title}
            </motion.h1>
            <motion.p
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}
                className="text-xl lg:text-2xl font-bold bg-white text-[#D70018] px-6 py-2 rounded-full shadow-lg transform -skew-x-12"
            >
                {sub}
            </motion.p>
        </div>
    );

    if (isLoading) return (
        <div className="flex justify-center items-center py-20 min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D70018]"></div>
        </div>
    );

    if (error) return <div className="text-red-500 text-center p-10">Error loading products.</div>;

    return (
        <div className="bg-[#f0f0f0] min-h-screen pb-10 font-sans">
            {/* 1. Hero Section (Sidebar + Banner) */}
            <div className="bg-white pb-6 pt-2">
                <div className="container mx-auto px-4">
                    <div className="flex gap-4">
                        {/* Left Sidebar - Desktop Only */}
                        <div className="hidden lg:block w-[230px] flex-shrink-0">
                            <div className="bg-white border rounded-md shadow-sm border-gray-200 h-[480px] flex flex-col">
                                {categories.map((cat, idx) => (
                                    <Link key={idx} to={cat.link} className="flex-1 flex items-center px-4 hover:bg-gray-50 cursor-pointer group border-b border-gray-50 last:border-0 transition-colors">
                                        <div className="text-gray-500 group-hover:text-[#D70018] mr-3">{cat.icon}</div>
                                        <span className="text-[12px] font-semibold text-gray-700 group-hover:text-[#D70018] line-clamp-1">{cat.name}</span>
                                        <ChevronRight size={12} className="ml-auto text-gray-300 group-hover:text-[#D70018]" />
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Main Banner Area */}
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 h-[480px]">
                            {/* Main Carousel with Swiper */}
                            <div className="lg:col-span-2 bg-gray-200 rounded-md overflow-hidden relative group shadow-sm h-full">
                                <Swiper
                                    spaceBetween={0}
                                    centeredSlides={true}
                                    autoplay={{ delay: 3500, disableOnInteraction: false }}
                                    pagination={{ clickable: true }}
                                    navigation={true}
                                    modules={[Autoplay, Pagination, Navigation]}
                                    className="h-full w-full"
                                >
                                    <SwiperSlide><BannerSlide color="from-[#D70018] to-orange-600" title="Chào Xuân 2026" sub="LÌ XÌ CỰC LỚN" /></SwiperSlide>
                                    <SwiperSlide><BannerSlide color="from-blue-600 to-cyan-500" title="Laptop Gaming" sub="GIẢM TỚI 5 TRIỆU" /></SwiperSlide>
                                    <SwiperSlide><BannerSlide color="from-purple-600 to-pink-500" title="Gear Chính Hãng" sub="MUA 1 TẶNG 1" /></SwiperSlide>
                                </Swiper>
                            </div>

                            {/* Right Stacked Banners */}
                            <div className="hidden lg:grid grid-rows-3 gap-3 h-full">
                                <motion.div whileHover={{ scale: 1.02 }} className="bg-blue-700 rounded-md flex flex-col items-center justify-center text-white shadow-sm p-4 text-center cursor-pointer h-full relative overflow-hidden">
                                    <div className="absolute inset-0 bg-blue-600 opacity-50"></div>
                                    <span className="text-xl font-black uppercase italic relative z-10">BUILD PC</span>
                                    <span className="text-sm relative z-10">Nhận quà cực chất</span>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.02 }} className="bg-purple-700 rounded-md flex flex-col items-center justify-center text-white shadow-sm p-4 text-center cursor-pointer h-full relative overflow-hidden">
                                    <div className="absolute inset-0 bg-purple-600 opacity-50"></div>
                                    <span className="text-xl font-black uppercase italic relative z-10">GEAR SALE</span>
                                    <span className="text-sm relative z-10">Giảm tới 50%</span>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.02 }} className="bg-green-700 rounded-md flex flex-col items-center justify-center text-white shadow-sm p-4 text-center cursor-pointer h-full relative overflow-hidden">
                                    <div className="absolute inset-0 bg-green-600 opacity-50"></div>
                                    <span className="text-xl font-black uppercase italic relative z-10">MONITOR</span>
                                    <span className="text-sm relative z-10">Màn hình giá rẻ</span>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Scrolling Ticker (News) */}
            <div className="bg-[#D70018] text-white py-2 overflow-hidden">
                <div className="container mx-auto px-4 flex items-center gap-4">
                    <span className="bg-white text-[#D70018] text-xs font-bold px-2 py-0.5 rounded uppercase flex-shrink-0">Tin mới</span>
                    <div className="whitespace-nowrap overflow-hidden flex-1">
                        <motion.div
                            animate={{ x: [1000, -1000] }}
                            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                            className="text-xs font-medium"
                        >
                            Mừng khai trương cơ sở mới - Giảm giá toàn bộ sản phẩm 10%  |  Laptop Gaming MSI giảm sâu 5 triệu đồng  |  Build PC nhận ngay quà tặng trị giá 2 triệu
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* 3. Hot Products Section */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="container mx-auto px-4 mt-6"
            >
                <div className="bg-[#D70018] rounded-t-lg p-3 flex items-center justify-between shadow-md relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#D70018] to-orange-500"></div>
                    <h2 className="text-lg md:text-xl font-extrabold text-white uppercase italic flex items-center gap-2 relative z-10">
                        <Zap size={24} className="fill-yellow-400 text-yellow-400 animate-pulse" />
                        <span className="bg-white text-[#D70018] px-2 py-0.5 rounded text-sm font-black shadow-sm transform -skew-x-12">FLASH SALE</span>
                        SẢN PHẨM BÁN CHẠY
                    </h2>
                    <Link to="/products" className="text-white text-xs font-bold hover:underline bg-black/20 px-3 py-1.5 rounded-full relative z-10">Xem tất cả &gt;</Link>
                </div>
                <div className="bg-white p-4 border-2 border-[#D70018] border-t-0 rounded-b-lg shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {products?.slice(0, 5).map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 4. Category Section: PC Gaming */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="container mx-auto px-4 mt-8"
            >
                <div className="flex items-center justify-between border-b-2 border-[#D70018] mb-4 pb-2">
                    <h2 className="text-xl font-bold text-gray-900 uppercase">PC GAMING - MÁY TÍNH CHƠI GAME</h2>
                    <div className="hidden md:flex gap-4 text-sm font-medium text-gray-600">
                        <Link to="/pc-gaming" className="hover:text-[#D70018]">PC Gaming Thường</Link>
                        <Link to="/pc-gaming" className="hover:text-[#D70018]">PC Gaming Cao Cấp</Link>
                        <Link to="/pc-gaming" className="text-[#D70018] font-bold">Xem tất cả</Link>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {products?.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
                <div className="mt-8 text-center">
                    <Link to="/pc-gaming" className="bg-white border border-gray-300 text-gray-600 text-sm font-bold px-10 py-2.5 rounded hover:bg-[#D70018] hover:text-white hover:border-[#D70018] transition-all uppercase shadow-sm inline-block">
                        Xem thêm 150 sản phẩm
                    </Link>
                </div>
            </motion.div>

            {/* 5. Category Section: Laptop */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="container mx-auto px-4 mt-8"
            >
                <div className="flex items-center justify-between border-b-2 border-[#D70018] mb-4 pb-2">
                    <h2 className="text-xl font-bold text-gray-900 uppercase">LAPTOP - MÁY TÍNH XÁCH TAY</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {products?.slice(0, 5).map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </motion.div>
        </div>
    );
};
