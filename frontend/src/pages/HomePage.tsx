
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { Link } from 'react-router-dom';
import {
    Monitor, ChevronRight, Gamepad, Server, Cpu,
    Wifi, Wrench, Zap, Laptop, ShieldCheck,
    Truck, Award, MousePointer2,
    Speaker, Camera, Headset
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

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
        { title: 'Build PC Cực Chất', sub: 'Quà tặng tới 5 triệu', color: 'bg-amber-500' },
        { title: 'Thu Cũ Đổi Mới', sub: 'Trợ giá lên đời 1 triệu', color: 'bg-blue-500' },
        { title: 'Camera Giám Sát', sub: 'Chỉ từ 390.000đ', color: 'bg-emerald-500' },
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
        <div className="bg-[#F4F4F4] min-h-screen pb-20 font-sans selection:bg-red-100">
            {/* 1. Hero Section (Sidebar + Banner + Special) */}
            <div className="max-w-[1400px] mx-auto px-4 pt-4">
                <div className="grid lg:grid-cols-4 gap-4">
                    {/* Left Categories Sidebar (Main Body) */}
                    <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm h-fit">
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
                    </div>

                    {/* Main Banner + Side Promo */}
                    <div className="lg:col-span-3 grid md:grid-cols-3 gap-4">
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
                                            <span className="bg-white/20 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Khuyến mãi Tết</span>
                                            <h2 className="text-5xl font-black mt-4 leading-tight">BUILD PC GAMING<br />GIẢM ĐẾN 20%</h2>
                                            <p className="text-lg opacity-80 mt-2 max-w-sm">Tặng kèm gói vệ sinh máy trọn đời.</p>
                                            <button className="mt-8 bg-white text-[#D70018] px-8 py-3 rounded-lg font-black text-sm uppercase hover:bg-gray-100 transition-all">Xem ngay</button>
                                        </div>
                                        <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
                                            <Cpu size={300} />
                                        </div>
                                    </div>
                                </SwiperSlide>
                                <SwiperSlide>
                                    <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white relative">
                                        <div className="p-12 z-10 w-full">
                                            <span className="bg-white/20 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Siêu phẩm đồ họa</span>
                                            <h2 className="text-5xl font-black mt-4 leading-tight">WORKSTATION<br />CHUYÊN NGHIỆP</h2>
                                            <p className="text-lg opacity-80 mt-2 max-w-sm">Tối ưu cho thiết kế 3D và Render.</p>
                                            <button className="mt-8 bg-white text-blue-600 px-8 py-3 rounded-lg font-black text-sm uppercase hover:bg-gray-100 transition-all">Cấu hình ngay</button>
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
                                <div key={i} className={`flex-1 ${banner.color} rounded-lg p-6 text-white flex flex-col justify-center gap-1 group cursor-pointer hover:shadow-lg transition-all`}>
                                    <h4 className="text-lg font-black leading-tight group-hover:scale-105 transition-transform origin-left">{banner.title}</h4>
                                    <p className="text-xs opacity-90 font-bold">{banner.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Hot Deals Section (Flash Sale style) */}
            <div className="max-w-[1400px] mx-auto px-4 mt-8">
                <div className="bg-[#D70018] rounded-t-xl py-3 px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <Zap className="text-yellow-400 fill-yellow-400" size={24} />
                        <h2 className="text-xl font-black text-white uppercase italic">TOP PC GAMING BÁN CHẠY</h2>
                    </div>
                    <Link to="/pc-gaming" className="text-white text-xs font-bold hover:underline flex items-center gap-1">
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
            </div>

            {/* 3. Category Section: Laptop */}
            <div className="max-w-[1400px] mx-auto px-4 mt-8">
                <div className="bg-white rounded-t-xl border border-gray-200 border-b-2 border-b-[#D70018] py-2.5 px-6 flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-800 uppercase">LAPTOP - MÁY TÍNH XÁCH TAY</h2>
                    <div className="hidden md:flex gap-6">
                        {['Laptop Dell', 'Laptop Asus', 'Laptop MSI', 'Laptop HP'].map(cat => (
                            <Link key={cat} to="#" className="text-xs font-bold text-gray-500 hover:text-[#D70018] transition-colors">{cat}</Link>
                        ))}
                        <Link to="/laptop" className="text-xs font-bold text-[#D70018] hover:underline flex items-center gap-1">
                            Xem tất cả <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>
                <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {products?.slice(5, 10).map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Trust Banner */}
            <div className="max-w-[1400px] mx-auto px-4 mt-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: <ShieldCheck className="text-[#D70018]" />, label: 'Chế độ bảo hành', sub: 'Tận tâm, tin cậy' },
                        { icon: <Truck className="text-[#D70018]" />, label: 'Vận chuyển', sub: 'Bọc hàng cực kỹ' },
                        { icon: <Wrench className="text-[#D70018]" />, label: 'Xây dựng PC', sub: 'Chuyên nghiệp' },
                        { icon: <Award className="text-[#D70018]" />, label: 'Chính hãng 100%', sub: 'Nguồn gốc rõ ràng' },
                    ].map((item, i) => (
                        <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4 hover:shadow-md transition-all">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                            <div>
                                <h4 className="text-sm font-black text-gray-800 uppercase leading-none">{item.label}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{item.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
