
import {
    Phone, Mail, MapPin, Facebook, Youtube,
    Instagram, Twitter, CreditCard, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { systemConfigApi, getConfigValue, type ConfigurationEntry } from '../api/systemConfig';
import client from '../api/client';
import { contentApi, type Menu } from '../api/content';

export const Footer = () => {
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [configs, setConfigs] = useState<ConfigurationEntry[]>([]);
    const [categoryMenu, setCategoryMenu] = useState<Menu | null>(null);
    const [supportMenu, setSupportMenu] = useState<Menu | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [configData, footerMain, footerBottom] = await Promise.all([
                    systemConfigApi.config.getPublic(),
                    contentApi.getMenus('FooterMain'),
                    contentApi.getMenus('FooterBottom')
                ]);
                setConfigs(Array.isArray(configData) ? configData : []);
                if (Array.isArray(footerMain) && footerMain.length > 0) setCategoryMenu(footerMain[0]);
                if (Array.isArray(footerBottom) && footerBottom.length > 0) setSupportMenu(footerBottom[0]);
            } catch (error) {
                console.error('Failed to load footer data', error);
            }
        };
        fetchData();
    }, []);

    const companyBrand1 = getConfigValue(configs, 'COMPANY_BRAND_TEXT_1', 'QUANG HƯỞNG', (v) => v);
    const companyBrand2 = getConfigValue(configs, 'COMPANY_BRAND_TEXT_2', 'COMPUTER', (v) => v);
    const companyAddress = getConfigValue(configs, 'COMPANY_ADDRESS', 'Số 179 Thôn 3/2 Xã Vĩnh Bảo Thành phố Hải Phòng', (v) => v);
    const companyPhone = getConfigValue(configs, 'COMPANY_PHONE', '0904.235.090', (v) => v);
    const companyPhone2 = getConfigValue(configs, 'COMPANY_PHONE_2', '02253.xxx.xxx', (v) => v);
    const companyEmail = getConfigValue(configs, 'COMPANY_EMAIL', 'quanghuongvbhp@gmail.com', (v) => v);
    const companyTaxCode = getConfigValue(configs, 'COMPANY_TAX_CODE', '0200807633', (v) => v);
    const facebookUrl = getConfigValue(configs, 'FACEBOOK_URL', 'https://facebook.com/quanghuongcomputer', (v) => v);
    const youtubeUrl = getConfigValue(configs, 'YOUTUBE_URL', 'https://youtube.com/@quanghuongcomputer', (v) => v);
    const instagramUrl = getConfigValue(configs, 'INSTAGRAM_URL', 'https://instagram.com/quanghuongcomputer', (v) => v);

    const handleNewsletterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsletterEmail.trim()) {
            toast.error('Vui lòng nhập email');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) {
            toast.error('Email không hợp lệ');
            return;
        }

        setIsSubscribing(true);
        try {
            const response = await client.post('/communication/newsletter/subscribe', {
                email: newsletterEmail
            });

            if (response.data.success) {
                toast.success(response.data.message || 'Đăng ký nhận tin thành công!');
                setNewsletterEmail('');
            } else if (response.data.alreadySubscribed) {
                toast.error('Email này đã được đăng ký trước đó');
            }
        } catch (error: any) {
            console.error('Newsletter subscription error:', error);
            const message = error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại sau.';
            toast.error(message);
        } finally {
            setIsSubscribing(false);
        }
    };

    return (
        <footer className="bg-white border-t-2 border-accent pt-16 mt-16 font-sans">
            {/* Top Newsletter / CTA */}
            <div className="max-w-[1400px] mx-auto px-4 mb-16">
                <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="space-y-2 text-center lg:text-left">
                        <h3 className="text-2xl font-black text-gray-800 uppercase italic">Đăng ký nhận tin khuyến mãi</h3>
                        <p className="text-gray-500 text-sm font-medium">Đừng bỏ lỡ những deal hot và mã giảm giá cực hời từ {companyBrand1} {companyBrand2}.</p>
                    </div>
                    <form onSubmit={handleNewsletterSubmit} className="flex w-full lg:w-auto gap-2">
                        <input
                            type="email"
                            placeholder="Nhập email của bạn..."
                            className="px-6 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm w-full lg:w-96 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-gray-400"
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                        />
                        <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-black px-8 py-3.5 rounded-xl text-sm transition-all uppercase shadow-lg shadow-red-500/10 active:scale-95" disabled={isSubscribing}>
                            {isSubscribing ? 'Đang gửi...' : 'Gửi ngay'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Main Footer Links */}
            <div className="max-w-[1400px] mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-10">
                {/* Brand Column */}
                <div className="space-y-6 xl:col-span-2">
                    <Link to="/" className="flex flex-col group">
                        <span className="text-3xl font-black text-accent uppercase tracking-tighter leading-none">{companyBrand1}</span>
                        <span className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase mt-1">{companyBrand2}</span>
                    </Link>
                    <p className="text-gray-500 text-sm leading-relaxed pr-4">
                        Hệ thống bán lẻ máy tính, linh kiện, và các thiết bị IT tin cậy. Cam kết chất lượng dịch vụ chuyên nghiệp, sản phẩm chính hãng, bảo hành tận tâm.
                    </p>
                    <div className="space-y-3 text-gray-600">
                        <div className="flex gap-3 items-start">
                            <MapPin size={18} className="text-accent flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{companyAddress}</p>
                        </div>
                        <div className="flex gap-3">
                            <Phone size={18} className="text-accent flex-shrink-0" />
                            <p className="text-sm font-black">{companyPhone2} - {companyPhone}</p>
                        </div>
                        <div className="flex gap-3">
                            <Mail size={18} className="text-accent flex-shrink-0" />
                            <p className="text-sm">{companyEmail}</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="text-sm">
                                <span className="font-bold">MST:</span> {companyTaxCode}
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white hover:-translate-y-1 transition-all shadow-lg shadow-blue-600/30"><Facebook size={20} /></a>
                        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white hover:-translate-y-1 transition-all shadow-lg shadow-red-500/30"><Youtube size={20} /></a>
                        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white hover:-translate-y-1 transition-all shadow-lg shadow-pink-500/30"><Instagram size={20} /></a>
                    </div>
                </div>

                {/* Về chúng tôi */}
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-gray-800 uppercase border-b-2 border-red-100 w-fit pb-1">Về Quang Hưởng</h4>
                    <ul className="space-y-3 text-gray-500 text-sm font-medium">
                        <li><Link to="/about" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Giới thiệu chung</Link></li>
                        <li><Link to="/policy/news" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Tin tức công nghệ</Link></li>
                        <li><Link to="/policy/promotions" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Tin khuyến mãi</Link></li>
                        <li><Link to="/recruitment" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Tuyển dụng</Link></li>
                        <li><Link to="/contact" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Liên hệ</Link></li>
                    </ul>
                </div>

                {/* Categories Column */}
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-gray-800 uppercase border-b-2 border-red-100 w-fit pb-1">{categoryMenu?.name || 'Sản phẩm kinh doanh'}</h4>
                    <ul className="space-y-3 text-gray-500 text-sm font-medium">
                        {categoryMenu?.items?.map(item => (
                            <li key={item.id}>
                                <Link to={item.url || '/'} className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1">
                                    <ChevronRight size={14} /> {item.label}
                                </Link>
                            </li>
                        )) || (
                            <>
                                <li><Link to="/laptop" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Máy tính xách tay (Laptop)</Link></li>
                                <li><Link to="/pc-gaming" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Máy tính bộ (PC Gaming)</Link></li>
                                <li><Link to="/workstation" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Máy trạm (Workstation)</Link></li>
                                <li><Link to="/components" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Linh kiện máy tính</Link></li>
                                <li><Link to="/screens" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Màn hình máy tính</Link></li>
                                <li><Link to="/office" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Thiết bị văn phòng</Link></li>
                            </>
                        )}
                    </ul>
                </div>

                {/* Support Column */}
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-gray-800 uppercase border-b-2 border-red-100 w-fit pb-1">{supportMenu?.name || 'Chính sách'}</h4>
                    <ul className="space-y-3 text-gray-500 text-sm font-medium">
                        {supportMenu?.items?.map(item => (
                            <li key={item.id}>
                                <Link to={item.url || '/'} className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1">
                                    <ChevronRight size={14} /> {item.label}
                                </Link>
                            </li>
                        )) || (
                            <>
                                <li><Link to="/policy/warranty" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Chính sách bảo hành</Link></li>
                                <li><Link to="/policy/return" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Chính sách đổi trả</Link></li>
                                <li><Link to="/policy/shipping" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Chính sách vận chuyển</Link></li>
                                <li><Link to="/policy/payment" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Hướng dẫn thanh toán</Link></li>
                                <li><Link to="/terms" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Điều khoản dịch vụ</Link></li>
                                <li><Link to="/privacy" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Chính sách bảo mật</Link></li>
                            </>
                        )}
                    </ul>
                </div>

                {/* Info & Payments */}
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-gray-800 uppercase border-b-2 border-red-100 w-fit pb-1">Hỗ trợ khách hàng</h4>
                    <ul className="space-y-3 text-gray-500 text-sm font-medium">
                        <li><Link to="/repairs" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Gửi yêu cầu sửa chữa</Link></li>
                        <li><Link to="/warranty" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Tra cứu bảo hành</Link></li>
                        <li><Link to="/account?tab=orders" className="hover:text-accent hover:pl-2 transition-all flex items-center gap-1"><ChevronRight size={14} /> Theo dõi & quản lý đơn hàng</Link></li>
                    </ul>
                    <div className="pt-6">
                        <p className="text-xs font-black text-gray-400 uppercase mb-3">Chấp nhận thanh toán</p>
                        <div className="flex flex-wrap gap-2 text-gray-500">
                            <span className="px-3 py-1.5 border border-gray-200 rounded-lg hover:border-accent transition-colors font-bold text-[10px] text-blue-800 bg-white shadow-sm">VISA</span>
                            <span className="px-3 py-1.5 border border-gray-200 rounded-lg hover:border-accent transition-colors font-bold text-[10px] text-red-600 bg-white shadow-sm">MASTER</span>
                            <span className="px-3 py-1.5 border border-gray-200 rounded-lg hover:border-accent transition-colors font-bold text-[10px] text-green-700 bg-white shadow-sm">NAPAS</span>
                            <span className="px-3 py-1.5 border border-gray-200 rounded-lg hover:border-accent transition-colors font-bold text-[10px] text-purple-600 bg-white shadow-sm">VNPAY</span>
                            <span className="px-3 py-1.5 border border-gray-200 rounded-lg hover:border-accent transition-colors font-bold text-[10px] text-gray-700 bg-white shadow-sm">COD</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar — extra padding on mobile for bottom nav */}
            <div className="bg-gray-100 py-6 pb-20 lg:pb-6 border-t border-gray-200">
                <div className="max-w-[1400px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                    <p>© {new Date().getFullYear()} Bản quyền thuộc về {companyBrand1} {companyBrand2}.</p>
                    <div className="flex gap-6">
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Hệ thống đang hoạt động</span>
                        <span>Thiết kế bởi Đỗ Tùng Dương</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

