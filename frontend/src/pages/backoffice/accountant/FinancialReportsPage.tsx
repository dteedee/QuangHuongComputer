import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Download, Calendar, Wallet, CreditCard, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { financialApi, type CashFlowReport, type RevenueExpenseReport, type BalanceOverview } from '../../../api/reporting';
import { formatCurrency } from '../../../utils/format';
import toast from 'react-hot-toast';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export function FinancialReportsPage() {
    const [dateRange, setDateRange] = useState({
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    const { data: cashFlow, isLoading: loadingCashFlow } = useQuery({
        queryKey: ['cash-flow', dateRange],
        queryFn: () => financialApi.getCashFlow(dateRange.startDate, dateRange.endDate),
    });

    const { data: revenueExpense, isLoading: loadingRevExp } = useQuery({
        queryKey: ['revenue-expense', dateRange],
        queryFn: () => financialApi.getRevenueExpense(dateRange.startDate, dateRange.endDate),
    });

    const { data: balance, isLoading: loadingBalance } = useQuery({
        queryKey: ['balance-overview'],
        queryFn: () => financialApi.getBalanceOverview(),
    });

    const handleExport = async () => {
        try {
            await financialApi.exportFinancialReport(dateRange.startDate, dateRange.endDate);
            toast.success('Xuất báo cáo thành công');
        } catch {
            toast.error('Có lỗi khi xuất báo cáo');
        }
    };

    const isLoading = loadingCashFlow || loadingRevExp || loadingBalance;

    // Chart data for Revenue vs Expense
    const revenueChartData = {
        labels: revenueExpense?.monthlyData.map(d => d.month) || [],
        datasets: [
            {
                label: 'Doanh thu',
                data: revenueExpense?.monthlyData.map(d => d.revenue) || [],
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                borderRadius: 6,
            },
            {
                label: 'Chi phí',
                data: revenueExpense?.monthlyData.map(d => d.expense) || [],
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderRadius: 6,
            },
        ],
    };

    const profitChartData = {
        labels: revenueExpense?.monthlyData.map(d => d.month) || [],
        datasets: [
            {
                label: 'Lợi nhuận',
                data: revenueExpense?.monthlyData.map(d => d.profit) || [],
                borderColor: '#D70018',
                backgroundColor: 'rgba(215, 0, 24, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#D70018',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    font: { weight: 'bold' as const, size: 11 },
                    usePointStyle: true,
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value: number | string) => {
                        const numValue = typeof value === 'string' ? parseFloat(value) : value;
                        return numValue >= 1000000 ? `${(numValue / 1000000).toFixed(0)}M` : numValue.toString();
                    },
                },
            },
        },
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight uppercase italic leading-none mb-3">
                        Báo Cáo <span className="text-[#D70018]">Tài Chính</span>
                    </h1>
                    <p className="text-gray-600 font-semibold text-sm">
                        Xem tổng quan dòng tiền, doanh thu, chi phí và tài sản
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-gray-100">
                        <Calendar size={16} className="text-gray-400" />
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="border-none text-sm font-bold focus:ring-0 p-0"
                        />
                        <span className="text-gray-300">-</span>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="border-none text-sm font-bold focus:ring-0 p-0"
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-3 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        <Download size={16} />
                        Xuất Excel
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#D70018]"></div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <motion.div whileHover={{ y: -5 }} className="premium-card p-8 border-2 border-green-50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                                    <TrendingUp size={24} />
                                </div>
                                <span className="flex items-center text-green-600 text-xs font-black">
                                    <ArrowUpRight size={14} /> Doanh thu
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                                {formatCurrency(revenueExpense?.summary.totalRevenue || 0)}
                            </h3>
                            <p className="text-xs text-gray-400 mt-2">Tổng doanh thu trong kỳ</p>
                        </motion.div>

                        <motion.div whileHover={{ y: -5 }} className="premium-card p-8 border-2 border-red-50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                                    <TrendingDown size={24} />
                                </div>
                                <span className="flex items-center text-red-600 text-xs font-black">
                                    <ArrowDownRight size={14} /> Chi phí
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                                {formatCurrency(revenueExpense?.summary.totalExpenses || 0)}
                            </h3>
                            <p className="text-xs text-gray-400 mt-2">Tổng chi phí trong kỳ</p>
                        </motion.div>

                        <motion.div whileHover={{ y: -5 }} className="premium-card p-8 border-2 border-blue-50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <DollarSign size={24} />
                                </div>
                                <span className="text-blue-600 text-xs font-black uppercase tracking-widest">Lợi nhuận</span>
                            </div>
                            <h3 className={`text-2xl font-black tracking-tighter ${(revenueExpense?.summary.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(revenueExpense?.summary.grossProfit || 0)}
                            </h3>
                            <p className="text-xs text-gray-400 mt-2">
                                Biên lợi nhuận: {(revenueExpense?.summary.profitMargin || 0).toFixed(1)}%
                            </p>
                        </motion.div>

                        <motion.div whileHover={{ y: -5 }} className="premium-card p-8 border-2 border-purple-50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                                    <Wallet size={24} />
                                </div>
                                <span className="text-purple-600 text-xs font-black uppercase tracking-widest">Dòng tiền</span>
                            </div>
                            <h3 className={`text-2xl font-black tracking-tighter ${(cashFlow?.netCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(cashFlow?.netCashFlow || 0)}
                            </h3>
                            <p className="text-xs text-gray-400 mt-2">Dòng tiền ròng</p>
                        </motion.div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Revenue vs Expense Chart */}
                        <div className="premium-card p-8 border-2">
                            <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                                <BarChart3 size={20} className="text-[#D70018]" />
                                Doanh thu vs Chi phí
                            </h3>
                            <div className="h-[300px]">
                                <Bar data={revenueChartData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Profit Trend Chart */}
                        <div className="premium-card p-8 border-2">
                            <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                                <TrendingUp size={20} className="text-[#D70018]" />
                                Xu hướng lợi nhuận
                            </h3>
                            <div className="h-[300px]">
                                <Line data={profitChartData} options={chartOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Balance Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Assets */}
                        <div className="premium-card p-8 border-2 border-green-50">
                            <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                                <Package size={20} className="text-green-600" />
                                Tài sản
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                    <span className="text-sm font-bold text-gray-600">Công nợ phải thu (AR)</span>
                                    <span className="font-black text-gray-900">{formatCurrency(balance?.assets.accountsReceivable || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                    <span className="text-sm font-bold text-gray-600">Giá trị tồn kho</span>
                                    <span className="font-black text-gray-900">{formatCurrency(balance?.assets.inventoryValue || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-green-100 rounded-xl border-2 border-green-200">
                                    <span className="text-sm font-black text-green-700 uppercase tracking-widest">Tổng tài sản</span>
                                    <span className="font-black text-green-700 text-xl">{formatCurrency(balance?.assets.totalAssets || 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Liabilities */}
                        <div className="premium-card p-8 border-2 border-red-50">
                            <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                                <CreditCard size={20} className="text-red-600" />
                                Nợ phải trả
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                    <span className="text-sm font-bold text-gray-600">Công nợ phải trả (AP)</span>
                                    <span className="font-black text-gray-900">{formatCurrency(balance?.liabilities.accountsPayable || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                    <span className="text-sm font-bold text-gray-600">Chi phí chờ thanh toán</span>
                                    <span className="font-black text-gray-900">{formatCurrency(balance?.liabilities.pendingExpenses || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-red-100 rounded-xl border-2 border-red-200">
                                    <span className="text-sm font-black text-red-700 uppercase tracking-widest">Tổng nợ</span>
                                    <span className="font-black text-red-700 text-xl">{formatCurrency(balance?.liabilities.totalLiabilities || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Position Card */}
                    <div className="premium-card p-10 border-2 bg-gray-950 text-white">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Vị thế tài chính ròng</h3>
                                <p className={`text-5xl font-black tracking-tighter italic ${(balance?.netPosition || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(balance?.netPosition || 0)}
                                </p>
                            </div>
                            <div className="flex gap-6">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Tài sản</p>
                                    <p className="text-lg font-black text-green-400">{formatCurrency(balance?.assets.totalAssets || 0)}</p>
                                </div>
                                <div className="text-4xl font-thin text-gray-600">−</div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Nợ phải trả</p>
                                    <p className="text-lg font-black text-red-400">{formatCurrency(balance?.liabilities.totalLiabilities || 0)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expense by Category */}
                    {revenueExpense?.expenseByCategory && revenueExpense.expenseByCategory.length > 0 && (
                        <div className="premium-card p-8 border-2">
                            <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter mb-6">
                                Chi phí theo danh mục
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {revenueExpense.expenseByCategory.map((cat, idx) => (
                                    <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">{cat.categoryName}</span>
                                            <span className="text-[9px] font-bold text-gray-400">{cat.count} khoản</span>
                                        </div>
                                        <p className="text-xl font-black text-[#D70018] tracking-tighter">{formatCurrency(cat.total)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cash Flow Breakdown */}
                    <div className="premium-card p-8 border-2">
                        <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter mb-6">
                            Chi tiết dòng tiền
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">Thu từ AR</p>
                                <p className="text-2xl font-black text-green-700 tracking-tighter">
                                    {formatCurrency(cashFlow?.breakdown.arCollected || 0)}
                                </p>
                            </div>
                            <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Trả cho AP</p>
                                <p className="text-2xl font-black text-red-700 tracking-tighter">
                                    {formatCurrency(cashFlow?.breakdown.apPaid || 0)}
                                </p>
                            </div>
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Chi phí đã trả</p>
                                <p className="text-2xl font-black text-amber-700 tracking-tighter">
                                    {formatCurrency(cashFlow?.breakdown.expensesPaid || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export { FinancialReportsPage as default };
