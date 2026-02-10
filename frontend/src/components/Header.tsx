
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
    Search, ShoppingCart, Menu, Phone,
    Wrench, Monitor, ChevronDown,
    LogOut, Settings, Laptop, Cpu, Zap,
    Briefcase, MessageCircle, User, Package, FileText
} from 'lucide-react';
import { useState } from 'react';

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
                        <Link to="/contact" className="hover:underline flex items-center gap-1.5"><Briefcase size={12} /> Tuyển dụng</Link>

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
                    {/* Logo Section */}
                    <Link to="/" className="flex-shrink-0 flex items-center gap-3 group" data-testid="logo-link">
                        <div className="relative">
                            <div className="w-12 h-12 bg-[#D70018] rounded-lg flex items-center justify-center text-white font-black text-2xl transform shadow-lg shadow-red-500/20 group-hover:rotate-3 transition-transform">
                                QH
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-[#D70018] uppercase tracking-tighter leading-none group-hover:scale-105 transition-transform origin-left">QUANG HƯỞNG</span>
                            <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mt-1">COMPUTER</span>
                        </div>
                    </Link>

                    {/* Search Bar */}
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

                        {/* Account Menu Removed as per request to move to Top Bar */}
                    </div>
                </div>
            </div>

            {/* 3. Navigation (White) */}
            <div className="bg-white border-b border-gray-100 hidden lg:block shadow-sm">
                <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-8 py-2">
                        <Link to="/products" className="bg-[#D70018] text-white flex items-center gap-3 px-6 py-2.5 rounded-xl font-bold text-sm uppercase shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all hover:-translate-y-0.5">
                            <Menu size={18} /> Danh mục sản phẩm
                        </Link>

                        <div className="flex items-center gap-8">
                            {[
                                { name: 'Sản phẩm', icon: <Laptop size={16} />, path: '/products' },
                                { name: 'Dịch vụ sửa chữa', icon: <Wrench size={16} />, path: '/repairs' },
                                { name: 'Bảo hành', icon: <Monitor size={16} />, path: '/warranty' },
                                { name: 'Blog/Tin tức', icon: <FileText size={16} />, path: '/policy/news' },
                                { name: 'Liên hệ', icon: <Phone size={16} />, path: '/contact' },
                            ].map((item, idx) => (
                                <Link
                                    key={idx}
                                    to={item.path}
                                    className="flex items-center gap-2 text-[13px] font-bold text-gray-600 hover:text-[#D70018] transition-colors uppercase tracking-tight py-2"
                                >
                                    {item.icon} {item.name}
                                </Link>
                            ))}
                        </div>
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
