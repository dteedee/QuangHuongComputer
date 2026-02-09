import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Shield, Users, Lock, Key, Activity, Heart, Globe, Terminal,
    TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, AlertTriangle,
    CheckCircle2, Clock, Server, Database, Cpu, HardDrive, Wifi, RefreshCw,
    ArrowUpRight, ArrowDownRight, MoreHorizontal, ChevronRight, Settings,
    UserPlus, FileText, Bell, Search, Filter, Download, Upload, Zap,
    BarChart3, PieChart, LineChart, Calendar, Target, Award, Star
} from 'lucide-react';
import { adminApi } from '../../../api/admin';
import { catalogApi } from '../../../api/catalog';
import { salesApi } from '../../../api/sales';
import { reportingApi } from '../../../api/reporting';
import { formatCurrency, formatDate } from '../../../utils/format';

// Stat Card Component
const StatCard = ({
    title,
    value,
    change,
    changeType = 'neutral',
    icon: Icon,
    color,
    onClick
}: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: React.ElementType;
    color: string;
    onClick?: () => void;
}) => {
    const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
        red: { bg: 'bg-red-50', icon: 'text-red-500', ring: 'ring-red-500/20' },
        blue: { bg: 'bg-blue-50', icon: 'text-blue-500', ring: 'ring-blue-500/20' },
        green: { bg: 'bg-emerald-50', icon: 'text-emerald-500', ring: 'ring-emerald-500/20' },
        amber: { bg: 'bg-amber-50', icon: 'text-amber-500', ring: 'ring-amber-500/20' },
        purple: { bg: 'bg-purple-50', icon: 'text-purple-500', ring: 'ring-purple-500/20' },
        indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-500', ring: 'ring-indigo-500/20' },
    };

    const colors = colorMap[color] || colorMap.blue;

    return (
        <motion.div
            whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.1)' }}
            onClick={onClick}
            className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm cursor-pointer group relative overflow-hidden ${onClick ? 'hover:border-gray-200' : ''}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${colors.bg} ring-1 ${colors.ring}`}>
                    <Icon size={22} className={colors.icon} />
                </div>
                {change && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${changeType === 'positive' ? 'bg-emerald-50 text-emerald-600' :
                        changeType === 'negative' ? 'bg-red-50 text-red-600' :
                            'bg-gray-50 text-gray-600'
                        }`}>
                        {changeType === 'positive' ? <TrendingUp size={12} /> :
                            changeType === 'negative' ? <TrendingDown size={12} /> : null}
                        {change}
                    </div>
                )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
            <p className="text-sm text-gray-500">{title}</p>
            {onClick && (
                <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-gray-500 transition-colors" />
            )}
        </motion.div>
    );
};

// Quick Action Button
const QuickActionButton = ({
    icon: Icon,
    label,
    color = 'gray',
    onClick
}: {
    icon: React.ElementType;
    label: string;
    color?: string;
    onClick?: () => void;
}) => {
    const colorMap: Record<string, string> = {
        red: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
        blue: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
        green: 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200',
        purple: 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200',
        amber: 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200',
        gray: 'hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 transition-all ${colorMap[color] || colorMap.gray}`}
        >
            <Icon size={18} />
            <span className="text-sm font-medium">{label}</span>
        </motion.button>
    );
};

// Activity Item
const ActivityItem = ({
    action,
    user,
    time,
    type = 'info'
}: {
    action: string;
    user: string;
    time: string;
    type?: 'info' | 'success' | 'warning' | 'error';
}) => {
    const typeColors = {
        info: 'bg-blue-500',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
    };

    return (
        <div className="flex items-start gap-3 py-3">
            <div className={`w-2 h-2 rounded-full mt-2 ${typeColors[type]}`} />
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{action}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{user}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{time}</span>
                </div>
            </div>
        </div>
    );
};

// System Status Indicator
const SystemStatus = ({
    name,
    status,
    value,
    icon: Icon
}: {
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    value: string;
    icon: React.ElementType;
}) => {
    const statusColors = {
        healthy: { dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
        warning: { dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
        critical: { dot: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-700' },
    };

    const colors = statusColors[status];

    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <Icon size={16} className={colors.text} />
                </div>
                <span className="text-sm font-medium text-gray-700">{name}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{value}</span>
                <div className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />
            </div>
        </div>
    );
};

export const AdminPortal = () => {
    const navigate = useNavigate();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [systemLatency, setSystemLatency] = useState<number>(15);

    // Fetch real data
    const { data: usersData, refetch: refetchUsers } = useQuery({
        queryKey: ['admin', 'users', 'stats'],
        queryFn: () => adminApi.users.getList({ page: 1, pageSize: 1, includeInactive: true }),
    });

    const { data: activeUsersData, refetch: refetchActiveUsers } = useQuery({
        queryKey: ['admin', 'users', 'active'],
        queryFn: () => adminApi.users.getList({ page: 1, pageSize: 1, includeInactive: false }),
    });

    const { data: rolesData, refetch: refetchRoles } = useQuery({
        queryKey: ['admin', 'roles'],
        queryFn: () => adminApi.roles.getList(),
    });

    const { data: productsData, refetch: refetchProducts } = useQuery({
        queryKey: ['catalog', 'products', 'stats'],
        queryFn: () => catalogApi.searchProducts({ page: 1, pageSize: 5, sortBy: 'createdAt_desc' }),
    });

    const { data: salesStats, refetch: refetchSalesStats } = useQuery({
        queryKey: ['sales', 'stats'],
        queryFn: () => salesApi.stats.get(),
    });

    const { data: salesSummary, refetch: refetchSalesSummary } = useQuery({
        queryKey: ['reports', 'sales-summary'],
        queryFn: () => reportingApi.getSalesSummary(),
    });

    const { data: latestOrders, refetch: refetchLatestOrders } = useQuery({
        queryKey: ['sales', 'orders', 'latest'],
        queryFn: () => salesApi.orders.getList({ page: 1, pageSize: 5, status: 'Confirmed' }),
    });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        const start = performance.now();
        await Promise.all([
            refetchUsers(),
            refetchActiveUsers(),
            refetchRoles(),
            refetchProducts(),
            refetchSalesStats(),
            refetchSalesSummary(),
            refetchLatestOrders()
        ]);
        const end = performance.now();
        setSystemLatency(Math.round(end - start));
        setTimeout(() => setIsRefreshing(false), 500);
    };

    // Derived Statistics
    const stats = {
        totalUsers: usersData?.total || 0,
        totalRoles: rolesData?.length || 0,
        totalProducts: productsData?.total || 0,
        todayOrders: salesStats?.todayOrders || 0,
        todayRevenue: salesStats?.todayOrders && salesStats.totalOrders ?
            (salesSummary?.totalRevenue || 0) / salesStats.totalOrders * salesStats.todayOrders : 0,
        monthRevenue: salesStats?.monthRevenue || 0,
        totalRevenue: salesStats?.totalRevenue || 0,

        systemHealth: systemLatency < 200 ? 100 : (systemLatency < 500 ? 98 : 95),
        activeSessions: activeUsersData?.total || 0,
        pendingAlerts: (salesStats?.pendingOrders || 0) + (productsData?.products.filter(p => p.stockQuantity < 10).length || 0),
    };

    // Generating Recent Activities from Real Data
    const generateActivities = () => {
        const activities: any[] = [];

        // Add latest orders
        if (latestOrders && latestOrders.length > 0) {
            latestOrders.slice(0, 3).forEach(order => {
                activities.push({
                    action: `Đơn hàng mới #${order.orderNumber}`,
                    user: 'Khách hàng',
                    time: formatDate(order.orderDate),
                    type: 'success'
                });
            });
        }

        // Add latest products
        if (productsData?.products && productsData.products.length > 0) {
            productsData.products.slice(0, 2).forEach(product => {
                activities.push({
                    action: `Sản phẩm mới: ${product.name}`,
                    user: 'System',
                    time: formatDate(product.createdAt),
                    type: 'info'
                });
            });
        }

        return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    };

    const realActivities = generateActivities();
    const activitiesToDisplay = realActivities.length > 0 ? realActivities : [
        { action: 'Hệ thống khởi động', user: 'System', time: formatDate(new Date().toISOString()), type: 'info' }
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                        Trung tâm <span className="text-[#D70018]">Điều hành</span>
                    </h1>
                    <p className="text-sm text-gray-500 font-medium italic">
                        Giám sát và quản trị hệ thống Quang Hưởng Computer chuyên sâu.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                        <span className="text-sm font-medium">Làm mới</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/backoffice/config')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        <Settings size={18} />
                        <span className="text-sm font-medium">Cấu hình</span>
                    </motion.button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="Tổng người dùng"
                    value={stats.totalUsers}
                    change={activeUsersData?.total ? `${activeUsersData.total} active` : undefined}
                    changeType="neutral"
                    icon={Users}
                    color="blue"
                    onClick={() => navigate('/backoffice/users')}
                />
                <StatCard
                    title="Vai trò hệ thống"
                    value={stats.totalRoles}
                    icon={Shield}
                    color="purple"
                    onClick={() => navigate('/backoffice/roles')}
                />
                <StatCard
                    title="Sản phẩm"
                    value={stats.totalProducts}
                    change="Quản lý kho"
                    changeType="neutral"
                    icon={Package}
                    color="indigo"
                    onClick={() => navigate('/backoffice/products')}
                />
                <StatCard
                    title="Đơn hàng"
                    value={stats.todayOrders}
                    change={salesStats?.monthOrders ? `${salesStats.monthOrders} tháng này` : undefined}
                    changeType="positive"
                    icon={ShoppingCart}
                    color="green"
                    onClick={() => navigate('/backoffice/orders')}
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 opacity-10">
                        <DollarSign size={120} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-red-100 text-sm mb-1">Doanh thu tháng này</p>
                        <h3 className="text-3xl font-bold mb-4">{formatCurrency(stats.monthRevenue)}</h3>
                        <div className="flex items-center gap-2 text-red-100">
                            <TrendingUp size={16} />
                            <span className="text-sm">Tổng: {formatCurrency(stats.totalRevenue)}</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Sức khỏe hệ thống</h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-sm text-emerald-600 font-medium">Hoạt động</span>
                        </div>
                    </div>
                    <div className="flex items-end gap-2 mb-4">
                        <span className="text-4xl font-bold text-gray-900">{stats.systemHealth}</span>
                        <span className="text-xl text-gray-400 mb-1">%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full"
                            style={{ width: `${stats.systemHealth}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Độ trễ API: {systemLatency}ms</p>
                </motion.div>

                <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Người dùng active</h3>
                        <Activity size={20} className="text-blue-500" />
                    </div>
                    <div className="flex items-end gap-2 mb-4">
                        <span className="text-4xl font-bold text-gray-900">{stats.activeSessions}</span>
                        <span className="text-sm text-gray-400 mb-1">tài khoản</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center text-[10px] font-medium text-gray-600">
                                    U{i}
                                </div>
                            ))}
                        </div>
                        {stats.activeSessions > 4 && <span>+{stats.activeSessions - 4} tài khoản khác</span>}
                    </div>
                </motion.div>
            </div>

            {/* Quick Actions & System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <QuickActionButton
                            icon={UserPlus}
                            label="Thêm người dùng"
                            color="blue"
                            onClick={() => navigate('/backoffice/users')}
                        />
                        <QuickActionButton
                            icon={Package}
                            label="Thêm sản phẩm"
                            color="green"
                            onClick={() => navigate('/backoffice/products')}
                        />
                        <QuickActionButton
                            icon={Shield}
                            label="Quản lý vai trò"
                            color="purple"
                            onClick={() => navigate('/backoffice/roles')}
                        />
                        <QuickActionButton
                            icon={FileText}
                            label="Báo cáo"
                            color="amber"
                            onClick={() => navigate('/backoffice/reports')}
                        />
                        <QuickActionButton
                            icon={Download}
                            label="Xuất dữ liệu"
                            color="gray"
                        />
                        <QuickActionButton
                            icon={Upload}
                            label="Nhập dữ liệu"
                            color="gray"
                        />
                        <QuickActionButton
                            icon={Bell}
                            label="Thông báo"
                            color="red"
                        />
                        <QuickActionButton
                            icon={Terminal}
                            label="Log hệ thống"
                            color="gray"
                        />
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4">Trạng thái hệ thống</h3>
                    <div className="space-y-1">
                        <SystemStatus name="API Server" status={systemLatency < 500 ? 'healthy' : 'warning'} value={`${systemLatency}ms`} icon={Server} />
                        <SystemStatus name="Database" status="healthy" value="Connected" icon={Database} />
                        <SystemStatus name="Services" status="healthy" value="Running" icon={Cpu} />
                        <SystemStatus name="Storage" status="healthy" value="Stable" icon={HardDrive} />
                        <SystemStatus name="Network" status="healthy" value="Online" icon={Wifi} />
                    </div>
                </div>
            </div>

            {/* Activity & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Hoạt động gần đây</h3>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Xem tất cả
                        </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {activitiesToDisplay.map((activity, index) => (
                            <ActivityItem
                                key={index}
                                action={activity.action}
                                user={activity.user}
                                time={activity.time}
                                type={activity.type}
                            />
                        ))}
                    </div>
                </div>

                {/* Pending Alerts */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">Cảnh báo</h3>
                            {stats.pendingAlerts > 0 && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                                    {stats.pendingAlerts}
                                </span>
                            )}
                        </div>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Xem tất cả
                        </button>
                    </div>
                    <div className="space-y-3">
                        {(!salesStats?.pendingOrders && (!productsData?.products?.some(p => p.stockQuantity < 10))) && (
                            <p className="text-sm text-gray-500 italic">Không có cảnh báo nào.</p>
                        )}

                        {productsData?.products?.filter(p => p.stockQuantity < 10).slice(0, 3).map(p => (
                            <div key={p.id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800">Tồn kho thấp: {p.name}</p>
                                    <p className="text-xs text-amber-600 mt-1">Còn lại {p.stockQuantity} sản phẩm</p>
                                </div>
                            </div>
                        ))}

                        {(salesStats?.pendingOrders || 0) > 0 && (
                            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <Clock size={18} className="text-blue-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Đơn hàng chờ xử lý</p>
                                    <p className="text-xs text-blue-600 mt-1">{salesStats?.pendingOrders} đơn hàng đang chờ</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Management Modules */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-6">Quản trị hệ thống</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Users Management */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        onClick={() => navigate('/backoffice/users')}
                        className="group cursor-pointer p-5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                                <Users size={24} className="text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Quản lý Người dùng</h4>
                                <p className="text-sm text-gray-500">{stats.totalUsers} người dùng</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Roles Management */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        onClick={() => navigate('/backoffice/roles')}
                        className="group cursor-pointer p-5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                                <Shield size={24} className="text-purple-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Quản lý Vai trò</h4>
                                <p className="text-sm text-gray-500">{stats.totalRoles} vai trò</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* System Config */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        onClick={() => navigate('/backoffice/config')}
                        className="group cursor-pointer p-5 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                                <Settings size={24} className="text-gray-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Cấu hình Hệ thống</h4>
                                <p className="text-sm text-gray-500">Thiết lập và bảo mật</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
