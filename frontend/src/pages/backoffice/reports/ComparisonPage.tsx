import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowDownRight, GitCompareArrows, BarChart3, ShoppingCart, Wallet, Package } from 'lucide-react';
import { comparisonApi } from '../../../api/comparison-reports';
import { formatCurrency } from '../../../utils/format';
import { motion } from 'framer-motion';

type Metric = 'revenue' | 'orders' | 'expenses' | 'turnover';
type Preset = 'mom' | 'qoq' | 'yoy' | 'custom';

const getPresetPeriods = (preset: Preset) => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const lastQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

    switch (preset) {
        case 'mom': return { p1s: fmt(lastMonthStart), p1e: fmt(thisMonthStart), p2s: fmt(thisMonthStart), p2e: fmt(now) };
        case 'qoq': return { p1s: fmt(lastQuarterStart), p1e: fmt(thisQuarterStart), p2s: fmt(thisQuarterStart), p2e: fmt(now) };
        case 'yoy': return { p1s: fmt(lastYearStart), p1e: fmt(lastYearEnd), p2s: fmt(thisYearStart), p2e: fmt(now) };
        default: return { p1s: '', p1e: '', p2s: '', p2e: '' };
    }
};

const metricTabs: { id: Metric; label: string; icon: typeof BarChart3 }[] = [
    { id: 'revenue', label: 'Doanh thu', icon: BarChart3 },
    { id: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
    { id: 'expenses', label: 'Chi phí', icon: Wallet },
    { id: 'turnover', label: 'Vòng quay kho', icon: Package },
];

function ChangeTag({ value, suffix = '%' }: { value: number; suffix?: string }) {
    const positive = value >= 0;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(value)}{suffix}
        </span>
    );
}

function KpiCard({ label, value, change }: { label: string; value: string; change?: number }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">{label}</p>
            <p className="text-xl font-semibold text-gray-900">{value}</p>
            {change !== undefined && <div className="mt-2"><ChangeTag value={change} /></div>}
        </motion.div>
    );
}

export function ComparisonPage() {
    const [preset, setPreset] = useState<Preset>('mom');
    const [metric, setMetric] = useState<Metric>('revenue');
    const [customP1s, setCustomP1s] = useState('');
    const [customP1e, setCustomP1e] = useState('');
    const [customP2s, setCustomP2s] = useState('');
    const [customP2e, setCustomP2e] = useState('');

    const periods = useMemo(() => {
        if (preset === 'custom') return { p1s: customP1s, p1e: customP1e, p2s: customP2s, p2e: customP2e };
        return getPresetPeriods(preset);
    }, [preset, customP1s, customP1e, customP2s, customP2e]);

    const enabled = !!periods.p1s && !!periods.p1e && !!periods.p2s && !!periods.p2e;

    const { data: revenue } = useQuery({ queryKey: ['comparison', 'revenue', periods], queryFn: () => comparisonApi.compareRevenue(periods.p1s, periods.p1e, periods.p2s, periods.p2e), enabled: enabled && metric === 'revenue' });
    const { data: orders } = useQuery({ queryKey: ['comparison', 'orders', periods], queryFn: () => comparisonApi.compareOrders(periods.p1s, periods.p1e, periods.p2s, periods.p2e), enabled: enabled && metric === 'orders' });
    const { data: expenses } = useQuery({ queryKey: ['comparison', 'expenses', periods], queryFn: () => comparisonApi.compareExpenses(periods.p1s, periods.p1e, periods.p2s, periods.p2e), enabled: enabled && metric === 'expenses' });
    const { data: turnover } = useQuery({ queryKey: ['comparison', 'turnover', periods], queryFn: () => comparisonApi.compareInventoryTurnover(periods.p1s, periods.p1e, periods.p2s, periods.p2e), enabled: enabled && metric === 'turnover' });

    return (
        <div className="space-y-8 pb-20 animate-fade-in admin-area">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900 leading-none mb-2">
                    So sánh <span className="text-accent">kỳ</span>
                </h1>
                <p className="text-gray-500 font-bold uppercase text-xs">So sánh chỉ số giữa hai khoảng thời gian</p>
            </div>

            {/* Presets */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <GitCompareArrows size={18} className="text-gray-400" />
                {([['mom', 'Tháng/Tháng'], ['qoq', 'Quý/Quý'], ['yoy', 'Năm/Năm'], ['custom', 'Tùy chọn']] as [Preset, string][]).map(([id, label]) => (
                    <button key={id} onClick={() => setPreset(id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${preset === id ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                        {label}
                    </button>
                ))}
                {preset === 'custom' && (
                    <div className="flex flex-wrap items-center gap-2 ml-4">
                        <span className="text-xs text-gray-400 font-bold">Kỳ A:</span>
                        <input type="date" value={customP1s} onChange={e => setCustomP1s(e.target.value)} className="px-2 py-1 border rounded-lg text-sm" />
                        <input type="date" value={customP1e} onChange={e => setCustomP1e(e.target.value)} className="px-2 py-1 border rounded-lg text-sm" />
                        <span className="text-xs text-gray-400 font-bold ml-2">Kỳ B:</span>
                        <input type="date" value={customP2s} onChange={e => setCustomP2s(e.target.value)} className="px-2 py-1 border rounded-lg text-sm" />
                        <input type="date" value={customP2e} onChange={e => setCustomP2e(e.target.value)} className="px-2 py-1 border rounded-lg text-sm" />
                    </div>
                )}
            </div>

            {/* Metric tabs */}
            <div className="flex gap-2">
                {metricTabs.map(tab => (
                    <button key={tab.id} onClick={() => setMetric(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${metric === tab.id ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                        <tab.icon size={16} />{tab.label}
                    </button>
                ))}
            </div>

            {/* Results */}
            {metric === 'revenue' && revenue && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label={`Kỳ A: ${revenue.period1.label}`} value={formatCurrency(revenue.period1.revenue)} />
                    <KpiCard label={`Kỳ B: ${revenue.period2.label}`} value={formatCurrency(revenue.period2.revenue)} change={revenue.change.revenuePercent} />
                    <KpiCard label="Đơn hàng thay đổi" value={`${revenue.period1.orderCount} → ${revenue.period2.orderCount}`} change={revenue.change.orderPercent} />
                    <KpiCard label="AOV thay đổi" value={`${formatCurrency(revenue.period1.avgOrderValue)} → ${formatCurrency(revenue.period2.avgOrderValue)}`} change={revenue.change.aovPercent} />
                </div>
            )}

            {metric === 'orders' && orders && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Tổng đơn Kỳ A" value={String(orders.period1.total)} />
                    <KpiCard label="Tổng đơn Kỳ B" value={String(orders.period2.total)} change={orders.change.totalPercent} />
                    <KpiCard label="Hoàn thành Kỳ A → B" value={`${orders.period1.completed} → ${orders.period2.completed}`} change={orders.change.completedPercent} />
                    <KpiCard label="Tỷ lệ hủy" value={`${orders.period1.cancelRate}% → ${orders.period2.cancelRate}%`} change={orders.change.cancelRateChange} />
                </div>
            )}

            {metric === 'expenses' && expenses && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <KpiCard label="Chi phí Kỳ A" value={formatCurrency(expenses.period1.total)} />
                    <KpiCard label="Chi phí Kỳ B" value={formatCurrency(expenses.period2.total)} change={expenses.change.totalPercent} />
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-full">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Chi phí theo danh mục (Kỳ B)</p>
                        <div className="space-y-2">
                            {(expenses.period2.byCategory ?? []).map((c, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-700">{c.name}</span>
                                    <span className="font-bold">{formatCurrency(c.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {metric === 'turnover' && turnover && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Vòng quay Kỳ A" value={String(turnover.period1.turnoverRatio)} />
                    <KpiCard label="Vòng quay Kỳ B" value={String(turnover.period2.turnoverRatio)} change={turnover.change.turnoverChangePercent} />
                    <KpiCard label="Ngày bán TB Kỳ A" value={`${turnover.period1.avgDaysToSell} ngày`} />
                    <KpiCard label="Ngày bán TB Kỳ B" value={`${turnover.period2.avgDaysToSell} ngày`} />
                </div>
            )}

            {!enabled && (
                <div className="text-center py-20 text-gray-400">
                    <GitCompareArrows size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold">Chọn khoảng thời gian để so sánh</p>
                </div>
            )}
        </div>
    );
}
