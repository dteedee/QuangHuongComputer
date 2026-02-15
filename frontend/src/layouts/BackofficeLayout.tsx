import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Package, Receipt, Wrench, ShieldCheck, Box, BarChart3,
    Users, Settings, Lock, Archive, Store, Hammer, Bell, Menu, Search,
    Power, ChevronDown, ChevronRight, FileText, Target, UserPlus, Mail,
    Zap, Ticket, Sun, Moon, Monitor, Palette, ChevronLeft, X, Command,
    Calendar, Clock, TrendingUp, Activity, Sparkles, Gift, Star, Building2,
    Truck, CreditCard, MessageSquare, Headphones, Globe, Languages, Eye,
    Volume2, VolumeX, Check, PanelLeftClose, PanelLeft, Wallet, Calculator,
    UserCheck, Briefcase, ClipboardList, AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme, accentColors, type AccentColor, type ThemeMode } from '../context/ThemeContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../api/sales';
import { useNotifications, type Notification } from '../hooks/useNotifications';

// Keyboard shortcut hook
const useKeyboardShortcut = (key: string, callback: () => void, ctrl = false, shift = false) => {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === key.toLowerCase() &&
                e.ctrlKey === ctrl &&
                e.shiftKey === shift) {
                e.preventDefault();
                callback();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [key, callback, ctrl, shift]);
};

export const BackofficeLayout = () => {
    const { user, logout } = useAuth();
    const { isDark, toggleMode, accent, setAccent, colors, sidebarCollapsed, setSidebarCollapsed, mode, setMode } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [initialized, setInitialized] = useState(false);

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Keyboard shortcuts
    useKeyboardShortcut('k', () => setShowCommandPalette(true), true);
    useKeyboardShortcut('b', () => setSidebarCollapsed(!sidebarCollapsed), true);
    useKeyboardShortcut('/', () => searchInputRef.current?.focus());

    const { data: salesStats } = useQuery({
        queryKey: ['sales-stats-badge'],
        queryFn: () => salesApi.admin.getStats(),
        staleTime: 60000
    });

    const pendingCount = salesStats?.pendingOrders || 0;
    const roles = user?.roles || [];

    // Menu configuration with icons and colors
    const menuGroups = [
        {
            id: 'sales',
            title: 'Kinh doanh',
            icon: <TrendingUp size={16} />,
            color: 'text-blue-500',
            items: [
                { title: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/backoffice', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Tổng quan hệ thống' },
                { title: 'Bán hàng (POS)', icon: <Store size={20} />, path: '/backoffice/pos', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Quầy thu ngân' },
                { title: 'Đơn hàng', icon: <Receipt size={20} />, path: '/backoffice/orders', allowedRoles: ['Admin', 'Manager', 'Sale'], badge: pendingCount > 0 ? pendingCount : 0, description: 'Quản lý đơn hàng' },
                { title: 'Sản phẩm', icon: <Package size={20} />, path: '/backoffice/products', allowedRoles: ['Admin', 'Manager'], description: 'Danh sách sản phẩm' },
                { title: 'Danh mục & Hãng', icon: <Archive size={20} />, path: '/backoffice/categories', allowedRoles: ['Admin', 'Manager'], description: 'Phân loại sản phẩm' },
                { title: 'Kho hàng', icon: <Box size={20} />, path: '/backoffice/inventory', allowedRoles: ['Admin', 'Manager', 'Supplier'], description: 'Quản lý tồn kho' },
            ]
        },
        {
            id: 'service',
            title: 'Dịch vụ & Kỹ thuật',
            icon: <Wrench size={16} />,
            color: 'text-orange-500',
            items: [
                { title: 'Sửa chữa', icon: <Hammer size={20} />, path: '/backoffice/tech', allowedRoles: ['Admin', 'Manager', 'TechnicianInShop', 'TechnicianOnSite'], description: 'Quản lý sửa chữa' },
                { title: 'Bảo hành', icon: <ShieldCheck size={20} />, path: '/backoffice/warranty', allowedRoles: ['Admin', 'Manager', 'TechnicianInShop'], description: 'Theo dõi bảo hành' },
            ]
        },
        {
            id: 'finance_hr',
            title: 'Tài chính & Nhân sự',
            icon: <Calculator size={16} />,
            color: 'text-emerald-500',
            items: [
                { title: 'Tài chính', icon: <Wallet size={20} />, path: '/backoffice/accounting', allowedRoles: ['Admin', 'Manager', 'Accountant'], description: 'Kế toán tài chính' },
                { title: 'Nhân sự', icon: <Briefcase size={20} />, path: '/backoffice/hr', allowedRoles: ['Admin', 'Manager', 'Accountant'], description: 'Quản lý nhân sự' },
                { title: 'Tuyển dụng', icon: <UserCheck size={20} />, path: '/backoffice/hr/recruitment', allowedRoles: ['Admin', 'Manager'], description: 'Tuyển dụng nhân viên' },
            ]
        },
        {
            id: 'content',
            title: 'Nội dung & Marketing',
            icon: <Sparkles size={16} />,
            color: 'text-pink-500',
            items: [
                { title: 'Quản lý Nội dung', icon: <FileText size={20} />, path: '/backoffice/cms', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Bài viết & trang' },
                { title: 'Flash Sales', icon: <Zap size={20} />, path: '/admin/flash-sales', allowedRoles: ['Admin', 'Manager'], description: 'Giảm giá chớp nhoáng' },
                { title: 'Mã giảm giá', icon: <Ticket size={20} />, path: '/backoffice/coupons', allowedRoles: ['Admin', 'Manager'], description: 'Voucher & coupon' },
                { title: 'Đánh giá', icon: <Star size={20} />, path: '/backoffice/reviews', allowedRoles: ['Admin', 'Manager'], description: 'Review sản phẩm' },
            ]
        },
        {
            id: 'crm',
            title: 'CRM',
            icon: <Users size={16} />,
            color: 'text-violet-500',
            items: [
                { title: 'Tổng quan CRM', icon: <LayoutDashboard size={20} />, path: '/backoffice/crm', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Dashboard CRM' },
                { title: 'Khách hàng', icon: <Users size={20} />, path: '/backoffice/crm/customers', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Quản lý khách hàng' },
                { title: 'Leads', icon: <UserPlus size={20} />, path: '/backoffice/crm/leads', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Khách tiềm năng' },
                { title: 'Pipeline', icon: <Target size={20} />, path: '/backoffice/crm/leads/pipeline', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Kanban leads' },
                { title: 'Phân nhóm', icon: <ClipboardList size={20} />, path: '/backoffice/crm/segments', allowedRoles: ['Admin', 'Manager'], description: 'Phân loại khách hàng' },
                { title: 'Campaigns', icon: <Mail size={20} />, path: '/backoffice/crm/campaigns', allowedRoles: ['Admin', 'Manager'], description: 'Email marketing' },
            ]
        },
        {
            id: 'admin',
            title: 'Hệ thống',
            icon: <Settings size={16} />,
            color: 'text-gray-500',
            items: [
                { title: 'Người dùng', icon: <Users size={20} />, path: '/backoffice/users', allowedRoles: ['Admin'], description: 'Quản lý tài khoản' },
                { title: 'Vai trò & Quyền', icon: <Lock size={20} />, path: '/backoffice/roles', allowedRoles: ['Admin'], description: 'Phân quyền' },
                { title: 'Cấu hình', icon: <Settings size={20} />, path: '/backoffice/config', allowedRoles: ['Admin'], description: 'Cài đặt hệ thống' },
                { title: 'Báo cáo', icon: <BarChart3 size={20} />, path: '/backoffice/reports', allowedRoles: ['Admin', 'Manager'], description: 'Thống kê & báo cáo' },
            ]
        }
    ];

    const filteredGroups = menuGroups.map(g => ({
        ...g,
        items: g.items.filter(i => i.allowedRoles.some(r => roles.includes(r)))
    })).filter(g => g.items.length > 0);

    // Auto-expand the group containing the current route
    useEffect(() => {
        const currentPath = location.pathname;
        const groupsToExpand: string[] = [];

        filteredGroups.forEach(group => {
            const hasActiveItem = group.items.some(item =>
                currentPath === item.path || currentPath.startsWith(item.path + '/')
            );
            if (hasActiveItem) {
                groupsToExpand.push(group.id);
            }
        });

        // On first load, expand all groups with active items
        if (!initialized) {
            setExpandedGroups(groupsToExpand.length > 0 ? groupsToExpand : ['sales']);
            setInitialized(true);
        } else {
            // When navigating, ensure the active group is expanded (don't collapse others)
            setExpandedGroups(prev => {
                const newGroups = [...prev];
                groupsToExpand.forEach(g => {
                    if (!newGroups.includes(g)) {
                        newGroups.push(g);
                    }
                });
                return newGroups;
            });
        }
    }, [location.pathname, initialized]);

    // All items for command palette search
    const allItems = filteredGroups.flatMap(g => g.items.map(i => ({ ...i, group: g.title })));
    const filteredItems = searchQuery
        ? allItems.filter(i =>
            i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : allItems;

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Check if a menu item is active (exact match or parent route)
    // Priority: exact match > prefix match (only if no more specific match exists)
    const isActive = (path: string) => {
        const currentPath = location.pathname;

        // Exact match for root backoffice
        if (path === '/backoffice') {
            return currentPath === '/backoffice';
        }

        // Exact match
        if (currentPath === path) return true;

        // Prefix match - only if there's no more specific menu item that matches
        if (currentPath.startsWith(path + '/')) {
            // Check if there's a more specific menu item that also matches
            const allMenuPaths = filteredGroups.flatMap(g => g.items.map(i => i.path));
            const hasMoreSpecificMatch = allMenuPaths.some(menuPath =>
                menuPath !== path &&
                menuPath.startsWith(path + '/') &&
                (currentPath === menuPath || currentPath.startsWith(menuPath + '/'))
            );
            return !hasMoreSpecificMatch;
        }

        return false;
    };

    // Check if a group contains the active route
    const isGroupActive = (groupId: string) => {
        const group = filteredGroups.find(g => g.id === groupId);
        if (!group) return false;
        return group.items.some(item => isActive(item.path));
    };

    // Notifications using hook based on user roles
    const {
        notifications,
        loading: notificationsLoading,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refresh: refreshNotifications
    } = useNotifications({
        roles: user?.roles || [],
        refreshInterval: 120000 // 2 minutes
    });

    // Get icon for notification type
    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'order': return <Receipt size={16} className="text-blue-500" />;
            case 'repair': return <Wrench size={16} className="text-orange-500" />;
            case 'warranty': return <ShieldCheck size={16} className="text-green-500" />;
            case 'inventory': return <Box size={16} className="text-purple-500" />;
            case 'crm': return <Users size={16} className="text-pink-500" />;
            default: return <Bell size={16} className="text-gray-500" />;
        }
    };

    // Get priority color
    const getPriorityColor = (priority?: Notification['priority']) => {
        switch (priority) {
            case 'high': return 'border-l-red-500';
            case 'medium': return 'border-l-orange-500';
            default: return 'border-l-gray-300';
        }
    };

    // Quick Actions
    const quickActions = [
        { icon: <Store size={20} />, title: 'Mở POS', path: '/backoffice/pos', color: 'bg-blue-500' },
        { icon: <Package size={20} />, title: 'Thêm sản phẩm', path: '/backoffice/products?action=new', color: 'bg-green-500' },
        { icon: <Receipt size={20} />, title: 'Tạo đơn hàng', path: '/backoffice/orders?action=new', color: 'bg-purple-500' },
        { icon: <UserPlus size={20} />, title: 'Thêm khách hàng', path: '/backoffice/crm/customers?action=new', color: 'bg-orange-500' },
    ];

    // Theme mode options
    const themeModes: { value: ThemeMode; label: string; icon: JSX.Element }[] = [
        { value: 'light', label: 'Sáng', icon: <Sun size={16} /> },
        { value: 'dark', label: 'Tối', icon: <Moon size={16} /> },
        { value: 'system', label: 'Hệ thống', icon: <Monitor size={16} /> },
    ];

    // Accent colors
    const accentColorOptions: { value: AccentColor; label: string; color: string }[] = [
        { value: 'red', label: 'Đỏ', color: 'bg-red-500' },
        { value: 'blue', label: 'Xanh dương', color: 'bg-blue-500' },
        { value: 'green', label: 'Xanh lá', color: 'bg-emerald-500' },
        { value: 'purple', label: 'Tím', color: 'bg-purple-500' },
        { value: 'orange', label: 'Cam', color: 'bg-orange-500' },
        { value: 'pink', label: 'Hồng', color: 'bg-pink-500' },
        { value: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
        { value: 'amber', label: 'Vàng', color: 'bg-amber-500' },
    ];

    const SidebarContent = () => (
        <div className={`flex flex-col h-full transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            {/* Logo & Brand */}
            <div className={`px-6 py-6 flex items-center gap-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg bg-gradient-to-br ${colors.gradient}`}
                >
                    QH
                </div>
                {!sidebarCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col"
                    >
                        <span className={`text-sm font-bold leading-none uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Quang Hưởng
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: colors.primary }}>
                            Management
                        </span>
                    </motion.div>
                )}
            </div>

            {/* Quick Stats */}
            {!sidebarCollapsed && (
                <div className={`px-4 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <div className="grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <div className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Đơn chờ</div>
                            <div className="text-xl font-black" style={{ color: colors.primary }}>{pendingCount}</div>
                        </div>
                        <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <div className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Doanh thu</div>
                            <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {salesStats?.monthRevenue ? `${(salesStats.monthRevenue / 1000000).toFixed(1)}M` : '0'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-hide">
                {filteredGroups.map(group => {
                    const groupActive = isGroupActive(group.id);
                    const isExpanded = expandedGroups.includes(group.id);

                    return (
                    <div key={group.id} className="space-y-1">
                        <button
                            onClick={() => toggleGroup(group.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                                groupActive
                                    ? isDark
                                        ? 'text-white bg-gray-800/50'
                                        : 'text-gray-900 bg-gray-100/50'
                                    : isDark
                                        ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className={groupActive ? '' : group.color} style={groupActive ? { color: colors.primary } : {}}>
                                    {group.icon}
                                </span>
                                {!sidebarCollapsed && group.title}
                            </span>
                            {!sidebarCollapsed && (
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            )}
                        </button>

                        <AnimatePresence initial={false}>
                            {(isExpanded || sidebarCollapsed) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="overflow-hidden space-y-1"
                                >
                                    {group.items.map(item => {
                                        const active = isActive(item.path);
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                title={sidebarCollapsed ? item.title : undefined}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group ${active
                                                    ? isDark
                                                        ? 'bg-gray-800 text-white'
                                                        : 'bg-gray-100 text-gray-900'
                                                    : isDark
                                                        ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                    }`}
                                                style={active ? { borderLeft: `3px solid ${colors.primary}` } : {}}
                                            >
                                                <span
                                                    className={`flex-shrink-0 ${active ? '' : isDark ? 'text-gray-500' : 'text-gray-400'}`}
                                                    style={active ? { color: colors.primary } : {}}
                                                >
                                                    {item.icon}
                                                </span>
                                                {!sidebarCollapsed && (
                                                    <>
                                                        <span className="text-sm font-medium flex-1">{item.title}</span>
                                                        {item.badge ? (
                                                            <span
                                                                className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                                style={{ backgroundColor: colors.primary }}
                                                            >
                                                                {item.badge}
                                                            </span>
                                                        ) : active ? (
                                                            <ChevronRight size={14} className="text-gray-400" />
                                                        ) : null}
                                                    </>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    );
                })}
            </div>

            {/* User Section */}
            <div className={`p-4 border-t ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                {!sidebarCollapsed && (
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Store size={14} /> Quay về trang chủ
                    </Link>
                )}

                <div className={`flex items-center gap-3 p-3 rounded-xl mt-3 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white"
                        style={{ backgroundColor: colors.primary }}
                    >
                        {user?.fullName?.charAt(0)}
                    </div>
                    {!sidebarCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {user?.fullName}
                                </p>
                                <p className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {roles[0]}
                                </p>
                            </div>
                            <button
                                onClick={() => { logout(); navigate('/login'); }}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'}`}
                            >
                                <Power size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`h-screen flex overflow-hidden transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
            {/* Sidebar Desktop */}
            <aside
                className={`hidden lg:block transition-all duration-300 border-r ${isDark ? 'border-gray-800' : 'border-gray-200'} ${sidebarCollapsed ? 'w-20' : 'w-72'}`}
            >
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            className="lg:hidden fixed inset-y-0 left-0 w-72 z-[60] shadow-2xl"
                        >
                            <SidebarContent />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className={`h-16 flex items-center justify-between px-4 lg:px-6 border-b transition-colors duration-300 ${isDark
                    ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl'
                    : 'bg-white/80 border-gray-200 backdrop-blur-xl'
                    }`}>
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className={`lg:hidden p-2 rounded-lg ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                        >
                            <Menu size={20} />
                        </button>

                        {/* Sidebar Toggle (Desktop) */}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className={`hidden lg:flex p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                            title="Toggle Sidebar (Ctrl+B)"
                        >
                            {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
                        </button>

                        {/* Search */}
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-gray-50 border-gray-200'
                            }`}>
                            <Search size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Tìm kiếm... (Ctrl+K)"
                                className={`bg-transparent border-none outline-none text-sm w-48 lg:w-64 ${isDark
                                    ? 'text-white placeholder:text-gray-500'
                                    : 'text-gray-900 placeholder:text-gray-400'
                                    }`}
                                onClick={() => setShowCommandPalette(true)}
                                readOnly
                            />
                            <kbd className={`hidden lg:inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${isDark
                                ? 'bg-gray-700 text-gray-400'
                                : 'bg-gray-200 text-gray-500'
                                }`}>
                                /
                            </kbd>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Quick Actions */}
                        <div className="relative">
                            <button
                                onClick={() => setShowQuickActions(!showQuickActions)}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                                title="Quick Actions"
                            >
                                <Zap size={20} />
                            </button>

                            <AnimatePresence>
                                {showQuickActions && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark
                                            ? 'bg-gray-900 border-gray-800'
                                            : 'bg-white border-gray-200'
                                            }`}
                                    >
                                        <div className={`p-2 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <p className={`text-xs font-bold uppercase tracking-wider px-2 py-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Quick Actions
                                            </p>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            {quickActions.map((action, i) => (
                                                <Link
                                                    key={i}
                                                    to={action.path}
                                                    onClick={() => setShowQuickActions(false)}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isDark
                                                        ? 'hover:bg-gray-800 text-gray-300'
                                                        : 'hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                >
                                                    <span className={`p-1.5 rounded-lg text-white ${action.color}`}>{action.icon}</span>
                                                    <span className="text-sm font-medium">{action.title}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`p-2 rounded-lg relative transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span
                                        className="absolute top-1 right-1 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: colors.primary }}
                                    >
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className={`absolute right-0 mt-2 w-96 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark
                                            ? 'bg-gray-900 border-gray-800'
                                            : 'bg-white border-gray-200'
                                            }`}
                                    >
                                        {/* Header */}
                                        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <div className="flex items-center gap-2">
                                                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Thông báo</h3>
                                                {unreadCount > 0 && (
                                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full text-white" style={{ backgroundColor: colors.primary }}>
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={refreshNotifications}
                                                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                                                    title="Làm mới"
                                                >
                                                    <RefreshCw size={14} className={notificationsLoading ? 'animate-spin' : ''} />
                                                </button>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllAsRead}
                                                        className="text-xs font-medium hover:underline"
                                                        style={{ color: colors.primary }}
                                                    >
                                                        Đánh dấu đã đọc
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Notifications List */}
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {notificationsLoading && notifications.length === 0 ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <Loader2 size={24} className="animate-spin text-gray-400" />
                                                </div>
                                            ) : notifications.length === 0 ? (
                                                <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    <Bell size={32} className="mx-auto mb-3 opacity-50" />
                                                    <p className="text-sm">Không có thông báo mới</p>
                                                    <p className="text-xs mt-1">Các thông báo sẽ xuất hiện ở đây</p>
                                                </div>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <div
                                                        key={notif.id}
                                                        onClick={() => {
                                                            markAsRead(notif.id);
                                                            if (notif.link) {
                                                                navigate(notif.link);
                                                                setShowNotifications(false);
                                                            }
                                                        }}
                                                        className={`p-4 border-l-4 border-b last:border-b-0 transition-colors cursor-pointer ${getPriorityColor(notif.priority)} ${isDark
                                                            ? `border-b-gray-800 ${notif.read ? 'bg-gray-900' : 'bg-gray-800/50'} hover:bg-gray-800`
                                                            : `border-b-gray-100 ${notif.read ? 'bg-white' : 'bg-blue-50/30'} hover:bg-gray-50`
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {/* Icon */}
                                                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                                {getNotificationIcon(notif.type)}
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                        {notif.title}
                                                                    </p>
                                                                    {!notif.read && (
                                                                        <span
                                                                            className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                                                                            style={{ backgroundColor: colors.primary }}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    {notif.message}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1.5">
                                                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                        {notif.time}
                                                                    </p>
                                                                    {notif.priority === 'high' && (
                                                                        <span className="flex items-center gap-1 text-xs text-red-500">
                                                                            <AlertCircle size={10} />
                                                                            Quan trọng
                                                                        </span>
                                                                    )}
                                                                    {notif.link && (
                                                                        <span className="text-xs" style={{ color: colors.primary }}>
                                                                            Xem chi tiết →
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Footer */}
                                        {notifications.length > 0 && (
                                            <div className={`p-3 border-t text-center ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    Hiển thị {notifications.length} thông báo mới nhất
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleMode}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                            title="Toggle Theme"
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* Settings */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                            >
                                <Palette size={20} />
                            </button>

                            <AnimatePresence>
                                {showSettings && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`absolute right-0 mt-2 w-72 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark
                                            ? 'bg-gray-900 border-gray-800'
                                            : 'bg-white border-gray-200'
                                            }`}
                                    >
                                        <div className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Giao diện</h3>
                                        </div>

                                        {/* Theme Mode */}
                                        <div className="p-4 space-y-4">
                                            <div>
                                                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    Chế độ
                                                </p>
                                                <div className="flex gap-2">
                                                    {themeModes.map((tm) => (
                                                        <button
                                                            key={tm.value}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMode(tm.value);
                                                            }}
                                                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mode === tm.value
                                                                ? 'text-white'
                                                                : isDark
                                                                    ? 'bg-gray-800 text-gray-400 hover:text-white'
                                                                    : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                                                                }`}
                                                            style={mode === tm.value ? { backgroundColor: colors.primary } : {}}
                                                        >
                                                            {tm.icon}
                                                            {tm.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Accent Color */}
                                            <div>
                                                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    Màu chủ đạo
                                                </p>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {accentColorOptions.map((ac) => (
                                                        <button
                                                            key={ac.value}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAccent(ac.value);
                                                            }}
                                                            className={`w-full aspect-square rounded-xl ${ac.color} flex items-center justify-center transition-transform hover:scale-110 ${accent === ac.value ? 'ring-2 ring-offset-2 ring-white' : ''}`}
                                                            title={ac.label}
                                                        >
                                                            {accent === ac.value && <Check size={16} className="text-white" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Time & Date */}
                        <div className={`hidden xl:flex items-center gap-3 px-4 py-2 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            <Clock size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {currentTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                {' • '}
                                {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className={`flex-1 overflow-y-auto transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
                    <div className="p-4 lg:p-6 max-w-[1700px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Command Palette */}
            <AnimatePresence>
                {showCommandPalette && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCommandPalette(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className={`fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl rounded-2xl shadow-2xl border z-[101] overflow-hidden ${isDark
                                ? 'bg-gray-900 border-gray-800'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <div className={`flex items-center gap-3 px-4 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                                <Search size={20} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm chức năng..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`flex-1 bg-transparent border-none outline-none text-lg ${isDark
                                        ? 'text-white placeholder:text-gray-500'
                                        : 'text-gray-900 placeholder:text-gray-400'
                                        }`}
                                    autoFocus
                                />
                                <kbd className={`px-2 py-1 text-xs font-bold rounded ${isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                                    ESC
                                </kbd>
                            </div>

                            <div className="max-h-80 overflow-y-auto p-2">
                                {filteredItems.length === 0 ? (
                                    <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Không tìm thấy kết quả
                                    </div>
                                ) : (
                                    filteredItems.map((item, i) => (
                                        <Link
                                            key={i}
                                            to={item.path}
                                            onClick={() => {
                                                setShowCommandPalette(false);
                                                setSearchQuery('');
                                            }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isDark
                                                ? 'hover:bg-gray-800 text-gray-300'
                                                : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{item.icon}</span>
                                            <div className="flex-1">
                                                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</p>
                                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.description}</p>
                                            </div>
                                            <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{item.group}</span>
                                        </Link>
                                    ))
                                )}
                            </div>

                            <div className={`flex items-center justify-between px-4 py-3 border-t text-xs ${isDark
                                ? 'border-gray-800 text-gray-500'
                                : 'border-gray-100 text-gray-400'
                                }`}>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>↑↓</kbd>
                                        Di chuyển
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>↵</kbd>
                                        Chọn
                                    </span>
                                </div>
                                <span className="flex items-center gap-1">
                                    <Command size={12} />
                                    Ctrl + K
                                </span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Click outside to close dropdowns */}
            {(showNotifications || showSettings || showQuickActions) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setShowNotifications(false);
                        setShowSettings(false);
                        setShowQuickActions(false);
                    }}
                />
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

                :root {
                    --accent-primary: ${colors.primary};
                }

                .dark {
                    color-scheme: dark;
                }
            `}</style>
        </div>
    );
};
