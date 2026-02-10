
import {
    Phone, Mail, MapPin, Facebook, Youtube,
    Instagram, Twitter, CreditCard, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
    return (
        <footer className="bg-white border-t-2 border-[#D70018] pt-16 mt-16 font-sans">
            {/* Top Newsletter / CTA */}
            <div className="max-w-[1400px] mx-auto px-4 mb-16">
                <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="space-y-2 text-center lg:text-left">
                        <h3 className="text-2xl font-black text-gray-800 uppercase italic">Đăng ký nhận tin khuyến mãi</h3>
                        <p className="text-gray-500 text-sm font-medium">Đừng bỏ lỡ những deal hot và mã giảm giá cực hời từ Quang Hưởng Computer.</p>
                    </div>
                    <div className="flex w-full lg:w-auto gap-2">
                        <input
                            type="email"
                            placeholder="Nhập email của bạn..."
                            className="px-6 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm w-full lg:w-96 focus:outline-none focus:ring-2 focus:ring-[#D70018]/20 transition-all"
                        />
                        <button className="bg-[#D70018] hover:bg-[#b50014] text-white font-black px-8 py-3.5 rounded-xl text-sm transition-all uppercase shadow-lg shadow-red-500/10 active:scale-95">
                            Gửi ngay
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Footer Links */}
            <div className="max-w-[1400px] mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                {/* Brand Column */}
                <div className="space-y-6">
                    <Link to="/" className="flex flex-col group">
                        <span className="text-2xl font-black text-[#D70018] uppercase tracking-tighter leading-none">QUANG HƯỞNG</span>
                        <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mt-1">COMPUTER</span>
                    </Link>
                    <div className="space-y-4 text-gray-600">
                        <div className="flex gap-3" data-testid="company-address">
                            <MapPin size={20} className="text-[#D70018] flex-shrink-0" />
                            <p className="text-sm">Công ty: Số 179 Thôn 3/2 Xã Vĩnh Bảo Thành phố Hải Phòng</p>
                        </div>
                        <div className="flex gap-3" data-testid="company-phone">
                            <Phone size={20} className="text-[#D70018] flex-shrink-0" />
                            <p className="text-sm font-black">02253.xxx.xxx - 0904.235.090</p>
                        </div>
                        <div className="flex gap-3" data-testid="company-email">
                            <Mail size={20} className="text-[#D70018] flex-shrink-0" />
                            <p className="text-sm">quanghuongvbhp@gmail.com</p>
                        </div>
                        <div className="flex gap-3" data-testid="company-tax">
                            <div className="text-sm">
                                <span className="font-bold">MST:</span> 0200807633
                            </div>
                        </div>
                    </div>
                </div>

                {/* Categories Column */}
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-gray-800 uppercase border-b border-gray-100 pb-2">Danh mục sản phẩm</h4>
                    <ul className="space-y-3 text-gray-500 text-sm font-medium">
                        <li><Link to="/laptop" className="hover:text-[#D70018] transition-colors flex items-center gap-1"><ChevronRight size={14} /> Laptop - Máy tính xách tay</Link></li>
                        <li><Link to="/pc-gaming" className="hover:text-[#D70018] transition-colors flex items-center gap-1"><ChevronRight size={14} /> Máy tính chơi Game</Link></li>
                        <li><Link to="/workstation" className="hover:text-[#D70018] transition-colors flex items-center gap-1"><ChevronRight size={14} /> Máy tính đồ họa</Link></li>
                        <li><Link to="/components" className="hover:text-[#D70018] transition-colors flex items-center gap-1"><ChevronRight size={14} /> Linh kiện máy tính</Link></li>
                        <li><Link to="/screens" className="hover:text-[#D70018] transition-colors flex items-center gap-1"><ChevronRight size={14} /> Màn hình máy tính</Link></li>
                    </ul>
                </div>

                {/* Policy Column */}
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-gray-800 uppercase border-b border-gray-100 pb-2">Chính sách & Hỗ trợ</h4>
                    <ul className="space-y-3 text-gray-500 text-sm font-medium">
                        <li><Link to="/policy/warranty" className="hover:text-[#D70018] transition-colors flex items-center gap-1" data-testid="policy-warranty-link"><ChevronRight size={14} /> Chính sách bảo hành</Link></li>
                        <li><Link to="/policy/return" className="hover:text-[#D70018] transition-colors flex items-center gap-1" data-testid="policy-return-link"><ChevronRight size={14} /> Chính sách đổi trả</Link></li>
                        <li><Link to="/terms" className="hover:text-[#D70018] transition-colors flex items-center gap-1" data-testid="terms-link"><ChevronRight size={14} /> Điều khoản sử dụng</Link></li>
                        <li><Link to="/privacy" className="hover:text-[#D70018] transition-colors flex items-center gap-1" data-testid="privacy-link"><ChevronRight size={14} /> Chính sách bảo mật</Link></li>
                        <li><Link to="/contact" className="hover:text-[#D70018] transition-colors flex items-center gap-1" data-testid="contact-link"><ChevronRight size={14} /> Liên hệ</Link></li>
                    </ul>
                </div>

                {/* Social & Payments */}
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-gray-800 uppercase border-b border-gray-100 pb-2">Kết nối với chúng tôi</h4>
                    <div className="flex gap-3">
                        <Link to="#" className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white hover:scale-110 transition-transform"><Facebook size={20} /></Link>
                        <Link to="#" className="w-10 h-10 rounded-full bg-[#D70018] flex items-center justify-center text-white hover:scale-110 transition-transform"><Youtube size={20} /></Link>
                        <Link to="#" className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white hover:scale-110 transition-transform"><Twitter size={20} /></Link>
                        <Link to="#" className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white hover:scale-110 transition-transform"><Instagram size={20} /></Link>
                    </div>
                    <div className="pt-4">
                        <p className="text-xs font-black text-gray-400 uppercase mb-3">Chấp nhận thanh toán</p>
                        <div className="flex flex-wrap gap-2 text-gray-400">
                            <div className="p-2 border border-gray-200 rounded-lg hover:border-[#D70018] transition-colors"><CreditCard size={20} /></div>
                            <div className="p-2 border border-gray-200 rounded-lg hover:border-[#D70018] transition-colors font-bold text-[10px]">VISA</div>
                            <div className="p-2 border border-gray-200 rounded-lg hover:border-[#D70018] transition-colors font-bold text-[10px]">CASH</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-gray-100 py-6 border-t border-gray-200">
                <div className="max-w-[1400px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                    <p>© {new Date().getFullYear()} Bản quyền thuộc về Công ty TNHH Máy tính Quang Hưởng.</p>
                    <div className="flex gap-6">
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Hệ thống đang hoạt động</span>
                        <span>Thiết kế bởi Đỗ Tùng Dương</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
