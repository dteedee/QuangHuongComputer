import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Users, Wrench, ShieldCheck, Box, BarChart3,
    Receipt, Users2, Settings, MessageSquare, Bell, ChevronLeft, Menu, Search,
    Globe, Power, Shield, Package, Truck, FileText, CreditCard, Percent,
    Building2, Tags, Archive, ClipboardList, UserCog, Lock, Database,
    ChevronDown, ChevronRight, Store, Hammer, Calculator, Megaphone,
    BadgePercent, Gauge, PieChart, LineChart, HelpCircle, Mail, Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../api/sales';

interface MenuItem {
    title: string;
    icon: React.ReactNode;
    path?: string;
    allowedRoles: string[];
    children?: MenuItem[];
    badge?: number;
}

export const BackofficeLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['main', 'admin', 'sales', 'service']);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const roles = user?.roles || [];

    // Fetch stats for badges
    const { data: salesStats } = useQuery({
        queryKey: ['sales-stats-badge'],
        queryFn: async () => {
            try {
                return await salesApi.admin.getStats();
            } catch (error) {
                console.warn('Failed to fetch sales stats for badge', error);
                return null;
            }
        },
        staleTime: 60000 // Refresh every minute
    });

    const pendingOrdersCount = salesStats?.pendingOrders || 0;

    // Menu structure with groups
    const menuGroups = [
        {
            id: 'main',
            title: 'Tổng quan',
            items: [
                { title: 'Dashboard', icon: <LayoutDashboard size={22} />, path: '/backoffice', allowedRoles: ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant'] },
            ]
        },
        {
            id: 'admin',
            title: 'Quản trị viên',
            items: [
                { title: 'Trung tâm Admin', icon: <Shield size={22} />, path: '/backoffice/admin', allowedRoles: ['Admin'] },
                { title: 'Quản lý Người dùng', icon: <Users size={22} />, path: '/backoffice/users', allowedRoles: ['Admin'] },
                { title: 'Quản lý Vai trò', icon: <Lock size={22} />, path: '/backoffice/roles', allowedRoles: ['Admin'] },
                { title: 'Cấu hình Hệ thống', icon: <Settings size={22} />, path: '/backoffice/config', allowedRoles: ['Admin'] },
            ]
        },
        {
            id: 'sales',
            title: 'Kinh doanh',
            items: [
                { title: 'Bán hàng (POS)', icon: <Store size={22} />, path: '/backoffice/pos', allowedRoles: ['Admin', 'Manager', 'Sale'] },
                { title: 'Quản lý Đơn hàng', icon: <Receipt size={22} />, path: '/backoffice/orders', allowedRoles: ['Admin', 'Manager', 'Sale'], badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
                { title: 'Quản lý Sản phẩm', icon: <Package size={22} />, path: '/backoffice/products', allowedRoles: ['Admin', 'Manager'] },
                { title: 'Kho hàng', icon: <Archive size={22} />, path: '/backoffice/inventory', allowedRoles: ['Admin', 'Manager', 'Sale'] },
            ]
        },
        {
            id: 'service',
            title: 'Dịch vụ',
            items: [
                { title: 'Kỹ thuật & Sửa chữa', icon: <Hammer size={22} />, path: '/backoffice/tech', allowedRoles: ['Admin', 'Manager', 'TechnicianInShop', 'TechnicianOnSite'] },
                { title: 'Bảo hành', icon: <ShieldCheck size={22} />, path: '/backoffice/warranty', allowedRoles: ['Admin', 'Manager', 'TechnicianInShop'] },
            ]
        },
        {
            id: 'marketing',
            title: 'Marketing & Báo cáo',
            items: [
                { title: 'CMS / Nội dung', icon: <Megaphone size={22} />, path: '/backoffice/cms', allowedRoles: ['Admin', 'Manager', 'Sale'] },
                { title: 'Báo cáo doanh nghiệp', icon: <BarChart3 size={22} />, path: '/backoffice/reports', allowedRoles: ['Admin', 'Manager'] },
            ]
        }
    ];

    // Filter menu items based on user roles
    const filteredGroups = menuGroups.map(group => ({
        ...group,
        items: group.items.filter(item => item.allowedRoles.some(role => roles.includes(role)))
    })).filter(group => group.items.length > 0);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const isActive = (path: string) => location.pathname === path;

    // Get current page title
    const getCurrentPageTitle = () => {
        for (const group of menuGroups) {
            for (const item of group.items) {
                if (item.path === location.pathname) {
                    return item.title;
                }
            }
        }
        return 'Dashboard';
    };

    return (
        <div className="h-screen bg-gray-50 flex overflow-hidden font-sans admin-area">
            {/* Sidebar */}
            <aside className={`relative h-screen bg-white border-r-2 border-gray-100 transition-all duration-500 ${isSidebarOpen ? 'w-80' : 'w-24'} flex flex-col z-40 shadow-[10px_0_30px_rgba(0,0,0,0.02)] flex-shrink-0`}>
                {/* Logo Area */}
                <div className="p-6 flex items-center gap-4 h-24 border-b-2 border-gray-50 bg-gray-50/10">
                    <motion.div
                        whileHover={{ rotate: -10, scale: 1.1 }}
                        className="w-12 h-12 bg-gray-950 rounded-2xl flex items-center justify-center font-black text-white shadow-2xl shadow-gray-900/40 flex-shrink-0 italic"
                    >
                        QH
                    </motion.div>
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="overflow-hidden"
                            >
                                <h1 className="font-black text-gray-950 text-base leading-none uppercase tracking-tighter italic">Quang Hưởng</h1>
                                <p className="text-[10px] text-red-600 font-black uppercase tracking-[0.2em] mt-1">E-Commerce OS</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Navigation Navigation */}
                <nav className="flex-1 px-4 py-8 overflow-y-auto custom-scrollbar select-none">
                    {filteredGroups.map((group) => (
                        <div key={group.id} className="mb-8">
                            {isSidebarOpen && (
                                <button
                                    onClick={() => toggleGroup(group.id)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-950 transition-colors mb-2"
                                >
                                    <span>{group.title}</span>
                                    <ChevronDown
                                        size={14}
                                        className={`transition-transform duration-300 ${expandedGroups.includes(group.id) ? 'rotate-180 text-gray-950' : ''}`}
                                    />
                                </button>
                            )}
                            <AnimatePresence initial={false}>
                                {(expandedGroups.includes(group.id) || !isSidebarOpen) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-1"
                                    >
                                        {group.items.map((item) => {
                                            const active = isActive(item.path || '');
                                            return (
                                                <Link
                                                    key={item.path}
                                                    to={item.path || '#'}
                                                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative ${active
                                                        ? 'bg-gray-950 text-white shadow-xl shadow-gray-900/30 -translate-x-1 translate-y-[-2px]'
                                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-950'
                                                        }`}
                                                >
                                                    <span className={`${active ? 'text-[#D70018]' : 'text-gray-300 group-hover:text-gray-950'} transition-all flex-shrink-0 group-hover:scale-110`}>
                                                        {item.icon}
                                                    </span>
                                                    {isSidebarOpen && (
                                                        <>
                                                            <span className="text-xs font-black uppercase tracking-tight italic flex-1">{item.title}</span>
                                                            {item.badge && (
                                                                <span className="px-2.5 py-1 text-[10px] font-black bg-[#D70018] text-white rounded-lg shadow-lg shadow-red-500/20">
                                                                    {item.badge}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                    {active && (
                                                        <motion.div
                                                            layoutId="active-sidebar-indicator"
                                                            className="absolute left-0 w-1.5 h-8 bg-[#D70018] rounded-r-full"
                                                        />
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </nav>

                {/* User Profile Container */}
                <div className="p-4 border-t-2 border-gray-50 bg-gray-50/50">
                    <div className={`p-4 rounded-3xl ${isSidebarOpen ? 'bg-white shadow-sm border border-gray-100' : 'bg-transparent'}`}>
                        <div className={`flex items-center gap-4 ${!isSidebarOpen && 'flex-col'}`}>
                            <div className="w-12 h-12 rounded-2xl bg-gray-950 shadow-lg flex items-center justify-center text-sm font-black text-white italic flex-shrink-0">
                                {user?.fullName?.charAt(0) || 'U'}
                            </div>
                            {isSidebarOpen && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-gray-950 truncate uppercase italic tracking-tighter leading-none">{user?.fullName}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/50 animate-pulse" />
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest truncate">{roles[0] || 'Member'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isSidebarOpen ? (
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center gap-3 w-full px-4 py-3 mt-5 bg-gray-50 text-gray-400 hover:text-[#D70018] hover:bg-red-50 transition-all rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] group"
                            >
                                <Power size={16} className="group-hover:rotate-90 transition-transform" />
                                <span>Kết thúc phiên</span>
                            </button>
                        ) : (
                            <button onClick={handleLogout} className="mt-5 text-gray-300 hover:text-red-600 transition-all flex justify-center w-full active:scale-95">
                                <Power size={24} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Workspace Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-[#fafafa]">
                {/* Global Top Header */}
                <header className={`h-24 sticky top-0 bg-white/80 backdrop-blur-xl flex items-center justify-between px-10 transition-all duration-500 z-30 border-b-2 border-gray-50 ${scrolled ? 'shadow-2xl shadow-gray-900/5 h-20' : ''}`}>
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-12 h-12 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-2xl text-gray-950 hover:text-gray-950 transition-all border-2 border-transparent active:scale-90"
                        >
                            <Menu size={22} />
                        </button>

                        {/* Breadcrumbs v2 */}
                        <div className="hidden md:flex items-center gap-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Management</span>
                            <div className="w-5 h-[2px] bg-gray-200 rotate-[120deg]" />
                            <span className="text-sm font-black text-gray-950 uppercase italic tracking-tighter">{getCurrentPageTitle()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Global Search Interface */}
                        <div className="hidden xl:flex items-center bg-gray-50 border-2 border-transparent focus-within:border-gray-950/10 rounded-2xl px-5 h-12 w-80 transition-all group shadow-inner">
                            <Search size={18} className="text-gray-400 group-focus-within:text-[#D70018] transition-colors" />
                            <input
                                type="text"
                                placeholder="Lệnh hệ thống / Tìm kiếm..."
                                className="bg-transparent border-none outline-none text-xs font-bold text-gray-950 px-3 w-full placeholder:text-gray-300"
                            />
                        </div>

                        {/* Fast Actions */}
                        <div className="flex items-center gap-3">
                            <button className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-50 hover:border-gray-100 rounded-2xl text-gray-400 hover:text-gray-950 transition-all relative shadow-sm">
                                <Bell size={20} />
                                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-[#D70018] rounded-full border-2 border-white" />
                            </button>

                            {/* Connectivity Status */}
                            <div className="hidden lg:flex items-center gap-3 bg-white border-2 border-gray-50 px-5 py-2.5 rounded-2xl shadow-sm">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500" />
                                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest italic leading-none">System Online</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Scroll View */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-10 max-w-[1700px] mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
                @keyframes pulse-soft {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.95; transform: scale(0.99); }
                }
                .animate-pulse-soft {
                    animation: pulse-soft 3s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};
