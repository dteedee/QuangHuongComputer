
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Users,
    Wrench, ShieldCheck, Box, BarChart3,
    Receipt, Users2, Settings, MessageSquare, Bell,
    ChevronLeft, Menu, Search, Globe, Power
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export const BackofficeLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const roles = user?.roles || [];

    const menuItems = [
        { title: 'Tổng quan', icon: <LayoutDashboard size={20} />, path: '/backoffice', allowedRoles: ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier'] },
        { title: 'Bán hàng', icon: <ShoppingCart size={20} />, path: '/backoffice/sale', allowedRoles: ['Admin', 'Manager', 'Sale'] },
        { title: 'Kỹ thuật & Sửa chữa', icon: <Wrench size={20} />, path: '/backoffice/tech', allowedRoles: ['Admin', 'Manager', 'TechnicianInShop', 'TechnicianOnSite'] },
        { title: 'Kho hàng', icon: <Box size={20} />, path: '/backoffice/inventory', allowedRoles: ['Admin', 'Manager', 'Sale', 'Supplier'] },
        { title: 'Kế toán', icon: <Receipt size={20} />, path: '/backoffice/accounting', allowedRoles: ['Admin', 'Manager', 'Accountant'] },
        { title: 'Nhân sự & Lương', icon: <Users2 size={20} />, path: '/backoffice/hr', allowedRoles: ['Admin', 'Manager'] },
        { title: 'Bảo hành / RMA', icon: <ShieldCheck size={20} />, path: '/backoffice/warranty', allowedRoles: ['Admin', 'Manager', 'TechnicianInShop'] },
        { title: 'Marketing / CMS', icon: <MessageSquare size={20} />, path: '/backoffice/cms', allowedRoles: ['Admin', 'Manager', 'Sale'] },
        { title: 'Báo cáo', icon: <BarChart3 size={20} />, path: '/backoffice/reports', allowedRoles: ['Admin', 'Manager'] },
        { title: 'Quản lý người dùng', icon: <Users size={20} />, path: '/backoffice/users', allowedRoles: ['Admin'] },
        { title: 'Cấu hình hệ thống', icon: <Settings size={20} />, path: '/backoffice/config', allowedRoles: ['Admin'] },
    ];

    const filteredMenu = menuItems.filter(item =>
        item.allowedRoles.some(role => roles.includes(role))
    );

    const activeItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden font-sans selection:bg-[#D70018] selection:text-white">
            {/* Elegant Sidebar with Glassmorphism */}
            <aside className={`relative h-screen bg-white border-r border-[#EEF2F6] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarOpen ? 'w-72' : 'w-24'} flex flex-col z-[40] shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)]`}>
                <div className="p-6 flex items-center gap-4 h-24 border-b border-gray-50 mb-4">
                    <motion.div
                        whileHover={{ rotate: 10, scale: 1.05 }}
                        className="w-12 h-12 bg-[#D70018] rounded-2xl flex items-center justify-center font-black text-white shadow-xl shadow-red-500/30 flex-shrink-0"
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
                                <h1 className="font-black text-lg text-[#D70018] whitespace-nowrap uppercase italic tracking-tighter leading-none">Quang Hưởng</h1>
                                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-black mt-1">Admin Portal</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {filteredMenu.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${isActive
                                    ? 'bg-red-50 text-[#D70018]'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <span className={`${isActive ? 'text-[#D70018]' : 'text-gray-400 group-hover:text-[#D70018]'} transition-colors duration-300`}>
                                    {item.icon}
                                </span>
                                {isSidebarOpen && <span className={`text-[13px] font-black uppercase tracking-tight ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'} transition-transform duration-300`}>{item.title}</span>}
                                {isActive && (
                                    <motion.div
                                        layoutId="active-indicator"
                                        className="absolute left-0 w-1.5 h-6 bg-[#D70018] rounded-r-full"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto">
                    <div className="bg-gray-50 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-[#D70018]/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />

                        <div className={`flex items-center gap-4 ${!isSidebarOpen && 'flex-col'}`}>
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center text-lg font-black text-[#D70018] flex-shrink-0 group-hover:rotate-12 transition-transform">
                                {user?.fullName?.charAt(0) || 'U'}
                            </div>
                            {isSidebarOpen && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-gray-900 truncate leading-none mb-1.5 uppercase italic">{user?.fullName}</p>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate">{roles[0] || 'Member'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isSidebarOpen && (
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 mt-5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-red-600 hover:border-red-100 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md group/logout"
                            >
                                <Power size={14} className="group-hover/logout:rotate-90 transition-transform" />
                                <span>Đăng xuất hệ thống</span>
                            </button>
                        )}
                        {!isSidebarOpen && (
                            <button onClick={handleLogout} className="mt-4 text-gray-400 hover:text-red-600 transition-colors flex justify-center w-full"><Power size={20} /></button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Modern Header with Glass Effect */}
                <header className={`h-24 sticky top-0 bg-white/80 backdrop-blur-xl flex items-center justify-between px-10 transition-all duration-300 z-[30] border-b border-[#EEF2F6] ${scrolled ? 'shadow-lg shadow-gray-200/50' : ''}`}>
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-12 h-12 flex items-center justify-center bg-gray-50 hover:bg-red-50 rounded-2xl text-gray-400 hover:text-[#D70018] transition-all duration-300 shadow-sm border border-gray-100 active:scale-90"
                        >
                            <Menu size={20} />
                        </button>

                        <div className="hidden lg:flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-5 h-12 w-96 group focus-within:ring-2 focus-within:ring-red-100 transition-all">
                            <Search size={18} className="text-gray-400 group-focus-within:text-[#D70018] transition-colors" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm nhanh hệ thống..."
                                className="bg-transparent border-none outline-none text-xs font-bold text-gray-600 px-4 w-full placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <button className="w-12 h-12 flex items-center justify-center bg-white hover:bg-gray-50 rounded-2xl text-gray-400 transition-all shadow-sm border border-gray-100 relative group">
                                <Globe size={20} className="group-hover:rotate-45 transition-transform" />
                                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-4 border-white translate-x-1 -translate-y-1" />
                            </button>
                            <button className="w-12 h-12 flex items-center justify-center bg-white hover:bg-gray-50 rounded-2xl text-gray-400 transition-all shadow-sm border border-gray-100 relative group">
                                <Bell size={20} className="group-hover:shake" />
                                <span className="absolute top-0 right-0 w-3 h-3 bg-[#D70018] rounded-full border-4 border-white translate-x-1 -translate-y-1" />
                            </button>
                        </div>

                        <div className="bg-[#D70018] text-white px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg shadow-red-500/20 hover:scale-105 transition-transform cursor-pointer group">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic tracking-tighter">Live Monitor</span>
                        </div>
                    </div>
                </header>

                {/* Content with Smooth Animations */}
                <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar">
                    <div className="p-8 md:p-12 max-w-[1600px] mx-auto min-h-screen">
                        {/* Breadcrumb / Top Bar */}
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                <span className="hover:text-gray-900 transition-colors cursor-pointer">Hệ thống</span>
                                <ChevronLeft size={14} className="rotate-180 text-gray-200" />
                                <span className="text-gray-900 italic leading-none border-b-2 border-[#D70018]">{activeItem?.title}</span>
                            </div>
                            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-8 h-8 rounded-xl border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500`}>U{i}</div>
                                    ))}
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pr-4">+12 Users Online</span>
                            </div>
                        </div>

                        <Outlet />
                    </div>
                </div >
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
                @keyframes shake {
                    0%, 100% { transform: rotate(0); }
                    25% { transform: rotate(-10deg); }
                    75% { transform: rotate(10deg); }
                }
                .group-hover\\:shake {
                    animation: shake 0.5s ease-in-out infinite;
                }
            `}</style>
        </div >
    );
};
