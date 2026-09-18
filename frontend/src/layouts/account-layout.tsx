import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutGrid, Package, MapPin, Heart, RotateCcw, Award, ShieldCheck, Wrench, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Shared shell for every `/tai-khoan/*` screen (W3-8, phase-56 Implementation Step 1). Not a
 * react-router nested layout — this app's route manifest (`routes/route-renderer.tsx`, owned by
 * W1-8) maps one flat `RouteDef` per path with no parent/child composition, so each account page
 * wraps ITS OWN content with `<AccountLayout>` instead of relying on an `<Outlet/>`. Old
 * `/account?tab=` URLs already redirect to their `/tai-khoan/...` equivalent in
 * `storefront-account.routes.ts`.
 */

interface NavItem {
    to: string;
    label: string;
    icon: typeof LayoutGrid;
    /** Matches this item active even on a nested detail path (e.g. an order detail page). */
    matchPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
    { to: '/tai-khoan', label: 'Tổng quan', icon: LayoutGrid },
    { to: '/tai-khoan/profile', label: 'Hồ sơ cá nhân', icon: LayoutGrid },
    { to: '/tai-khoan/orders', label: 'Đơn hàng', icon: Package, matchPrefix: '/tai-khoan/orders' },
    { to: '/tai-khoan/addresses', label: 'Sổ địa chỉ', icon: MapPin },
    { to: '/tai-khoan/returns', label: 'Đổi / trả hàng', icon: RotateCcw, matchPrefix: '/tai-khoan/returns' },
    { to: '/tai-khoan/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
    { to: '/tai-khoan/loyalty', label: 'Điểm tích lũy', icon: Award },
    { to: '/tai-khoan/security', label: 'Bảo mật & đăng nhập', icon: ShieldCheck },
];

/** Owned by W3-3 (repair/warranty track) — linked from here, not rendered here. */
const EXTERNAL_LINKS: NavItem[] = [
    { to: '/bao-hanh', label: 'Bảo hành & sửa chữa', icon: Wrench },
];

function isActive(pathname: string, item: NavItem) {
    if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
    return pathname === item.to;
}

interface AccountLayoutProps {
    children: ReactNode;
    /** Breadcrumb trail past "Tài khoản" — e.g. [{label:'Đơn hàng', to:'/tai-khoan/orders'}, {label:'#DH0012'}]. */
    breadcrumb?: { label: string; to?: string }[];
}

export const AccountLayout = ({ children, breadcrumb }: AccountLayoutProps) => {
    const { user } = useAuth();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-6 flex-wrap">
                    <Link to="/" className="hover:text-accent cursor-pointer">Trang chủ</Link>
                    <ChevronRight size={12} />
                    <Link to="/tai-khoan" className="hover:text-accent cursor-pointer">Tài khoản</Link>
                    {breadcrumb?.map((b, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                            <ChevronRight size={12} />
                            {b.to ? (
                                <Link to={b.to} className="hover:text-accent cursor-pointer">{b.label}</Link>
                            ) : (
                                <span className="text-gray-600">{b.label}</span>
                            )}
                        </span>
                    ))}
                </nav>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar */}
                    <aside className="lg:w-64 shrink-0">
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 lg:sticky lg:top-6">
                            <div className="flex items-center gap-3 px-2 pb-4 mb-2 border-b border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold shrink-0">
                                    {(user?.fullName || user?.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{user?.fullName || 'Khách hàng'}</p>
                                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                </div>
                            </div>

                            <ul className="space-y-1 overflow-x-auto lg:overflow-visible flex lg:flex-col gap-1 lg:gap-0">
                                {NAV_ITEMS.map((item) => {
                                    const active = isActive(location.pathname, item);
                                    const Icon = item.icon;
                                    return (
                                        <li key={item.to} className="shrink-0">
                                            <Link
                                                to={item.to}
                                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                                    active ? 'bg-accent/10 text-accent' : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                <Icon size={16} />
                                                {item.label}
                                            </Link>
                                        </li>
                                    );
                                })}
                                <li className="border-t border-gray-100 mt-2 pt-2 lg:block hidden" />
                                {EXTERNAL_LINKS.map((item) => (
                                    <li key={item.to} className="shrink-0">
                                        <Link
                                            to={item.to}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap text-gray-500 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <item.icon size={16} />
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>

                    {/* Content */}
                    <motion.main
                        key={location.pathname}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                        className="flex-1 min-w-0"
                    >
                        {children}
                    </motion.main>
                </div>
            </div>
        </div>
    );
};

export default AccountLayout;
