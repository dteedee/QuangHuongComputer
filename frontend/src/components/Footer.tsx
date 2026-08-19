import { Phone, Mail, MapPin, Clock, Facebook, Youtube, Instagram, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { systemConfigApi, getConfigValue, type ConfigurationEntry } from '../api/systemConfig';
import { contentApi, type Menu } from '../api/content';
import { FooterNewsletter } from './footer/footer-newsletter';

const FL = ({ to, label }: { to: string; label: string }) => (
    <li>
        <Link to={to} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm py-1 cursor-pointer">
            <ChevronRight size={13} className="text-gray-600 flex-shrink-0" /> {label}
        </Link>
    </li>
);

const MenuCol = ({ title, menu, fallback }: { title: string; menu: Menu | null; fallback: React.ReactNode }) => (
    <div>
        <h4 className="text-sm font-bold text-white uppercase mb-4 pb-2 border-b border-gray-800">{menu?.name || title}</h4>
        <ul className="space-y-0.5">
            {menu?.items?.map(item => (
                <FL key={item.id} to={item.url || '/'} label={item.label} />
            )) || fallback}
        </ul>
    </div>
);

/**
 * Footer 4 khối theo hacom.vn (giữ brand Quang Hưởng):
 * 1. Newsletter bar (footer-newsletter.tsx)
 * 2. Khối showroom Quang Hưởng (địa chỉ/tel/email/giờ mở cửa)
 * 3. 3 cột link (Về Quang Hưởng / Sản phẩm / Chính sách & hỗ trợ)
 * 4. Bottom pháp lý: tên công ty đầy đủ, MST, địa chỉ, người đại diện
 * Thông tin công ty lấy từ SystemConfig public config (COMPANY_*), fallback dữ liệu thật.
 */
export const Footer = () => {
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

    const c = (key: string, fb: string) => getConfigValue(configs, key, fb, (v) => v);
    const brand1 = c('COMPANY_BRAND_TEXT_1', 'QUANG HUONG');
    const brand2 = c('COMPANY_BRAND_TEXT_2', 'COMPUTER');
    const legalName = c('COMPANY_LEGAL_NAME', 'Công ty TNHH Máy Tính Quang Hưởng');
    const taxCode = c('COMPANY_TAX_CODE', '0200807633');
    const representative = c('COMPANY_REPRESENTATIVE', 'Dương Thị Hạnh');
    const address = c('COMPANY_ADDRESS', 'Số 179 khu phố 3/2, Thị Trấn Vĩnh Bảo, Huyện Vĩnh Bảo, TP Hải Phòng');
    const phone = c('COMPANY_PHONE', '031 3823769');
    const phone2 = c('COMPANY_PHONE_2', '0904.235.090');
    const email = c('COMPANY_EMAIL', 'quanghuongvbhp@gmail.com');
    const workingHours = c('COMPANY_WORKING_HOURS', '7:00 - 17h15 (Từ thứ 2 đến thứ 7)');

    const socials = [
        { url: c('FACEBOOK_URL', '#'), Icon: Facebook, hover: 'hover:bg-blue-600' },
        { url: c('YOUTUBE_URL', '#'), Icon: Youtube, hover: 'hover:bg-red-600' },
        { url: c('INSTAGRAM_URL', '#'), Icon: Instagram, hover: 'hover:bg-pink-600' },
    ];

    return (
        <footer className="bg-gray-900 text-gray-300 font-sans mt-12">
            <FooterNewsletter brand1={brand1} brand2={brand2} />

            <div className="max-w-[1400px] mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Khối showroom Quang Hưởng */}
                <div className="space-y-4">
                    <Link to="/" className="inline-flex items-center gap-2.5" aria-label={`${brand1} ${brand2}`}>
                        <img src="/brand/logo-square.svg" alt="" aria-hidden="true" className="w-10 h-10 rounded-lg" />
                        <span className="flex flex-col">
                            <span className="text-xl font-black text-white uppercase tracking-tight leading-none">{brand1}</span>
                            <span className="text-[9px] font-bold text-gray-400 tracking-[0.15em] uppercase mt-0.5">{brand2}</span>
                        </span>
                    </Link>
                    <div className="space-y-2 text-sm">
                        <div className="flex gap-2 items-start"><MapPin size={15} className="text-accent flex-shrink-0 mt-0.5" /><span>{address}</span></div>
                        <div className="flex gap-2"><Phone size={15} className="text-accent flex-shrink-0" /><span className="font-semibold text-white">{phone2} - {phone}</span></div>
                        <div className="flex gap-2"><Mail size={15} className="text-accent flex-shrink-0" /><span>{email}</span></div>
                        <div className="flex gap-2"><Clock size={15} className="text-accent flex-shrink-0" /><span>{workingHours}</span></div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        {socials.map(({ url, Icon, hover }) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={`w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 ${hover} hover:text-white transition-all cursor-pointer`}>
                                <Icon size={16} />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Về Quang Hưởng */}
                <div>
                    <h4 className="text-sm font-bold text-white uppercase mb-4 pb-2 border-b border-gray-800">Về Quang Hưởng</h4>
                    <ul className="space-y-0.5">
                        <FL to="/about" label="Gioi thieu chung" />
                        <FL to="/policy/news" label="Tin tuc cong nghe" />
                        <FL to="/policy/promotions" label="Tin khuyen mai" />
                        <FL to="/recruitment" label="Tuyen dung" />
                        <FL to="/contact" label="Lien he" />
                    </ul>
                </div>

                {/* Sản phẩm kinh doanh */}
                <MenuCol title="San pham kinh doanh" menu={categoryMenu} fallback={
                    <><FL to="/products" label="Tat ca san pham" /><FL to="/repairs" label="Dich vu sua chua" /><FL to="/warranty" label="Bao hanh" /></>
                } />

                {/* Chính sách & hỗ trợ */}
                <div>
                    <MenuCol title="Chinh sach & ho tro" menu={supportMenu} fallback={
                        <><FL to="/policy/warranty" label="Chinh sach bao hanh" /><FL to="/policy/return" label="Chinh sach doi tra" /><FL to="/policy/shipping" label="Chinh sach van chuyen" /><FL to="/policy/payment" label="Huong dan thanh toan" /></>
                    } />
                    <div className="mt-5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Thanh toan</p>
                        <div className="flex flex-wrap gap-1.5">
                            {['VISA', 'MASTER', 'NAPAS', 'VNPAY', 'COD'].map(m => (
                                <span key={m} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-[10px] font-bold text-gray-300">{m}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar — pháp lý */}
            <div className="bg-gray-950 py-4 pb-20 lg:pb-4 border-t border-gray-800">
                <div className="max-w-[1400px] mx-auto px-4 flex flex-col gap-2 text-[11px] text-gray-400">
                    <p>
                        <span className="font-semibold text-gray-300">{legalName}</span> — MST: {taxCode} — Địa chỉ: {address} — Người đại diện: {representative}
                    </p>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <p>&copy; {new Date().getFullYear()} Bản quyền thuộc về {brand1} {brand2}.</p>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Hệ thống đang hoạt động</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};
