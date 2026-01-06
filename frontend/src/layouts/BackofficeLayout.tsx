
import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Users, LogOut,
    Wrench, ShieldCheck, Box, BarChart3,
    Receipt, Users2, Settings, MessageSquare, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export const BackofficeLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const roles = user?.roles || [];

    const menuItems = [
        {
            title: 'Overview',
            icon: <LayoutDashboard size={20} />,
            path: '/backoffice',
            allowedRoles: ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier']
        },
        {
            title: 'Sale Portal',
            icon: <ShoppingCart size={20} />,
            path: '/backoffice/sale',
            allowedRoles: ['Admin', 'Manager', 'Sale']
        },
        {
            title: 'Technician Portal',
            icon: <Wrench size={20} />,
            path: '/backoffice/tech',
            allowedRoles: ['Admin', 'Manager', 'TechnicianInShop', 'TechnicianOnSite']
        },
        {
            title: 'Inventory',
            icon: <Box size={20} />,
            path: '/backoffice/inventory',
            allowedRoles: ['Admin', 'Manager', 'Sale', 'Supplier']
        },
        {
            title: 'Accounting',
            icon: <Receipt size={20} />,
            path: '/backoffice/accounting',
            allowedRoles: ['Admin', 'Manager', 'Accountant']
        },
        {
            title: 'HR & Payroll',
            icon: <Users2 size={20} />,
            path: '/backoffice/hr',
            allowedRoles: ['Admin', 'Manager']
        },
        {
            title: 'Warranty / RMA',
            icon: <ShieldCheck size={20} />,
            path: '/backoffice/warranty',
            allowedRoles: ['Admin', 'Manager', 'TechnicianInShop']
        },
        {
            title: 'CMS / Marketing',
            icon: <MessageSquare size={20} />,
            path: '/backoffice/cms',
            allowedRoles: ['Admin', 'Manager', 'Sale']
        },
        {
            title: 'Reports',
            icon: <BarChart3 size={20} />,
            path: '/backoffice/reports',
            allowedRoles: ['Admin', 'Manager']
        },
        {
            title: 'User Management',
            icon: <Users size={20} />,
            path: '/backoffice/users',
            allowedRoles: ['Admin']
        },
        {
            title: 'System Config',
            icon: <Settings size={20} />,
            path: '/backoffice/config',
            allowedRoles: ['Admin']
        },
    ];

    const filteredMenu = menuItems.filter(item =>
        item.allowedRoles.some(role => roles.includes(role))
    );

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex overflow-hidden">
            {/* Sidebar */}
            <aside className={`bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">Q</div>
                    {isSidebarOpen && (
                        <div>
                            <h1 className="font-bold text-lg leading-tight text-white">Quang Hưởng</h1>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Backoffice</p>
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {filteredMenu.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all group active:scale-95"
                        >
                            <span className="text-slate-400 group-hover:text-blue-400 transition-colors">
                                {item.icon}
                            </span>
                            {isSidebarOpen && <span className="text-sm font-medium">{item.title}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <div className={`flex items-center gap-3 p-3 rounded-xl bg-white/5 ${!isSidebarOpen && 'justify-center'}`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                            {user?.fullName?.charAt(0) || 'U'}
                        </div>
                        {isSidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{user?.fullName}</p>
                                <p className="text-[10px] text-slate-500 truncate">{roles[0]}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all ${!isSidebarOpen && 'justify-center'}`}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span className="text-sm font-medium">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-16 border-b border-slate-800 bg-slate-900/30 backdrop-blur-md flex items-center justify-between px-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
                        >
                            <LayoutDashboard size={20} />
                        </button>
                        <div className="h-4 w-[1px] bg-slate-800" />
                        <h2 className="text-sm font-medium text-slate-400">Dashboard Overview</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                                <Bell size={20} />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0f172a]" />
                            </button>
                        </div>
                        <div className="h-4 w-[1px] bg-slate-800" />
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-xs font-semibold text-white">Status: Online</p>
                                <p className="text-[10px] text-green-500 font-bold uppercase tracking-tighter">System Normal</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-[#0f172a] custom-scrollbar">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Outlet />
                    </div>
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155;
                }
            `}</style>
        </div>
    );
};
