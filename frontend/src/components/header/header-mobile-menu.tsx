import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Search, Menu as MenuIcon, Phone, Wrench, Monitor,
    Briefcase, FileText, X, Home, ArrowRight, LogOut
} from 'lucide-react';
import { useState } from 'react';
import type { Category } from '../../api/catalog';

interface HeaderMobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    companyBrand1: string;
    companyBrand2: string;
    categories: Category[];
}

export const HeaderMobileMenu = ({
    isOpen, onClose, companyBrand1, companyBrand2, categories
}: HeaderMobileMenuProps) => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
            onClose();
        }
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] lg:hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in z-10">
                {/* Drawer header */}
                <div className="bg-accent p-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
                        <div className="w-9 h-9 bg-white text-accent rounded-lg flex items-center justify-center font-black text-lg shadow">
                            QH
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-black text-base tracking-tight">{companyBrand1}</span>
                            <span className="text-white/60 text-[8px] font-bold tracking-[0.15em] uppercase">{companyBrand2}</span>
                        </div>
                    </Link>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-gray-100">
                    <form onSubmit={handleSearch} className="flex h-9">
                        <input
                            type="text"
                            placeholder="Tim kiem san pham..."
                            className="flex-1 px-3 bg-gray-50 text-gray-900 text-sm rounded-l-lg border border-r-0 border-gray-200 focus:outline-none focus:border-accent placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="bg-accent text-white px-3.5 rounded-r-lg cursor-pointer">
                            <Search size={16} />
                        </button>
                    </form>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-2 space-y-0.5">
                        <Link to="/" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-red-50 hover:text-accent rounded-lg font-semibold text-sm transition-colors cursor-pointer">
                            <Home size={18} /> Trang chu
                        </Link>
                        <Link to="/products" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-red-50 hover:text-accent rounded-lg font-semibold text-sm transition-colors cursor-pointer">
                            <MenuIcon size={18} /> Danh muc san pham
                        </Link>
                        <Link to="/repairs" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-red-50 hover:text-accent rounded-lg font-semibold text-sm transition-colors cursor-pointer">
                            <Wrench size={18} /> Dich vu sua chua
                        </Link>
                        <Link to="/warranty" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-red-50 hover:text-accent rounded-lg font-semibold text-sm transition-colors cursor-pointer">
                            <Monitor size={18} /> Bao hanh
                        </Link>
                    </div>

                    {/* Categories */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <h4 className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Danh muc</h4>
                        <div className="px-2 space-y-0.5">
                            {categories.slice(0, 8).map((cat) => (
                                <Link
                                    key={cat.id}
                                    to={`/products?categoryId=${cat.id}`}
                                    onClick={onClose}
                                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-accent rounded-lg transition-colors cursor-pointer"
                                >
                                    <span>{cat.name}</span>
                                    <ArrowRight size={13} className="text-gray-300" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Quick links */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <h4 className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ho tro</h4>
                        <div className="px-2 space-y-0.5">
                            <Link to="/contact" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-accent rounded-lg transition-colors cursor-pointer">
                                <Phone size={15} /> Lien he
                            </Link>
                            <Link to="/recruitment" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-accent rounded-lg transition-colors cursor-pointer">
                                <Briefcase size={15} /> Tuyen dung
                            </Link>
                            <Link to="/about" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-accent rounded-lg transition-colors cursor-pointer">
                                <FileText size={15} /> Gioi thieu
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-100 bg-gray-50">
                    {isAuthenticated ? (
                        <div className="flex items-center justify-between">
                            <Link to="/account" onClick={onClose} className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                                <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs">
                                    {user?.fullName.charAt(0)}
                                </div>
                                <span className="truncate max-w-[150px]">{user?.fullName}</span>
                            </Link>
                            <button onClick={handleLogout} className="text-sm text-red-500 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                                <LogOut size={14} /> Dang xuat
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Link to="/login" onClick={onClose} className="flex-1 text-center py-2 bg-accent text-white font-bold rounded-lg text-sm hover:bg-accent-hover transition-colors cursor-pointer">
                                Dang nhap
                            </Link>
                            <Link to="/register" onClick={onClose} className="flex-1 text-center py-2 bg-gray-200 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-300 transition-colors cursor-pointer">
                                Dang ky
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
