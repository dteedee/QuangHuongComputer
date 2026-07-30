import { Phone, Mail, MapPin, Facebook, Youtube, Instagram, ChevronRight } from 'lucide-react';
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

    const socials = [
        { url: c('FACEBOOK_URL', '#'), Icon: Facebook, hover: 'hover:bg-blue-600' },
        { url: c('YOUTUBE_URL', '#'), Icon: Youtube, hover: 'hover:bg-red-600' },
        { url: c('INSTAGRAM_URL', '#'), Icon: Instagram, hover: 'hover:bg-pink-600' },
    ];

    return (
        <footer className="bg-gray-900 text-gray-300 font-sans mt-12">
            <FooterNewsletter brand1={brand1} brand2={brand2} />

            <div className="max-w-[1400px] mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Brand column */}
                <div className="space-y-4">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2.5"
                        aria-label={`${brand1} ${brand2}`}
                    >
                        <img
                            src="/brand/logo-square.svg"
                            alt=""
                            aria-hidden="true"
                            className="w-10 h-10 rounded-lg"
                        />
                        <span className="flex flex-col">
                            <span className="text-xl font-black text-white uppercase tracking-tight leading-none">{brand1}</span>
                            <span className="text-[9px] font-bold text-gray-400 tracking-[0.15em] uppercase mt-0.5">{brand2}</span>
                        </span>
                    </Link>
                    <p className="text-gray-400 text-sm leading-relaxed">He thong ban le may tinh, linh kien va thiet bi IT. Cam ket chat luong, san pham chinh hang, bao hanh tan tam.</p>
                    <div className="space-y-2 text-sm">
                        <div className="flex gap-2 items-start"><MapPin size={15} className="text-accent flex-shrink-0 mt-0.5" /><span>{c('COMPANY_ADDRESS', '')}</span></div>
                        <div className="flex gap-2"><Phone size={15} className="text-accent flex-shrink-0" /><span className="font-semibold text-white">{c('COMPANY_PHONE_2', '')} - {c('COMPANY_PHONE', '')}</span></div>
                        <div className="flex gap-2"><Mail size={15} className="text-accent flex-shrink-0" /><span>{c('COMPANY_EMAIL', '')}</span></div>
                    </div>
                    <div className="text-xs text-gray-400"><span className="font-semibold">MST:</span> {c('COMPANY_TAX_CODE', '')}</div>
                    <div className="flex gap-2 pt-1">
                        {socials.map(({ url, Icon, hover }) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={`w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 ${hover} hover:text-white transition-all cursor-pointer`}>
                                <Icon size={16} />
                            </a>
                        ))}
                    </div>
                </div>

                {/* About links */}
                <div>
                    <h4 className="text-sm font-bold text-white uppercase mb-4 pb-2 border-b border-gray-800">Ve Quang Huong</h4>
                    <ul className="space-y-0.5">
                        <FL to="/about" label="Gioi thieu chung" />
                        <FL to="/policy/news" label="Tin tuc cong nghe" />
                        <FL to="/policy/promotions" label="Tin khuyen mai" />
                        <FL to="/recruitment" label="Tuyen dung" />
                        <FL to="/contact" label="Lien he" />
                    </ul>
                </div>

                {/* Categories */}
                <MenuCol title="San pham kinh doanh" menu={categoryMenu} fallback={
                    <><FL to="/products" label="Tat ca san pham" /><FL to="/repairs" label="Dich vu sua chua" /><FL to="/warranty" label="Bao hanh" /></>
                } />

                {/* Policies */}
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

            {/* Bottom bar */}
            <div className="bg-gray-950 py-4 pb-20 lg:pb-4 border-t border-gray-800">
                <div className="max-w-[1400px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3 text-[11px] text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Ban quyen thuoc ve {brand1} {brand2}.</p>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> He thong dang hoat dong</span>
                        <span>Thiet ke boi Do Tung Duong</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
