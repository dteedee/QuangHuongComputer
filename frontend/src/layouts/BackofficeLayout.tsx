import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Package, Receipt, Wrench, ShieldCheck, Box, BarChart3,
    Users, Settings, Shield, Lock, Archive, Store, Hammer, Megaphone,
    Bell, Menu, Search, Power, X, ChevronDown, ChevronRight, UserCog, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../api/sales';

export const BackofficeLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['sales', 'admin']);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 1024) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { data: salesStats } = useQuery({
        queryKey: ['sales-stats-badge'],
        queryFn: () => salesApi.admin.getStats(),
        staleTime: 60000
    });

    const pendingCount = salesStats?.pendingOrders || 0;
    const roles = user?.roles || [];

    const menuGroups = [
        {
            id: 'sales',
            title: 'Kinh doanh',
            items: [
                { title: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/backoffice', allowedRoles: ['Admin', 'Manager', 'Sale'] },
                { title: 'Bán hàng (POS)', icon: <Store size={20} />, path: '/backoffice/pos', allowedRoles: ['Admin', 'Manager', 'Sale'] },
                { title: 'Đơn hàng', icon: <Receipt size={20} />, path: '/backoffice/orders', allowedRoles: ['Admin', 'Manager', 'Sale'], badge: pendingCount > 0 ? pendingCount : 0 },
                { title: 'Sản phẩm', icon: <Package size={20} />, path: '/backoffice/products', allowedRoles: ['Admin', 'Manager'] },
                { title: 'Kho hàng', icon: <Archive size={20} />, path: '/backoffice/inventory', allowedRoles: ['Admin', 'Manager'] },
            ]
        },
        {
            id: 'service',
            title: 'Dịch vụ & Kỹ thuật',
            items: [
                { title: 'Sửa chữa', icon: <Hammer size={20} />, path: '/backoffice/tech', allowedRoles: ['Admin', 'Manager', 'TechnicianInShop', 'TechnicianOnSite'] },
                { title: 'Bảo hành', icon: <ShieldCheck size={20} />, path: '/backoffice/warranty', allowedRoles: ['Admin', 'Manager', 'TechnicianInShop'] },
            ]
        },
        {
            id: 'finance_hr',
            title: 'Tài chính & Nhân sự',
            items: [
                { title: 'Tài chính - Kế toán', icon: <Receipt size={20} />, path: '/backoffice/accounting', allowedRoles: ['Admin', 'Manager', 'Accountant'] },
                { title: 'Nhân sự (HR)', icon: <Users size={20} />, path: '/backoffice/hr', allowedRoles: ['Admin', 'Manager', 'Accountant'] },
            ]
        },
        {
            id: 'content',
            title: 'Nội dung & CMS',
            items: [
                { title: 'Quản lý Nội dung', icon: <FileText size={20} />, path: '/backoffice/cms', allowedRoles: ['Admin', 'Manager', 'Sale'] },
            ]
        },
        {
            id: 'admin',
            title: 'Hệ thống',
            items: [
                { title: 'Người dùng', icon: <Users size={20} />, path: '/backoffice/users', allowedRoles: ['Admin'] },
                { title: 'Vai trò & Quyền', icon: <Lock size={20} />, path: '/backoffice/roles', allowedRoles: ['Admin'] },
                { title: 'Cấu hình', icon: <Settings size={20} />, path: '/backoffice/config', allowedRoles: ['Admin'] },
                { title: 'Báo cáo', icon: <BarChart3 size={20} />, path: '/backoffice/reports', allowedRoles: ['Admin', 'Manager'] },
            ]
        }
    ];

    const filteredGroups = menuGroups.map(g => ({
        ...g,
        items: g.items.filter(i => i.allowedRoles.some(r => roles.includes(r)))
    })).filter(g => g.items.length > 0);

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const isActive = (path: string) => location.pathname === path;

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-[#fcfcfc]">
            {/* Elegant Branding */}
            <div className="px-8 py-10 flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-black shadow-lg">QH</div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 leading-none uppercase tracking-tighter">Quang Hưởng</span>
                    <span className="text-[10px] font-bold text-[#D70018] uppercase tracking-widest mt-1">Management Platform</span>
                </div>
            </div>

            {/* Nav List */}
            <div className="flex-1 px-4 space-y-8 overflow-y-auto scrollbar-hide">
                {filteredGroups.map(group => (
                    <div key={group.id} className="space-y-1">
                        <button
                            onClick={() => toggleGroup(group.id)}
                            className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2 hover:text-gray-900 transition-colors"
                        >
                            {group.title}
                            <ChevronDown size={14} className={`transition-transform ${expandedGroups.includes(group.id) ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                            {expandedGroups.includes(group.id) && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-1">
                                    {group.items.map(item => {
                                        const active = isActive(item.path);
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all relative ${active ? 'bg-white shadow-md text-gray-900 ring-1 ring-gray-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                                            >
                                                <span className={`${active ? 'text-[#D70018]' : 'text-gray-300'}`}>{item.icon}</span>
                                                <span className="text-sm font-semibold">{item.title}</span>
                                                {item.badge ? (
                                                    <span className="ml-auto bg-[#D70018] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{item.badge}</span>
                                                ) : active && <ChevronRight size={14} className="ml-auto text-gray-300" />}
                                            </Link>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* Bottom User Section */}
            <div className="p-4 border-t border-gray-100 bg-white space-y-3">
                <Link to="/" className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#D70018] transition-colors shadow-lg shadow-gray-200">
                    <Store size={14} /> Quay về trang chủ
                </Link>

                <div className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50/50">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                        {user?.fullName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{user?.fullName}</p>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{roles[0]}</p>
                    </div>
                    <button onClick={() => { logout(); navigate('/login'); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Power size={18} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-screen bg-[#FDFDFD] flex overflow-hidden">
            {/* Sidebar Desktop */}
            <aside className={`hidden lg:block transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'} border-r border-gray-100 z-50`}>
                <SidebarContent />
            </aside>

            {/* Sidebar Mobile */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50" />
                        <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="lg:hidden fixed inset-y-0 left-0 w-72 z-[60] shadow-2xl">
                            <SidebarContent />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Section */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 z-40 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100">
                            <Menu size={20} />
                        </button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:flex w-10 h-10 items-center justify-center bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all">
                            <Menu size={18} />
                        </button>
                        <div className="hidden sm:flex items-center gap-3">
                            <Search className="text-gray-300" size={18} />
                            <input type="text" placeholder="Tìm kiếm nhanh..." className="bg-transparent border-none outline-none text-sm font-medium text-gray-900 placeholder:text-gray-300 w-48 lg:w-64" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 relative text-gray-400 hover:text-gray-900 transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white" />
                        </button>
                        <div className="w-px h-6 bg-gray-100 mx-2" />
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">Live Status</span>
                        </div>
                    </div>
                </header>

                {/* Content View */}
                <main className="flex-1 overflow-y-auto bg-[#FDFDFD]">
                    <div className="p-6 lg:p-10 max-w-[1700px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
            `}</style>
        </div>
    );
};
