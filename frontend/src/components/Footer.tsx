import { Phone, Mail, MapPin, Facebook, Youtube, Instagram } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="bg-white border-t border-gray-200 mt-10">
            {/* Newsletter Section */}
            <div className="bg-[#D70018] py-4">
                <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-white">
                        <Mail size={24} />
                        <div>
                            <span className="block font-bold uppercase text-sm">Đăng ký nhận tin khuyến mãi</span>
                            <span className="text-xs opacity-90">Bạn vui lòng để lại Email để nhận thông tin khuyến mãi từ Quang Huong Computer</span>
                        </div>
                    </div>
                    <div className="flex w-full lg:w-auto gap-2">
                        <input
                            type="email"
                            placeholder="Nhập email của bạn"
                            className="px-4 py-2 rounded text-sm w-full lg:w-80 focus:outline-none"
                        />
                        <button className="bg-yellow-400 text-red-700 font-bold px-6 py-2 rounded text-sm hover:bg-yellow-300 transition uppercase">
                            Gửi ngay
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Footer Info */}
            <div className="container mx-auto px-4 py-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* About */}
                    <div>
                        <div className="flex flex-col mb-4">
                            <span className="text-2xl font-extrabold text-[#D70018] uppercase tracking-tighter">QUANG HUONG</span>
                            <span className="text-xs font-bold text-gray-600 tracking-widest uppercase">COMPUTER</span>
                        </div>
                        <div className="flex flex-col gap-3 text-sm text-gray-600">
                            <div className="flex gap-2">
                                <MapPin size={16} className="flex-shrink-0 mt-0.5 text-[#D70018]" />
                                <span>91 Nguyễn Xiển, Thanh Xuân, Hà Nội</span>
                            </div>
                            <div className="flex gap-2">
                                <Phone size={16} className="flex-shrink-0 mt-0.5 text-[#D70018]" />
                                <span>1800.6321</span>
                            </div>
                            <div className="flex gap-2">
                                <Mail size={16} className="flex-shrink-0 mt-0.5 text-[#D70018]" />
                                <span>contact@quanghuong.com</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-bold">Giờ mở cửa:</span>
                                <span>8h15 - 17h45 (Thứ 2 - CN)</span>
                            </div>
                        </div>
                    </div>

                    {/* Policy */}
                    <div>
                        <h3 className="font-bold text-gray-800 mb-4 uppercase">Chính sách chung</h3>
                        <ul className="flex flex-col gap-2 text-sm text-gray-600">
                            <li><a href="#" className="hover:text-[#D70018]">Quy định truy cập Website</a></li>
                            <li><a href="#" className="hover:text-[#D70018]">Chính sách bảo mật thông tin</a></li>
                            <li><a href="#" className="hover:text-[#D70018]">Chính sách vận chuyển</a></li>
                            <li><a href="#" className="hover:text-[#D70018]">Chính sách bảo hành</a></li>
                            <li><a href="#" className="hover:text-[#D70018]">Chính sách cho doanh nghiệp</a></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="font-bold text-gray-800 mb-4 uppercase">Thông tin chung</h3>
                        <ul className="flex flex-col gap-2 text-sm text-gray-600">
                            <li><a href="#" className="hover:text-[#D70018]">Giới thiệu công ty</a></li>
                            <li><a href="#" className="hover:text-[#D70018]">Thông tin liên hệ</a></li>
                            <li><a href="#" className="hover:text-[#D70018]">Hỏi đáp - Thắc mắc</a></li>
                            <li><a href="#" className="hover:text-[#D70018]">Tuyển dụng</a></li>
                        </ul>
                    </div>

                    {/* Social & Payment */}
                    <div>
                        <h3 className="font-bold text-gray-800 mb-4 uppercase">Kết nối với chúng tôi</h3>
                        <div className="flex gap-3 mb-6">
                            <a href="#" className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center hover:opacity-80"><Facebook size={18} /></a>
                            <a href="#" className="w-8 h-8 rounded bg-red-600 text-white flex items-center justify-center hover:opacity-80"><Youtube size={18} /></a>
                            <a href="#" className="w-8 h-8 rounded bg-pink-600 text-white flex items-center justify-center hover:opacity-80"><Instagram size={18} /></a>
                        </div>

                        <h3 className="font-bold text-gray-800 mb-4 uppercase">Chấp nhận thanh toán</h3>
                        <div className="flex flex-wrap gap-2">
                            <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600 border">VISA</div>
                            <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600 border">MasterCard</div>
                            <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600 border">VNPAY</div>
                            <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600 border">MOMO</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright */}
            <div className="bg-gray-100 py-4 text-center text-xs text-gray-500 border-t border-gray-200">
                <p>Copyright © 2026 CÔNG TY CỔ PHẦN DỊCH VỤ THƯƠNG MẠI QUANG HUONG COMPUTER.</p>
                <p className="mt-1">Địa chỉ: 91 Nguyễn Xiển, Thanh Xuân, Hà Nội - GPKD: 01085988845</p>
            </div>
        </footer>
    );
};
