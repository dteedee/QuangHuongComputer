
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
    Search, ShoppingCart, Menu as MenuIcon, Phone,
    Wrench, Monitor, ChevronDown,
    LogOut, Settings, Laptop, Cpu, Zap,
    Briefcase, MessageCircle, User, Package, FileText
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { systemConfigApi, getConfigValue, type ConfigurationEntry } from '../api/systemConfig';
import { contentApi, type Menu, type MenuItem } from '../api/content';

interface HeaderProps {
    onCartClick: () => void;
    onChatClick?: () => void;
}

const IconMap: Record<string, any> = {
    'Search': Search,
    'ShoppingCart': ShoppingCart,
    'Menu': MenuIcon,
    'Phone': Phone,
    'Wrench': Wrench,
    'Monitor': Monitor,
    'Laptop': Laptop,
    'Cpu': Cpu,
    'Zap': Zap,
    'Briefcase': Briefcase,
    'MessageCircle': MessageCircle,
    'User': User,
    'Package': Package,
    'FileText': FileText,
};

export const Header = ({ onCartClick, onChatClick }: HeaderProps) => {
    const { isAuthenticated, user, logout } = useAuth();
    const { itemCount } = useCart();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [configs, setConfigs] = useState<ConfigurationEntry[]>([]);
    const [headerMenu, setHeaderMenu] = useState<Menu | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [configData, menuData] = await Promise.all([
                    systemConfigApi.config.getPublic(),
                    contentApi.getMenus('HeaderMain')
                ]);
                setConfigs(Array.isArray(configData) ? configData : []);
                if (Array.isArray(menuData) && menuData.length > 0) {
                    setHeaderMenu(menuData[0]);
                }
            } catch (error) {
                console.error('Failed to load header data', error);
            }
        };
        fetchData();
    }, []);

    const companyBrand1 = getConfigValue(configs, 'COMPANY_BRAND_TEXT_1', 'QUANG HƯỞNG', (v) => v);
    const companyBrand2 = getConfigValue(configs, 'COMPANY_BRAND_TEXT_2', 'COMPUTER', (v) => v);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
        }
    };

    const location = useLocation();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    };

    const getLinkClass = (path: string) => {
        const active = isActive(path);
        const baseClass = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all uppercase tracking-tight";
        const activeClass = "bg-[#D70018] text-white shadow-lg shadow-red-500/20";
        const inactiveClass = "text-gray-600 hover:bg-gray-100 hover:text-[#D70018]";

        return `${baseClass} ${active ? activeClass : inactiveClass}`;
    };

    const renderIcon = (iconName?: string) => {
        if (!iconName) return null;
        const IconComponent = IconMap[iconName];
        return IconComponent ? <IconComponent size={16} /> : null;
    };

    return (
        <div className="flex flex-col w-full z-50 sticky top-0 bg-white shadow-sm font-sans">
            {/* 1. Top Bar (Red) */}
            <div className="bg-[#D70018] text-white text-[11px] font-medium py-1.5 hidden md:block relative z-[60]">
                <div className="max-w-[1400px] mx-auto px-4 flex justify-between items-center">
                    <div className="flex gap-4">
                        <Link to="/" className="bg-white/20 px-2 py-0.5 rounded hover:bg-white/30 transition-colors uppercase">Khách hàng cá nhân</Link>
                        <Link to="/contact" className="hover:text-white/80 transition-colors uppercase">Khách hàng doanh nghiệp, Game Net</Link>
                    </div>
                    <div className="flex gap-6 items-center">
                        <Link to="/policy/promotions" className="hover:underline flex items-center gap-1.5"><Zap size={12} /> Tin khuyến mãi</Link>
                        <Link to="/policy/news" className="hover:underline flex items-center gap-1.5"><Monitor size={12} /> Tin công nghệ</Link>
                        <Link to="/recruitment" className="hover:underline flex items-center gap-1.5"><Briefcase size={12} /> Tuyển dụng</Link>
                        <Link to="/contact" className="hover:underline flex items-center gap-1.5"><Phone size={12} /> Liên hệ</Link>

                        <div className="h-4 w-[1px] bg-white/30" />

                        {isAuthenticated ? (
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-1 hover:underline font-bold"
                                >
                                    Chào, {user?.fullName} <ChevronDown size={12} />
                                </button>
                                {showUserMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-100 py-2 z-[100]">
                                        <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-red-50 text-[#D70018] flex items-center justify-center font-bold">
                                                {user?.fullName.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm truncate max-w-[140px]">{user?.fullName}</span>
                                                <span className="text-[10px] text-gray-400">Thành viên</span>
                                            </div>
                                        </div>

                                        <div className="p-1">
                                            <Link to="/profile" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors text-gray-600">
                                                <User size={16} /> Tài khoản của tôi
                                            </Link>
                                            {user?.roles.includes('Customer') && (
                                                <Link to="/profile?tab=orders" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors text-gray-600">
                                                    <Package size={16} /> Đơn hàng
                                                </Link>
                                            )}
                                            {user?.roles.some(role => ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier'].includes(role)) && (
                                                <Link to="/backoffice" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors text-gray-600">
                                                    <Settings size={16} /> Quản trị website
                                                </Link>
                                            )}
                                        </div>

                                        <div className="h-px bg-gray-100 my-1" />

                                        <div className="p-1">
                                            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 rounded-lg transition-colors text-rose-600 font-medium">
                                                <LogOut size={16} /> Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <Link to="/login" className="hover:underline">Đăng nhập</Link>
                                <Link to="/register" className="hover:underline">Đăng ký</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Main Header (White) */}
            <div className="bg-white py-4 border-b border-gray-100">
                <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-4 lg:gap-8 justify-between">
                    <Link to="/" className="flex-shrink-0 flex items-center gap-3 group">
                        <div className="relative">
                            <div className="w-12 h-12 bg-[#D70018] rounded-lg flex items-center justify-center text-white font-black text-2xl transform shadow-lg shadow-red-500/20 group-hover:rotate-3 transition-transform">
                                QH
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-[#D70018] uppercase tracking-tighter leading-none group-hover:scale-105 transition-transform origin-left">{companyBrand1}</span>
                            <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mt-1">{companyBrand2}</span>
                        </div>
                    </Link>

                    <div className="flex-1 max-w-2xl relative">
                        <form onSubmit={handleSearch} className="flex h-11">
                            <div className="relative flex-shrink-0 bg-gray-100 px-4 flex items-center gap-1 rounded-l-xl border-r border-gray-200 cursor-pointer text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                                Tất cả danh mục <ChevronDown size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Nhập tên sản phẩm, mã sản phẩm, từ khoá..."
                                className="flex-1 px-4 bg-gray-100 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#D70018]/20 transition-all border-y border-gray-100"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" className="bg-[#D70018] text-white px-6 rounded-r-xl hover:bg-[#b50014] transition-all font-bold">
                                <Search size={20} />
                            </button>
                        </form>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
                        <button
                            onClick={onCartClick}
                            className="flex items-center gap-3 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all relative border border-red-200 group"
                        >
                            <div className="relative">
                                <ShoppingCart size={22} className="text-[#D70018] group-hover:scale-110 transition-transform" />
                                {itemCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-[#D70018] text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white animate-bounce">
                                        {itemCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-sm font-bold text-[#D70018] hidden sm:block">Giỏ hàng</span>
                        </button>

                        <button
                            onClick={onChatClick}
                            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all border border-red-200 group"
                        >
                            <MessageCircle size={22} className="text-[#D70018] group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold text-[#D70018] hidden sm:block">Chat</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Navigation (White) */}
            <div className="bg-white border-b border-gray-100 hidden lg:block shadow-sm">
                <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 py-2">
                        {headerMenu?.items ? (
                            headerMenu.items.map((item) => (
                                <Link
                                    key={item.id}
                                    to={item.url || '/'}
                                    className={`${getLinkClass(item.url || '/')} ${item.cssClass || ''}`}
                                    target={item.openInNewTab ? "_blank" : undefined}
                                >
                                    {renderIcon(item.icon)} {item.label}
                                </Link>
                            ))
                        ) : (
                            // Fallback links if no menu loaded yet or empty
                            <>
                                <Link to="/products" className={getLinkClass('/products')}><MenuIcon size={18} /> Danh mục sản phẩm</Link>
                                <Link to="/repairs" className={getLinkClass('/repairs')}><Wrench size={16} /> Dịch vụ sửa chữa</Link>
                                <Link to="/warranty" className={getLinkClass('/warranty')}><Monitor size={16} /> Bảo hành</Link>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <Link to="/promotion" className="text-xs font-bold text-[#D70018] animate-pulse flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                            <Zap size={14} className="fill-[#D70018]" />
                            SIÊU SELL TỔNG KẾT NĂM
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
