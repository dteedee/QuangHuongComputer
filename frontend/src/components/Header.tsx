import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Search, ShoppingCart, User, Menu, Phone, Wrench, FileText, Monitor, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
    onCartClick: () => void;
}

export const Header = ({ onCartClick }: HeaderProps) => {
    const { isAuthenticated, user, logout } = useAuth();
    const { itemCount } = useCart();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Searching for:', searchQuery);
    };

    return (
        <div className="flex flex-col w-full z-50 sticky top-0 shadow-md">
            {/* 1. Top Bar (Red Background) */}
            <div className="bg-[#D70018] text-white text-xs py-1.5 hidden md:block">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <div className="flex gap-4">
                        <Link to="#" className="hover:opacity-80">Khách hàng cá nhân</Link>
                        <span className="opacity-50">|</span>
                        <Link to="#" className="hover:opacity-80">Khách hàng doanh nghiệp, Game Net</Link>
                    </div>
                    <div className="flex gap-4">
                        <Link to="#" className="hover:opacity-80 flex items-center gap-1"><FileText size={12} /> Tin khuyến mãi</Link>
                        <Link to="#" className="hover:opacity-80 flex items-center gap-1"><Monitor size={12} /> Tin tức công nghệ</Link>
                        <Link to="#" className="hover:opacity-80 flex items-center gap-1"><User size={12} /> Tuyển dụng</Link>
                        {isAuthenticated ? (
                            <button onClick={handleLogout} className="font-bold hover:underline">Đăng xuất ({user?.fullName})</button>
                        ) : (
                            <div className="flex gap-2">
                                <Link to="/login" className="hover:underline">Đăng nhập</Link>
                                <span>/</span>
                                <Link to="/register" className="hover:underline">Đăng ký</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Main Header (White Background) */}
            <div className="bg-white py-3">
                <div className="container mx-auto px-4 flex items-center gap-4 lg:gap-8 justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                        <div className="w-10 h-10 bg-[#D70018] rounded flex items-center justify-center text-white font-bold text-xl skew-x-[-10deg]">
                            Q
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-extrabold text-[#D70018] uppercase tracking-tighter">QUANG HUONG</span>
                            <span className="text-xs font-bold text-gray-600 tracking-widest uppercase">COMPUTER</span>
                        </div>
                    </Link>

                    {/* Category Button & Search */}
                    <div className="flex-1 max-w-3xl flex items-center gap-4">
                        {/* Category Button */}
                        <button className="hidden lg:flex items-center gap-2 bg-[#D70018] text-white px-3 py-2.5 rounded hover:bg-red-700 transition text-sm font-bold flex-shrink-0">
                            <Menu size={20} />
                            <span>Danh mục sản phẩm</span>
                        </button>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="flex-1 relative hidden md:block">
                            <div className="relative flex items-center w-full">
                                <div className="absolute left-0 pl-3 pointer-events-none flex items-center">
                                    <button className="text-gray-500 bg-gray-100 p-1 rounded-md text-xs flex items-center gap-1 pr-2">
                                        Tất cả danh mục <ChevronDown size={10} />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Nhập từ khóa tìm kiếm ..."
                                    className="w-full pl-36 pr-12 py-2.5 bg-gray-100 border-none rounded-r-none rounded-l-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300 text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button type="submit" className="bg-[#D70018] text-white px-4 py-2.5 rounded-r-md hover:bg-red-700 transition absolute right-0 top-0 h-full flex items-center justify-center">
                                    <Search size={18} />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
                        {/* Hotline */}
                        <a href="tel:18006321" className="hidden xl:flex items-center gap-2 group">
                            <div className="w-10 h-10 rounded-full border border-[#D70018] flex items-center justify-center text-[#D70018] group-hover:bg-[#D70018] group-hover:text-white transition">
                                <Phone size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#D70018]">Hotline</span>
                                <span className="text-sm font-bold text-gray-800">1800.6321</span>
                            </div>
                        </a>

                        {/* Build PC */}
                        <Link to="/build-pc" className="hidden lg:flex items-center gap-2 group">
                            <div className="w-10 h-10 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-600 group-hover:border-[#D70018] group-hover:text-[#D70018] transition">
                                <Wrench size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-500">Xây dựng</span>
                                <span className="text-sm font-bold text-gray-800">Cấu hình PC</span>
                            </div>
                        </Link>

                        {/* Cart */}
                        <button onClick={onCartClick} className="flex items-center gap-2 group p-1.5 rounded-full bg-[#D70018] text-white px-3 hover:bg-red-700 transition">
                            <div className="relative">
                                <ShoppingCart size={20} />
                                <span className="absolute -top-2 -right-2 bg-yellow-400 text-red-600 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-white">
                                    {itemCount}
                                </span>
                            </div>
                            <span className="text-xs font-bold hidden sm:block">Giỏ hàng</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Search (Row 3) */}
            <div className="md:hidden bg-white p-2 border-b border-gray-200">
                <form onSubmit={handleSearch} className="relative flex w-full">
                    <input
                        type="text"
                        placeholder="Bạn cần tìm gì?"
                        className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#D70018]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="absolute right-0 top-0 h-full px-3 text-[#D70018]">
                        <Search size={18} />
                    </button>
                </form>
            </div>

            {/* Navigation Bar (Desktop) */}
            <div className="bg-white border-t border-gray-200 hidden lg:block">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-6 text-sm font-medium text-gray-700 py-2">
                        <Link to="/laptop" className="hover:text-[#D70018] flex items-center gap-2 uppercase font-bold text-xs"><Monitor size={14} /> Laptop</Link>
                        <Link to="/pc-gaming" className="hover:text-[#D70018] flex items-center gap-2 uppercase font-bold text-xs"><Wrench size={14} /> PC Gaming</Link>
                        <Link to="/workstation" className="hover:text-[#D70018] flex items-center gap-2 uppercase font-bold text-xs"><Monitor size={14} /> Workstation</Link>
                        <Link to="/office" className="hover:text-[#D70018] flex items-center gap-2 uppercase font-bold text-xs"><Monitor size={14} /> Văn phòng</Link>
                        <Link to="/components" className="hover:text-[#D70018] flex items-center gap-2 uppercase font-bold text-xs"><Wrench size={14} /> Linh kiện</Link>
                        <Link to="/screens" className="hover:text-[#D70018] flex items-center gap-2 uppercase font-bold text-xs"><Monitor size={14} /> Màn hình</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
