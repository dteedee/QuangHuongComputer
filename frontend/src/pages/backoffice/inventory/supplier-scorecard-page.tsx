import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, TrendingDown, TrendingUp, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AnimatedSection } from '../../../components/motion/animated-section';
import { supplierScorecardApi } from '../../../api/inventory';
import type { SupplierScorecard } from '../../../api/inventory';

function firstDayOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastDayOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function fmtDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function scoreColor(score: number): string {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
}

export default function SupplierScorecardPage() {
    const today = useMemo(() => new Date(), []);
    const [from, setFrom] = useState<string>(fmtDate(firstDayOfMonth(today)));
    const [to, setTo] = useState<string>(fmtDate(lastDayOfMonth(today)));
    const [items, setItems] = useState<SupplierScorecard[]>([]);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<SupplierScorecard | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await supplierScorecardApi.getList(from, to);
            // Sort by TotalScore DESC
            data.sort((a, b) => b.totalScore - a.totalScore);
            setItems(data);
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi tải scorecard NCC');
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                            <BarChart3 size={22} className="text-white" />
                        </div>
                        Đánh giá NCC
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Đúng hạn · Tỷ lệ lỗi · Cạnh tranh giá — điểm tổng có trọng số 0-100.
                    </p>
                </div>
                <button
                    onClick={() => void load()}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Từ ngày</label>
                    <input
                        type="date"
                        value={from}
                        onChange={e => setFrom(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Đến ngày</label>
                    <input
                        type="date"
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                </div>
            </AnimatedSection>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" delay={0.05}>
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-500">
                        <RefreshCw size={22} className="animate-spin mr-2" /> Đang tải...
                    </div>
                ) : !items.length ? (
                    <div className="text-center py-16">
                        <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">Không có dữ liệu scorecard trong khoảng thời gian này</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">#</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nhà cung cấp</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Đúng hạn</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Tỷ lệ lỗi</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Xếp giá</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[240px]">Điểm tổng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((s, idx) => {
                                const drop = s.scoreDelta != null && s.scoreDelta < -20;
                                return (
                                    <tr
                                        key={s.supplierId}
                                        onClick={() => setDetail(s)}
                                        className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                                    >
                                        <td className="px-4 py-3 text-center text-gray-500 font-semibold">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 flex items-center gap-2">
                                                {s.supplierName}
                                                {drop && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                                                        <TrendingDown size={12} /> Giảm {Math.abs(s.scoreDelta!).toFixed(0)}%
                                                    </span>
                                                )}
                                                {s.scoreDelta != null && s.scoreDelta > 5 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                                        <TrendingUp size={12} /> +{s.scoreDelta.toFixed(0)}%
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">{s.ontimeRate.toFixed(1)}%</td>
                                        <td className="px-4 py-3 text-center">{s.defectRate.toFixed(1)}%</td>
                                        <td className="px-4 py-3 text-center">#{s.priceRank}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${scoreColor(s.totalScore)}`}
                                                        style={{ width: `${Math.min(100, Math.max(0, s.totalScore))}%` }}
                                                    />
                                                </div>
                                                <span className="font-bold text-gray-900 w-10 text-right">{s.totalScore.toFixed(0)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </AnimatedSection>

            {detail && <ScorecardDetailDrawer scorecard={detail} onClose={() => setDetail(null)} />}
        </div>
    );
}

// -------------------- Detail Drawer --------------------

function ScorecardDetailDrawer({ scorecard, onClose }: { scorecard: SupplierScorecard; onClose: () => void }) {
    const trend = scorecard.trend || [];
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Điểm chi tiết: {scorecard.supplierName}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-4 gap-3">
                        <MetricCard title="Đúng hạn" value={`${scorecard.ontimeRate.toFixed(1)}%`} />
                        <MetricCard title="Tỷ lệ lỗi" value={`${scorecard.defectRate.toFixed(1)}%`} />
                        <MetricCard title="Xếp giá" value={`#${scorecard.priceRank}`} />
                        <MetricCard title="Điểm tổng" value={scorecard.totalScore.toFixed(0)} highlight />
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-800 mb-2">Xu hướng</h3>
                        {trend.length > 1 ? (
                            <div className="w-full h-64 bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="period" fontSize={12} />
                                        <YAxis domain={[0, 100]} fontSize={12} />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#e11d48"
                                            strokeWidth={2}
                                            dot={{ fill: '#e11d48' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-3 py-2 font-semibold text-gray-600">Kỳ</th>
                                            <th className="text-right px-3 py-2 font-semibold text-gray-600">Điểm</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trend.length ? (
                                            trend.map(t => (
                                                <tr key={t.period} className="border-b border-gray-100">
                                                    <td className="px-3 py-2">{t.period}</td>
                                                    <td className="px-3 py-2 text-right font-semibold">{t.score.toFixed(0)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} className="px-3 py-4 text-center text-gray-500 text-sm">Chưa có dữ liệu xu hướng</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, highlight }: { title: string; value: string | number; highlight?: boolean }) {
    return (
        <div className={`rounded-lg border p-3 ${highlight ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
            <div className="text-xs text-gray-500">{title}</div>
            <div className={`text-2xl font-bold mt-1 ${highlight ? 'text-emerald-700' : 'text-gray-900'}`}>{value}</div>
        </div>
    );
}
