
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import {
    Search, ShoppingCart, Menu as MenuIcon, Phone,
    Wrench, Monitor, ChevronDown,
    LogOut, Settings, Laptop, Cpu, Zap,
    Briefcase, MessageCircle, User, Package, FileText,
    X, Home, ArrowRight, Sun, Moon
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { systemConfigApi, getConfigValue, type ConfigurationEntry } from '../api/systemConfig';
import { catalogApi, type Category } from '../api/catalog';
import { contentApi, type Menu } from '../api/content';

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
    const { isDark, toggleMode } = useTheme();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [configs, setConfigs] = useState<ConfigurationEntry[]>([]);
    const [headerMenu, setHeaderMenu] = useState<Menu | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const categoryMenuRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const configData = await systemConfigApi.config.getPublic();
                setConfigs(Array.isArray(configData) ? configData : []);
            } catch (error) {
                console.error('Failed to load config', error);
            }
            try {
                const menuData = await contentApi.getMenu('HeaderMain');
                setHeaderMenu(menuData);
            } catch (error) {
                console.error('Failed to load header menu', error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await catalogApi.getCategories();
                setCategories(data.filter(c => c.isActive));
            } catch (error) {
                console.error('Failed to load categories', error);
            }
        };
        fetchCategories();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
                setShowCategoryMenu(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close mobile menu on route change
    const location = useLocation();
    useEffect(() => {
        setShowMobileMenu(false);
    }, [location.pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (showMobileMenu) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showMobileMenu]);

    const companyBrand1 = getConfigValue(configs, 'COMPANY_BRAND_TEXT_1', 'QUANG HƯỞNG', (v) => v);
    const companyBrand2 = getConfigValue(configs, 'COMPANY_BRAND_TEXT_2', 'COMPUTER', (v) => v);

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
        navigate('/login');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
            setShowMobileMenu(false);
        }
    };

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    };

    const getLinkClass = (path: string) => {
        const active = isActive(path);
        const baseClass = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all uppercase tracking-tight";
        const activeClass = "bg-accent text-white shadow-lg shadow-red-500/20";
        const inactiveClass = "text-gray-600 hover:bg-gray-100 hover:text-accent";

        return `${baseClass} ${active ? activeClass : inactiveClass}`;
    };

    const renderIcon = (iconName?: string) => {
        if (!iconName) return null;
        const IconComponent = IconMap[iconName];
        return IconComponent ? <IconComponent size={16} /> : null;
    };

    return (
        <>
            <div className={`flex flex-col w-full z-50 sticky top-0 bg-white font-sans transition-shadow duration-300 ${isScrolled ? 'shadow-lg' : 'shadow-sm'}`}>
                {/* 1. Top Bar (Red) — hide when scrolled on desktop for compactness */}
                <div className={`bg-accent text-white text-[11px] font-medium py-1.5 hidden md:block relative z-[60] transition-all duration-300 ${isScrolled ? 'py-1 text-[10px]' : ''}`}>
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

                            <button onClick={toggleMode} className="hover:text-amber-300 transition-colors flex items-center gap-1.5 ml-1" title="Giao diện Sáng/Tối">
                                {isDark ? <Sun size={14} /> : <Moon size={14} />} 
                            </button>

                            <div className="h-4 w-[1px] bg-white/30" />

                            {isAuthenticated ? (
                                <div className="relative" ref={userMenuRef}>
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-1 hover:underline font-bold"
                                    >
                                        Chào, {user?.fullName} <ChevronDown size={12} />
                                    </button>
                                    {showUserMenu && (
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-100 py-2 z-[100]">
                                            <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-red-50 text-accent flex items-center justify-center font-bold">
                                                    {user?.fullName.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm truncate max-w-[140px]">{user?.fullName}</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {(() => {
                                                            const roles = user?.roles || [];
                                                            if (roles.includes('Admin')) return 'Quản trị viên';
                                                            if (roles.includes('Manager')) return 'Quản lý';
                                                            if (roles.includes('Sale')) return 'Nhân viên bán hàng';
                                                            if (roles.includes('TechnicianInShop') || roles.includes('TechnicianOnSite')) return 'Kỹ thuật viên';
                                                            if (roles.includes('Accountant')) return 'Kế toán';
                                                            if (roles.includes('Supplier')) return 'Nhà cung cấp';
                                                            if (roles.includes('Marketing')) return 'Marketing';
                                                            return 'Khách hàng';
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-1">
                                                <Link to="/account" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors text-gray-600" onClick={() => setShowUserMenu(false)}>
                                                    <User size={16} /> Tài khoản của tôi
                                                </Link>
                                                {/* Chỉ hiển thị Đơn hàng cho khách hàng (không phải nhân viên) */}
                                                {!user?.roles.some(role => ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier', 'Marketing'].includes(role)) && (
                                                    <Link to="/account?tab=orders" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors text-gray-600" onClick={() => setShowUserMenu(false)}>
                                                        <Package size={16} /> Đơn hàng
                                                    </Link>
                                                )}
                                                {/* Hiển thị link dashboard với tên phù hợp theo role */}
                                                {user?.roles.some(role => ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier', 'Marketing'].includes(role)) && (
                                                    <Link to="/backoffice" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors text-gray-600" onClick={() => setShowUserMenu(false)}>
                                                        <Settings size={16} />
                                                        {(() => {
                                                            const roles = user?.roles || [];
                                                            if (roles.includes('Admin')) return 'Quản trị hệ thống';
                                                            if (roles.includes('Manager')) return 'Bảng điều khiển quản lý';
                                                            if (roles.includes('Sale')) return 'Quản lý bán hàng';
                                                            if (roles.includes('TechnicianInShop') || roles.includes('TechnicianOnSite')) return 'Bảng điều khiển kỹ thuật';
                                                            if (roles.includes('Accountant')) return 'Quản lý tài chính';
                                                            if (roles.includes('Supplier')) return 'Quản lý kho hàng';
                                                            if (roles.includes('Marketing')) return 'Quản lý marketing';
                                                            return 'Quản trị';
                                                        })()}
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
                <div className={`bg-white border-b border-gray-100 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-4'}`}>
                    <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-4 lg:gap-8 justify-between">
                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setShowMobileMenu(true)}
                            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-accent hover:text-white transition-colors"
                            aria-label="Menu"
                        >
                            <MenuIcon size={22} />
                        </button>

                        <Link to="/" className="flex-shrink-0 flex items-center gap-3 group">
                            <div className="relative">
                                <div className={`bg-accent rounded-lg flex items-center justify-center text-white font-black transform shadow-lg shadow-red-500/20 group-hover:rotate-3 transition-all ${isScrolled ? 'w-10 h-10 text-xl' : 'w-12 h-12 text-2xl'}`}>
                                    QH
                                </div>
                            </div>
                            <div className="flex flex-col hidden sm:flex">
                                <span className={`font-black text-accent uppercase tracking-tighter leading-none group-hover:scale-105 transition-transform origin-left ${isScrolled ? 'text-lg' : 'text-xl'}`}>{companyBrand1}</span>
                                <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mt-1">{companyBrand2}</span>
                            </div>
                        </Link>

                        <div className="flex-1 max-w-2xl relative hidden md:block">
                            <form onSubmit={handleSearch} className="flex h-11">
                                <div className="relative" ref={categoryMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                                        className="h-full flex-shrink-0 bg-gray-100 px-4 flex items-center gap-1 rounded-l-xl border-r border-gray-200 cursor-pointer text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                                    >
                                        Tất cả danh mục <ChevronDown size={14} className={`transition-transform ${showCategoryMenu ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showCategoryMenu && (
                                        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[100] max-h-80 overflow-y-auto">
                                            <Link
                                                to="/products"
                                                onClick={() => setShowCategoryMenu(false)}
                                                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 font-medium border-b border-gray-100"
                                            >
                                                <MenuIcon size={16} className="text-accent" />
                                                Tất cả sản phẩm
                                            </Link>
                                            {categories.map((category) => (
                                                <Link
                                                    key={category.id}
                                                    to={`/products?categoryId=${category.id}`}
                                                    onClick={() => setShowCategoryMenu(false)}
                                                    className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-600 hover:text-accent transition-colors"
                                                >
                                                    <span>{category.name}</span>
                                                    {category.productCount !== undefined && category.productCount > 0 && (
                                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                            {category.productCount}
                                                        </span>
                                                    )}
                                                </Link>
                                            ))}
                                            {categories.length === 0 && (
                                                <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                                    Đang tải danh mục...
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Nhập tên sản phẩm, mã sản phẩm, từ khoá..."
                                    className="flex-1 px-4 bg-gray-100 text-gray-900 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-accent/20 transition-all border-y border-gray-100 placeholder:text-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button type="submit" className="bg-accent text-white px-6 rounded-r-xl hover:bg-accent-hover transition-all font-bold">
                                    <Search size={20} />
                                </button>
                            </form>
                        </div>

                        <div className="flex items-center gap-3 lg:gap-6 flex-shrink-0">
                            {/* Mobile search button */}
                            <button
                                onClick={() => navigate('/products?q=')}
                                className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-600 hover:text-accent transition-colors"
                            >
                                <Search size={20} />
                            </button>

                            <button
                                onClick={onCartClick}
                                className="flex items-center gap-3 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all relative border border-red-200 group"
                            >
                                <div className="relative">
                                    <ShoppingCart size={22} className="text-accent group-hover:scale-110 transition-transform" />
                                    {itemCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white">
                                            {itemCount}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-accent hidden sm:block">Giỏ hàng</span>
                            </button>

                            <button
                                onClick={onChatClick || (() => window.dispatchEvent(new Event('open-chat')))}
                                className="hidden lg:flex items-center gap-2 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all border border-red-200 group"
                            >
                                <MessageCircle size={22} className="text-accent group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-bold text-accent hidden sm:block">Chat</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. Navigation (White) - Desktop only */}
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
                            <Link to="/policy/promotions" className="text-xs font-bold text-accent animate-pulse flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                <Zap size={14} className="fill-accent" />
                                SIÊU SALE
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {showMobileMenu && (
                <div className="fixed inset-0 z-[200] lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowMobileMenu(false)}
                    />

                    {/* Mobile Drawer */}
                    <div className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in z-10">
                        {/* Drawer Header */}
                        <div className="bg-gradient-to-r from-accent to-[#b91c1c] p-5 flex items-center justify-between">
                            <Link to="/" className="flex items-center gap-3" onClick={() => setShowMobileMenu(false)}>
                                <div className="w-10 h-10 bg-white text-accent rounded-lg flex items-center justify-center font-black text-xl shadow-lg">
                                    QH
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-black text-lg tracking-tighter">{companyBrand1}</span>
                                    <span className="text-white/70 text-[9px] font-bold tracking-[0.2em] uppercase">{companyBrand2}</span>
                                </div>
                            </Link>
                            <button
                                onClick={() => setShowMobileMenu(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Mobile Search */}
                        <div className="p-4 border-b border-gray-100">
                            <form onSubmit={handleSearch} className="flex h-10">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm sản phẩm..."
                                    className="flex-1 px-4 bg-gray-100 text-gray-900 text-sm rounded-l-xl focus:outline-none focus:ring-2 focus:ring-accent/20 placeholder:text-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button type="submit" className="bg-accent text-white px-4 rounded-r-xl hover:bg-accent-hover transition-all">
                                    <Search size={18} />
                                </button>
                            </form>
                        </div>

                        {/* Mobile Navigation Links */}
                        <div className="flex-1 overflow-y-auto py-2">
                            <div className="px-2 space-y-1">
                                <Link to="/" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-accent rounded-xl font-semibold transition-colors">
                                    <Home size={20} /> Trang chủ
                                </Link>
                                <Link to="/products" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-accent rounded-xl font-semibold transition-colors">
                                    <MenuIcon size={20} /> Danh mục sản phẩm
                                </Link>
                                <Link to="/repairs" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-accent rounded-xl font-semibold transition-colors">
                                    <Wrench size={20} /> Dịch vụ sửa chữa
                                </Link>
                                <Link to="/warranty" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-accent rounded-xl font-semibold transition-colors">
                                    <Monitor size={20} /> Bảo hành
                                </Link>
                            </div>

                            {/* Categories in mobile */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h4 className="px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Danh mục</h4>
                                <div className="px-2 space-y-0.5">
                                    {categories.slice(0, 8).map((category) => (
                                        <Link
                                            key={category.id}
                                            to={`/products?categoryId=${category.id}`}
                                            onClick={() => setShowMobileMenu(false)}
                                            className="flex items-center justify-between px-4 py-2.5 text-sm text-gray-600 hover:bg-red-50 hover:text-accent rounded-xl transition-colors"
                                        >
                                            <span>{category.name}</span>
                                            <ArrowRight size={14} className="text-gray-300" />
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h4 className="px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Hỗ trợ</h4>
                                <div className="px-2 space-y-0.5">
                                    <Link to="/contact" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-red-50 hover:text-accent rounded-xl transition-colors">
                                        <Phone size={16} /> Liên hệ
                                    </Link>
                                    <Link to="/recruitment" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-red-50 hover:text-accent rounded-xl transition-colors">
                                        <Briefcase size={16} /> Tuyển dụng
                                    </Link>
                                    <Link to="/about" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-red-50 hover:text-accent rounded-xl transition-colors">
                                        <FileText size={16} /> Giới thiệu
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            {isAuthenticated ? (
                                <div className="flex items-center justify-between">
                                    <Link to="/account" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                        <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm">
                                            {user?.fullName.charAt(0)}
                                        </div>
                                        {user?.fullName}
                                    </Link>
                                    <button onClick={handleLogout} className="text-sm text-red-500 font-bold hover:underline flex items-center gap-1">
                                        <LogOut size={14} /> Đăng xuất
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <Link to="/login" onClick={() => setShowMobileMenu(false)} className="flex-1 text-center py-2.5 bg-accent text-white font-bold rounded-xl text-sm hover:bg-accent-hover transition-colors">
                                        Đăng nhập
                                    </Link>
                                    <Link to="/register" onClick={() => setShowMobileMenu(false)} className="flex-1 text-center py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-300 transition-colors">
                                        Đăng ký
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
