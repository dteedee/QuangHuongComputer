import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Phone, Zap, Monitor, Briefcase, ChevronDown,
    LogOut, User, Settings, Package, Sun, Moon
} from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import type { ConfigurationEntry } from '../../api/systemConfig';
import { getConfigValue } from '../../api/systemConfig';

interface HeaderTopBarProps {
    isScrolled: boolean;
    configs: ConfigurationEntry[];
}

export const HeaderTopBar = ({ isScrolled, configs }: HeaderTopBarProps) => {
    const { isAuthenticated, user, logout } = useAuth();
    const { isDark, toggleMode } = useTheme();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const companyPhone = getConfigValue(configs, 'COMPANY_PHONE', '0904.235.090', (v) => v);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
    };

    const getRoleLabel = (roles: string[] = []) => {
        if (roles.includes('Admin')) return 'Quan tri vien';
        if (roles.includes('Manager')) return 'Quan ly';
        if (roles.includes('Sale')) return 'Nhan vien ban hang';
        if (roles.includes('TechnicianInShop') || roles.includes('TechnicianOnSite')) return 'Ky thuat vien';
        if (roles.includes('Accountant')) return 'Ke toan';
        if (roles.includes('Supplier')) return 'Nha cung cap';
        if (roles.includes('Marketing')) return 'Marketing';
        return 'Khach hang';
    };

    const getDashboardLabel = (roles: string[] = []) => {
        if (roles.includes('Admin')) return 'Quan tri he thong';
        if (roles.includes('Manager')) return 'Bang dieu khien quan ly';
        if (roles.includes('Sale')) return 'Quan ly ban hang';
        if (roles.includes('TechnicianInShop') || roles.includes('TechnicianOnSite')) return 'Bang dieu khien ky thuat';
        if (roles.includes('Accountant')) return 'Quan ly tai chinh';
        if (roles.includes('Supplier')) return 'Quan ly kho hang';
        if (roles.includes('Marketing')) return 'Quan ly marketing';
        return 'Quan tri';
    };

    const isStaffRole = (roles: string[] = []) =>
        roles.some(r => ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier', 'Marketing'].includes(r));

    return (
        <div className={`bg-gray-900 text-gray-300 text-[11px] font-medium hidden md:block transition-all duration-200 ${isScrolled ? 'py-0.5' : 'py-1.5'}`}>
            <div className="max-w-[1400px] mx-auto px-4 flex justify-between items-center">
                <div className="flex items-center gap-5">
                    <a href={`tel:${companyPhone}`} className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                        <Phone size={11} /> Hotline: <span className="font-bold text-white">{companyPhone}</span>
                    </a>
                    <span className="w-px h-3 bg-gray-700" />
                    <Link to="/policy/promotions" className="hover:text-red-400 transition-colors flex items-center gap-1"><Zap size={11} /> Khuyen mai</Link>
                    <Link to="/policy/news" className="hover:text-white transition-colors flex items-center gap-1"><Monitor size={11} /> Tin cong nghe</Link>
                    <Link to="/recruitment" className="hover:text-white transition-colors flex items-center gap-1"><Briefcase size={11} /> Tuyen dung</Link>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleMode}
                        className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                        title="Giao dien Sang/Toi"
                    >
                        {isDark ? <Sun size={13} /> : <Moon size={13} />}
                    </button>

                    <span className="w-px h-3 bg-gray-700" />

                    {isAuthenticated ? (
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                            >
                                <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[9px] font-bold">
                                    {user?.fullName.charAt(0)}
                                </div>
                                {user?.fullName} <ChevronDown size={11} className={`transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showUserMenu && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-100 py-1 z-[100] animate-scale-in">
                                    <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-50 text-accent flex items-center justify-center font-bold text-sm">
                                            {user?.fullName.charAt(0)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm truncate max-w-[140px]">{user?.fullName}</span>
                                            <span className="text-[10px] text-gray-400">{getRoleLabel(user?.roles)}</span>
                                        </div>
                                    </div>
                                    <div className="p-1">
                                        <Link to="/account" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors text-gray-600 cursor-pointer" onClick={() => setShowUserMenu(false)}>
                                            <User size={15} /> Tai khoan cua toi
                                        </Link>
                                        {!isStaffRole(user?.roles) && (
                                            <Link to="/account?tab=orders" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors text-gray-600 cursor-pointer" onClick={() => setShowUserMenu(false)}>
                                                <Package size={15} /> Don hang
                                            </Link>
                                        )}
                                        {isStaffRole(user?.roles) && (
                                            <Link to="/backoffice" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors text-gray-600 cursor-pointer" onClick={() => setShowUserMenu(false)}>
                                                <Settings size={15} /> {getDashboardLabel(user?.roles)}
                                            </Link>
                                        )}
                                    </div>
                                    <div className="h-px bg-gray-100 mx-1" />
                                    <div className="p-1">
                                        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 rounded-lg transition-colors text-rose-600 font-medium cursor-pointer">
                                            <LogOut size={15} /> Dang xuat
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link to="/login" className="hover:text-white transition-colors cursor-pointer">Dang nhap</Link>
                            <Link to="/register" className="hover:text-white transition-colors cursor-pointer">Dang ky</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
