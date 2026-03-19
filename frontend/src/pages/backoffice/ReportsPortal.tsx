import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3, PieChart, TrendingUp, TrendingDown,
    Download, Calendar, ArrowUpRight, ArrowDownRight,
    Package, Users, Wrench, DollarSign, AlertTriangle,
    FileSpreadsheet, Trophy, Star, ShoppingCart
} from 'lucide-react';
import { reportingApi } from '../../api/reporting';
import type { TopProduct, TopCustomer, TopTechnician } from '../../api/reporting';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';

export const ReportsPortal = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'customers' | 'technicians'>('overview');
    const [isExporting, setIsExporting] = useState(false);

    // Queries
    const { data: overview, isLoading: loadingOverview } = useQuery({
        queryKey: ['reports', 'business-overview'],
        queryFn: () => reportingApi.getBusinessOverview()
    });

    const { data: salesStats } = useQuery({
        queryKey: ['reports', 'sales-summary'],
        queryFn: () => reportingApi.getSalesSummary()
    });

    const { data: invValue } = useQuery({
        queryKey: ['reports', 'inventory-value'],
        queryFn: () => reportingApi.getInventoryValue()
    });

    const { data: topProducts } = useQuery({
        queryKey: ['reports', 'top-products'],
        queryFn: () => reportingApi.getTopProducts(10)
    });

    const { data: topCustomers } = useQuery({
        queryKey: ['reports', 'top-customers'],
        queryFn: () => reportingApi.getTopCustomers(10)
    });

    const { data: topTechnicians } = useQuery({
        queryKey: ['reports', 'top-technicians'],
        queryFn: () => reportingApi.getTopTechnicians(10)
    });

    // Export handlers
    const handleExport = async (type: 'full' | 'sales' | 'products' | 'technicians' | 'inventory') => {
        setIsExporting(true);
        try {
            switch (type) {
                case 'full':
                    await reportingApi.exportFullReport();
                    break;
                case 'sales':
                    await reportingApi.exportSales();
                    break;
                case 'products':
                    await reportingApi.exportTopProducts();
                    break;
                case 'technicians':
                    await reportingApi.exportTechnicians();
                    break;
                case 'inventory':
                    await reportingApi.exportInventory();
                    break;
            }
            toast.success('Đã xuất báo cáo Excel thành công!');
        } catch {
            toast.error('Lỗi xuất báo cáo');
        } finally {
            setIsExporting(false);
        }
    };

    const growthPercent = overview?.sales.growthPercent ?? 0;
    const isPositiveGrowth = growthPercent >= 0;

    return (
        <div className="space-y-8 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Báo cáo & <span className="text-[#D70018]">Phân tích</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">
                        Dữ liệu kinh doanh thời gian thực
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => handleExport('full')}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-6 py-3 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95 disabled:opacity-50"
                    >
                        <FileSpreadsheet size={18} />
                        {isExporting ? 'Đang xuất...' : 'Xuất báo cáo tổng hợp'}
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 rounded-xl">
                            <DollarSign className="text-emerald-600" size={24} />
                        </div>
                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${isPositiveGrowth ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {isPositiveGrowth ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {Math.abs(growthPercent)}%
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Doanh thu tháng</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">
                        {formatCurrency(overview?.sales.thisMonthRevenue ?? 0)}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <ShoppingCart className="text-blue-600" size={24} />
                        </div>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                            {overview?.sales.pendingOrders ?? 0} chờ xử lý
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tổng đơn hàng</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">
                        {salesStats?.totalOrders ?? 0}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <Package className="text-purple-600" size={24} />
                        </div>
                        {(overview?.inventory.lowStockCount ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                <AlertTriangle size={12} />
                                {overview?.inventory.lowStockCount} sắp hết
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Giá trị tồn kho</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">
                        {formatCurrency(overview?.inventory.totalValue ?? 0)}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-50 rounded-xl">
                            <Wrench className="text-orange-600" size={24} />
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                            {overview?.repairs.pendingCount ?? 0} đang sửa
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Doanh thu sửa chữa</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">
                        {formatCurrency(overview?.repairs.thisMonthRevenue ?? 0)}
                    </p>
                </motion.div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-100 pb-4">
                {[
                    { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
                    { id: 'products', label: 'Top sản phẩm', icon: Trophy },
                    { id: 'customers', label: 'Top khách hàng', icon: Users },
                    { id: 'technicians', label: 'Top kỹ thuật viên', icon: Wrench },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                            ? 'bg-gray-900 text-white shadow-lg'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue Chart */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Doanh thu 12 tháng</h3>
                            <button
                                onClick={() => handleExport('sales')}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-600 transition-all"
                            >
                                <Download size={14} />
                                Excel
                            </button>
                        </div>
                        <div className="h-64 flex items-end gap-2">
                            {(salesStats?.monthlyData ?? []).map((m, i) => {
                                const maxRevenue = Math.max(...(salesStats?.monthlyData ?? []).map(d => d.revenue), 1);
                                const height = (m.revenue / maxRevenue) * 100;
                                return (
                                    <div key={i} className="flex-1 group relative">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${height}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.05 }}
                                            className="bg-gradient-to-t from-[#D70018] to-red-400 rounded-t-lg hover:from-[#b50014] transition-all cursor-pointer"
                                        />
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-10">
                                            {formatCurrency(m.revenue)}
                                        </div>
                                        <p className="text-center text-[10px] font-bold text-gray-400 mt-2">T{m.month}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Low Stock Alert */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                <AlertTriangle className="text-amber-500" size={20} />
                                Sản phẩm sắp hết hàng
                            </h3>
                            <button
                                onClick={() => handleExport('inventory')}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-600 transition-all"
                            >
                                <Download size={14} />
                                Excel
                            </button>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {(invValue?.lowStockItems ?? []).map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{item.productName}</p>
                                        <p className="text-xs text-gray-500">Điểm đặt lại: {item.reorderPoint}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-red-600">{item.quantityOnHand}</p>
                                        <p className="text-[10px] text-gray-400 uppercase">còn lại</p>
                                    </div>
                                </div>
                            ))}
                            {(invValue?.lowStockItems ?? []).length === 0 && (
                                <p className="text-center text-gray-400 py-8">Không có sản phẩm sắp hết hàng</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'products' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <Trophy className="text-amber-500" size={20} />
                            Top 10 sản phẩm bán chạy
                        </h3>
                        <button
                            onClick={() => handleExport('products')}
                            className="flex items-center gap-2 px-4 py-2 bg-[#D70018] hover:bg-[#b50014] text-white rounded-lg text-xs font-bold transition-all"
                        >
                            <FileSpreadsheet size={14} />
                            Xuất Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Hạng</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Sản phẩm</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Số lượng</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Doanh thu</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Đơn hàng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(topProducts ?? []).map((product, i) => (
                                    <tr key={product.productId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-100 text-amber-600' :
                                                i === 1 ? 'bg-gray-200 text-gray-600' :
                                                    i === 2 ? 'bg-orange-100 text-orange-600' :
                                                        'bg-gray-50 text-gray-400'
                                                }`}>
                                                {i + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{product.productName}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">{product.totalQuantity}</td>
                                        <td className="px-6 py-4 text-right font-black text-[#D70018]">{formatCurrency(product.totalRevenue)}</td>
                                        <td className="px-6 py-4 text-right text-gray-500">{product.orderCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'customers' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <Star className="text-amber-500" size={20} />
                            Top 10 khách hàng VIP
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Hạng</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Khách hàng</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Tổng chi tiêu</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Số đơn</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Mua gần nhất</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(topCustomers ?? []).map((customer, i) => (
                                    <tr key={customer.customerId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-100 text-amber-600' :
                                                i === 1 ? 'bg-gray-200 text-gray-600' :
                                                    i === 2 ? 'bg-orange-100 text-orange-600' :
                                                        'bg-gray-50 text-gray-400'
                                                }`}>
                                                {i + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{customer.customerName}</p>
                                            <p className="text-xs text-gray-400">{customer.email}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-[#D70018]">{formatCurrency(customer.totalSpent)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">{customer.orderCount}</td>
                                        <td className="px-6 py-4 text-right text-gray-500 text-sm">
                                            {new Date(customer.lastOrderDate).toLocaleDateString('vi-VN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'technicians' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <Wrench className="text-blue-500" size={20} />
                            Top kỹ thuật viên xuất sắc
                        </h3>
                        <button
                            onClick={() => handleExport('technicians')}
                            className="flex items-center gap-2 px-4 py-2 bg-[#D70018] hover:bg-[#b50014] text-white rounded-lg text-xs font-bold transition-all"
                        >
                            <FileSpreadsheet size={14} />
                            Xuất Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Hạng</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Kỹ thuật viên</th>
                                    <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-widest">Công việc</th>
                                    <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-widest">Hoàn thành</th>
                                    <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-widest">Tỷ lệ</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Doanh thu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(topTechnicians ?? []).map((tech, i) => (
                                    <tr key={tech.technicianId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-100 text-amber-600' :
                                                i === 1 ? 'bg-gray-200 text-gray-600' :
                                                    i === 2 ? 'bg-orange-100 text-orange-600' :
                                                        'bg-gray-50 text-gray-400'
                                                }`}>
                                                {i + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{tech.technicianName}</p>
                                            <p className="text-xs text-gray-400">{tech.specialty}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-900">{tech.totalJobs}</td>
                                        <td className="px-6 py-4 text-center font-bold text-emerald-600">{tech.completedJobs}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${tech.successRate >= 90 ? 'bg-emerald-100 text-emerald-700' :
                                                tech.successRate >= 70 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {tech.successRate}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-[#D70018]">{formatCurrency(tech.totalRevenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Export Options */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-2xl">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6">Xuất báo cáo Excel</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { id: 'full', label: 'Báo cáo tổng hợp', icon: BarChart3, color: 'bg-[#D70018]' },
                        { id: 'sales', label: 'Báo cáo bán hàng', icon: ShoppingCart, color: 'bg-emerald-600' },
                        { id: 'products', label: 'Top sản phẩm', icon: Trophy, color: 'bg-amber-600' },
                        { id: 'technicians', label: 'Kỹ thuật viên', icon: Wrench, color: 'bg-blue-600' },
                        { id: 'inventory', label: 'Tồn kho', icon: Package, color: 'bg-purple-600' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleExport(item.id as 'full' | 'sales' | 'products' | 'technicians' | 'inventory')}
                            disabled={isExporting}
                            className={`${item.color} p-5 rounded-xl text-white hover:opacity-90 transition-all active:scale-95 disabled:opacity-50`}
                        >
                            <item.icon size={24} className="mb-3" />
                            <p className="text-xs font-black uppercase tracking-widest">{item.label}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
