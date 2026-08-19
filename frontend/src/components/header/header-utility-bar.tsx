import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Phone, MapPin, LifeBuoy, PackageSearch, ChevronDown,
    LogOut, User, Settings, Package, Sun, Moon
} from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import type { ConfigurationEntry } from '../../api/systemConfig';
import { getConfigValue } from '../../api/systemConfig';

interface HeaderUtilityBarProps {
    isScrolled: boolean;
    configs: ConfigurationEntry[];
}

/**
 * Utility bar trắng (34px) theo hacom.vn: hotline | tìm cửa hàng | hỗ trợ | tra cứu đơn hàng | tài khoản.
 * Ẩn khi cuộn để header thu gọn (sticky compact).
 */
export const HeaderUtilityBar = ({ isScrolled, configs }: HeaderUtilityBarProps) => {
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

    const handleLogout = () => { logout(); setShowUserMenu(false); };

    const getRoleLabel = (roles: string[] = []) => {
        if (roles.includes('Admin')) return 'Quản trị viên';
        if (roles.includes('Manager')) return 'Quản lý';
        if (roles.includes('Sale')) return 'Nhân viên bán hàng';
        if (roles.includes('TechnicianInShop') || roles.includes('TechnicianOnSite')) return 'Kỹ thuật viên';
        if (roles.includes('Accountant')) return 'Kế toán';
        if (roles.includes('Supplier')) return 'Nhà cung cấp';
        if (roles.includes('Marketing')) return 'Marketing';
        return 'Khách hàng';
    };

    const getDashboardLabel = (roles: string[] = []) => {
        if (roles.includes('Admin')) return 'Quản trị hệ thống';
        if (roles.includes('Manager')) return 'Bảng điều khiển quản lý';
        if (roles.includes('Sale')) return 'Quản lý bán hàng';
        if (roles.includes('TechnicianInShop') || roles.includes('TechnicianOnSite')) return 'Bảng điều khiển kỹ thuật';
        if (roles.includes('Accountant')) return 'Quản lý tài chính';
        if (roles.includes('Supplier')) return 'Quản lý kho hàng';
        if (roles.includes('Marketing')) return 'Quản lý marketing';
        return 'Quản trị';
    };

    const isStaffRole = (roles: string[] = []) =>
        roles.some(r => ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier', 'Marketing'].includes(r));

    return (
        <div className={`bg-white text-gray-600 text-[12px] font-medium hidden md:block border-b border-gray-100 overflow-hidden transition-all duration-200 ${isScrolled ? 'max-h-0 py-0 opacity-0' : 'max-h-9 py-1.5 opacity-100'}`}>
            <div className="max-w-[1400px] mx-auto px-4 flex justify-between items-center">
                <div className="flex items-center gap-5">
                    <a href={`tel:${companyPhone}`} className="flex items-center gap-1.5 hover:text-accent transition-colors cursor-pointer">
                        <Phone size={12} /> Gọi mua hàng: <span className="font-bold text-accent">{companyPhone}</span>
                    </a>
                    <span className="w-px h-3 bg-gray-200" />
                    <Link to="/stores" className="hover:text-accent transition-colors flex items-center gap-1 cursor-pointer"><MapPin size={12} /> Tìm cửa hàng</Link>
                    <Link to="/support" className="hover:text-accent transition-colors flex items-center gap-1 cursor-pointer"><LifeBuoy size={12} /> Hỗ trợ</Link>
                    <Link to="/account/orders" className="hover:text-accent transition-colors flex items-center gap-1 cursor-pointer"><PackageSearch size={12} /> Tra cứu đơn hàng</Link>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={toggleMode} className="hover:text-accent transition-colors flex items-center gap-1 cursor-pointer" title="Giao diện Sáng/Tối">
                        {isDark ? <Sun size={13} /> : <Moon size={13} />}
                    </button>

                    <span className="w-px h-3 bg-gray-200" />

                    {isAuthenticated ? (
                        <div className="relative" ref={userMenuRef}>
                            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-1.5 hover:text-accent transition-colors cursor-pointer">
                                <div className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px] font-bold">
                                    {user?.fullName.charAt(0)}
                                </div>
                                {user?.fullName} <ChevronDown size={11} className={`transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showUserMenu && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white text-gray-800 rounded-xl shadow-large border border-gray-100 py-1 z-[100] animate-scale-in">
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
                                            <User size={15} /> Tài khoản của tôi
                                        </Link>
                                        {!isStaffRole(user?.roles) && (
                                            <Link to="/account?tab=orders" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors text-gray-600 cursor-pointer" onClick={() => setShowUserMenu(false)}>
                                                <Package size={15} /> Đơn hàng
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
                                            <LogOut size={15} /> Đăng xuất
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link to="/login" className="hover:text-accent transition-colors cursor-pointer">Đăng nhập</Link>
                            <Link to="/register" className="hover:text-accent transition-colors cursor-pointer">Đăng ký</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
