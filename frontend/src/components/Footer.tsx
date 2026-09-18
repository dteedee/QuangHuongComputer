import { Phone, Mail, MapPin, Clock, Facebook, Youtube, Instagram, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contentApi, type Menu } from '../api/content';
import { FooterNewsletter } from './footer/footer-newsletter';
import { useCompanyInfo } from '../hooks/use-company-info';
import { usePublicConfig } from '../lib/use-public-config';
import { getConfigValue } from '../api/systemConfig';
import { queryKeys } from '../lib/query-keys';
import { buildPath, ROUTES } from '../routes/route-paths';

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
            {/* key kèm index: item.id từ API có thể rỗng/trùng giữa các menu → React dup-key warning */}
            {menu?.items?.map((item, idx) => (
                <FL key={`${item.id || item.label}-${idx}`} to={item.url || '/'} label={item.label} />
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
    /* One shared `/api/config/public` cache entry (W1-8's `usePublicConfig`) —
     * the Footer used to fetch it a second time on every page. D09: company
     * details come from `useCompanyInfo()`, which owns the real fallbacks; no
     * phone number or opening-hours string is written here. */
    const { data: configs = [] } = usePublicConfig();
    const { companyInfo } = useCompanyInfo();

    const menusQuery = useQuery({
        queryKey: queryKeys.content.list({ resource: 'footer-menus' }),
        queryFn: async () => {
            const [footerMain, footerBottom] = await Promise.all([
                contentApi.getMenus('FooterMain'),
                contentApi.getMenus('FooterBottom'),
            ]);
            return {
                categoryMenu: (Array.isArray(footerMain) && footerMain[0]) || null,
                supportMenu: (Array.isArray(footerBottom) && footerBottom[0]) || null,
            } as { categoryMenu: Menu | null; supportMenu: Menu | null };
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
    const categoryMenu = menusQuery.data?.categoryMenu ?? null;
    const supportMenu = menusQuery.data?.supportMenu ?? null;

    const c = (key: string, fb: string) => getConfigValue(configs, key, fb, (v) => v);
    const brand1 = companyInfo.brandText1;
    const brand2 = companyInfo.brandText2;
    const legalName = companyInfo.name;
    const taxCode = companyInfo.taxCode;
    const representative = companyInfo.representative;
    const address = companyInfo.address;
    const phone = companyInfo.phone;
    const phone2 = companyInfo.phone2;
    const email = companyInfo.email;
    const workingHours = companyInfo.workingHours;

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
                    <Link to={ROUTES.HOME} className="inline-flex items-center gap-2.5" aria-label={`${brand1} ${brand2}`}>
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
                        {socials.map(({ url, Icon, hover }, idx) => (
                            <a key={`${url || 'social'}-${idx}`} href={url} target="_blank" rel="noopener noreferrer" className={`w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 ${hover} hover:text-white transition-all cursor-pointer`}>
                                <Icon size={16} />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Về Quang Hưởng */}
                <div>
                    <h4 className="text-sm font-bold text-white uppercase mb-4 pb-2 border-b border-gray-800">Về Quang Hưởng</h4>
                    <ul className="space-y-0.5">
                        <FL to={ROUTES.ABOUT} label="Giới thiệu chung" />
                        <FL to={buildPath(ROUTES.POLICY, 'news')} label="Tin tức công nghệ" />
                        <FL to={buildPath(ROUTES.POLICY, 'promotions')} label="Tin khuyến mãi" />
                        <FL to={ROUTES.RECRUITMENT} label="Tuyển dụng" />
                        <FL to={ROUTES.CONTACT} label="Liên hệ" />
                    </ul>
                </div>

                {/* Sản phẩm kinh doanh */}
                <MenuCol title="Sản phẩm kinh doanh" menu={categoryMenu} fallback={
                    <><FL to={ROUTES.PRODUCTS} label="Tất cả sản phẩm" /><FL to={ROUTES.REPAIR} label="Dịch vụ sửa chữa" /><FL to={ROUTES.WARRANTY} label="Bảo hành" /></>
                } />

                {/* Chính sách & hỗ trợ */}
                <div>
                    <MenuCol title="Chính sách & hỗ trợ" menu={supportMenu} fallback={
                        <><FL to={buildPath(ROUTES.POLICY, 'bao-hanh')} label="Chính sách bảo hành" /><FL to={buildPath(ROUTES.POLICY, 'doi-tra')} label="Chính sách đổi trả" /><FL to={buildPath(ROUTES.POLICY, 'van-chuyen')} label="Chính sách vận chuyển" /><FL to={buildPath(ROUTES.POLICY, 'huong-dan-thanh-toan')} label="Hướng dẫn thanh toán" /></>
                    } />
                    {/* D04: the VISA/MASTER/NAPAS/VNPAY badges are gone — none of
                        those rails is live. Payment methods render from
                        `GET /api/payments/methods` in W3-19's component; this
                        footer does not re-implement it. */}
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
