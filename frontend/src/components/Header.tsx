
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
    Search, ShoppingCart, Menu, Phone,
    Wrench, Monitor, ChevronDown,
    LogOut, Settings, Laptop, Cpu, Zap,
    Briefcase, MessageCircle, User, Package, FileText
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { systemConfigApi, getConfigValue, type ConfigurationEntry } from '../api/systemConfig';
import { catalogApi, type Category } from '../api/catalog';

interface HeaderProps {
    onCartClick: () => void;
    onChatClick?: () => void;
}

export const Header = ({ onCartClick, onChatClick }: HeaderProps) => {
    const { isAuthenticated, user, logout } = useAuth();
    const { itemCount } = useCart();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [configs, setConfigs] = useState<ConfigurationEntry[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const categoryMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const data = await systemConfigApi.config.getPublic();
                setConfigs(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to load header configs', error);
            }
        };
        fetchConfigs();
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
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
            setSearchQuery(''); // Clear search after submit
        }
    };

    const location = useLocation();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        // Handle precise matching for products vs other potential sub-paths if needed
        // For now, simpler check:
        return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    };

    const getLinkClass = (path: string, isButton = false) => {
        const active = isActive(path);

        if (isButton) {
            // Special styling for the first button "Danh mục sản phẩm" if we keep it distinct
            // But user wants the "bar" to move.
            // If we want them all to look like tabs, we might need a unified style.
            // Let's try to make the active one look like the current "Danh mục sản phẩm" button (Red bg, white text)
        }

        const baseClass = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all uppercase tracking-tight";
        const activeClass = "bg-[#D70018] text-white shadow-lg shadow-red-500/20";
        const inactiveClass = "text-gray-600 hover:bg-gray-100 hover:text-[#D70018]";

        return `${baseClass} ${active ? activeClass : inactiveClass}`;
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
                                {/* Dropdown menu - redesign */}
                                {showUserMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-100 py-2 z-[100]">
                                        <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-red-50 text-[#D70018] flex items-center justify-center font-bold">
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
                                            <Link to="/account" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors text-gray-600">
                                                <User size={16} /> Tài khoản của tôi
                                            </Link>
                                            {/* Chỉ hiển thị Đơn hàng cho khách hàng (không phải nhân viên) */}
                                            {!user?.roles.some(role => ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier', 'Marketing'].includes(role)) && (
                                                <Link to="/account?tab=orders" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors text-gray-600">
                                                    <Package size={16} /> Đơn hàng
                                                </Link>
                                            )}
                                            {/* Hiển thị link dashboard với tên phù hợp theo role */}
                                            {user?.roles.some(role => ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier', 'Marketing'].includes(role)) && (
                                                <Link to="/backoffice" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors text-gray-600">
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
            <div className="bg-white py-4 border-b border-gray-100">
                <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-4 lg:gap-8 justify-between">
                    {/* Logo Section */}
                    <Link to="/" className="flex-shrink-0 flex items-center gap-3 group" data-testid="logo-link">
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

                    {/* Search Bar */}
                    <div className="flex-1 max-w-2xl relative">
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
                                            <Menu size={16} className="text-[#D70018]" />
                                            Tất cả sản phẩm
                                        </Link>
                                        {categories.map((category) => (
                                            <Link
                                                key={category.id}
                                                to={`/products?categoryId=${category.id}`}
                                                onClick={() => setShowCategoryMenu(false)}
                                                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-600 hover:text-[#D70018] transition-colors"
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
                                className="flex-1 px-4 bg-gray-100 text-gray-900 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#D70018]/20 transition-all border-y border-gray-100 placeholder:text-gray-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" className="bg-[#D70018] text-white px-6 rounded-r-xl hover:bg-[#b50014] transition-all font-bold">
                                <Search size={20} />
                            </button>
                        </form>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
                        {/* Cart */}
                        <button
                            onClick={onCartClick}
                            className="flex items-center gap-3 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all relative border border-red-200 group"
                            data-testid="cart-button"
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

                        {/* Chat */}
                        <button
                            onClick={onChatClick}
                            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all border border-red-200 group"
                            data-testid="chat-button"
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
                        {/* Unified Navigation Links */}
                        {[
                            { name: 'Danh mục sản phẩm', icon: <Menu size={18} />, path: '/products' }, // Changed to be just another tab but first
                            // { name: 'Sản phẩm', icon: <Laptop size={16} />, path: '/products' }, // Removed redundant link if "Danh mục" is the main product link
                            { name: 'Dịch vụ sửa chữa', icon: <Wrench size={16} />, path: '/repairs' },
                            { name: 'Bảo hành', icon: <Monitor size={16} />, path: '/warranty' },
                            { name: 'Blog/Tin tức', icon: <FileText size={16} />, path: '/policy/news' },
                            { name: 'Liên hệ', icon: <Phone size={16} />, path: '/contact' },
                        ].map((item, idx) => (
                            <Link
                                key={idx}
                                to={item.path}
                                className={getLinkClass(item.path)}
                            >
                                {item.icon} {item.name}
                            </Link>
                        ))}
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
