import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { useConfirm } from '../../../context/ConfirmContext';
import { pitFinalizationApi, type PitFinalizationResult } from '../../../api/hr';
import { formatCurrency } from '../../../utils/format';

const yearOptions = (() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({ value: String(now - i), label: String(now - i) }));
})();

export default function PitFinalizationPage() {
    const confirm = useConfirm();
    const defaultYear = new Date().getFullYear() - 1;
    const [year, setYear] = useState<number>(defaultYear);
    const [selectedEmp, setSelectedEmp] = useState<PitFinalizationResult | null>(null);

    const { data: summary, isLoading } = useQuery({
        queryKey: ['pit-summary', year],
        queryFn: () => pitFinalizationApi.getSummary(year),
    });

    const exportMut = useMutation({
        mutationFn: ({ employeeId, y }: { employeeId: string; y: number }) => pitFinalizationApi.export(employeeId, y),
        onSuccess: (blob, vars) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `PIT-05-QTT-${vars.employeeId}-${vars.y}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Đã xuất mẫu 05/QTT-TNCN');
        },
        onError: () => toast.error('Không thể xuất'),
    });

    const handleExport = async (item: PitFinalizationResult) => {
        const ok = await confirm({
            title: 'Xuất mẫu 05/QTT-TNCN',
            message: `Xuất quyết toán TNCN năm ${year} cho ${item.employeeName ?? item.employeeId}? Truy cập sẽ ghi audit log.`,
            variant: 'warning',
        });
        if (ok) exportMut.mutate({ employeeId: item.employeeId, y: year });
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                        Quyết toán <span className="text-accent">TNCN năm</span>
                    </h1>
                    <p className="text-xs text-gray-500 font-medium">
                        Tổng hợp 12 tháng, xác định số phải nộp thêm / hoàn thuế
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={String(year)}
                        onChange={e => setYear(Number(e.target.value))}
                        options={yearOptions}
                    />
                </div>
            </header>

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SummaryCard label="Tổng thu nhập chịu thuế" value={summary.totalIncome} color="text-emerald-600" />
                    <SummaryCard label="Tổng đã khấu trừ" value={summary.totalWithheld} color="text-blue-600" />
                    <SummaryCard label="Tổng thuế phải nộp" value={summary.totalDue} color="text-accent" />
                </div>
            )}

            <div className="premium-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-accent/5 text-accent text-xs uppercase">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold">Nhân viên</th>
                            <th className="text-right px-4 py-3 font-semibold">TN chịu thuế</th>
                            <th className="text-right px-4 py-3 font-semibold">Đã khấu trừ</th>
                            <th className="text-right px-4 py-3 font-semibold">Phải nộp</th>
                            <th className="text-right px-4 py-3 font-semibold">Chênh lệch</th>
                            <th className="text-left px-4 py-3 font-semibold">Đã kê khai</th>
                            <th className="text-right px-4 py-3 font-semibold">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan={7} className="text-center py-16 text-gray-400">Đang tải...</td></tr>
                        ) : (summary?.items ?? []).length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-16 text-gray-400">Không có dữ liệu năm {year}</td></tr>
                        ) : (summary?.items ?? []).map(item => {
                            const diff = item.overpaymentOrShortfall;
                            const isOver = diff > 0; // overpayment (hoàn)
                            return (
                                <tr key={item.employeeId} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => setSelectedEmp(item)}>
                                    <td className="px-4 py-3 font-medium">{item.employeeName ?? item.employeeId.slice(0, 6)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(item.totalIncome)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(item.totalWithheld)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(item.totalDue)}</td>
                                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${isOver ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {isOver ? '+' : ''}{formatCurrency(diff)}
                                        <span className="ml-2 text-[10px] text-gray-500">{isOver ? '(được hoàn)' : '(nộp thêm)'}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input type="checkbox" defaultChecked={item.isFinalized} disabled title="Chỉ đọc — cập nhật ở backend" />
                                    </td>
                                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleExport(item)}
                                            disabled={exportMut.isPending}
                                            className="text-blue-600 hover:underline text-xs font-semibold disabled:opacity-50"
                                        >
                                            <Download size={12} className="inline mr-1" />Xuất 05/QTT
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {selectedEmp && (
                <BreakdownDrawer item={selectedEmp} year={year} onClose={() => setSelectedEmp(null)} />
            )}
        </div>
    );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="premium-card p-5">
            <p className="text-[10px] uppercase tracking-widest text-gray-400">{label}</p>
            <p className={`text-2xl font-black mt-2 tabular-nums ${color}`}>{formatCurrency(value)}</p>
        </div>
    );
}

function BreakdownDrawer({ item, year, onClose }: { item: PitFinalizationResult; year: number; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[90] flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-3xl h-full bg-white shadow-2xl overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-bold">{item.employeeName ?? item.employeeId}</h2>
                        <p className="text-xs text-gray-500 mt-1">Quyết toán năm {year} · {item.dependentCount} người phụ thuộc</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-red-50 flex items-center justify-center">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6">
                    <table className="w-full text-sm">
                        <thead className="bg-accent/5 text-accent text-xs uppercase">
                            <tr>
                                <th className="text-left px-3 py-2 font-semibold">Tháng</th>
                                <th className="text-right px-3 py-2 font-semibold">Gross</th>
                                <th className="text-right px-3 py-2 font-semibold">Bảo hiểm</th>
                                <th className="text-right px-3 py-2 font-semibold">Giảm trừ NPT</th>
                                <th className="text-right px-3 py-2 font-semibold">TN tính thuế</th>
                                <th className="text-right px-3 py-2 font-semibold">Đã khấu trừ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {(item.monthlyBreakdown ?? []).map(m => (
                                <tr key={m.month}>
                                    <td className="px-3 py-2 font-medium">T{m.month}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(m.grossIncome)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-red-500">-{formatCurrency(m.insurance)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-red-500">-{formatCurrency(m.dependentDeduction)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(m.taxableIncome)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatCurrency(m.withheldPit)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-accent/5">
                            <tr>
                                <td className="px-3 py-3 font-bold text-accent">Tổng</td>
                                <td className="px-3 py-3 text-right font-bold tabular-nums">{formatCurrency(item.totalIncome)}</td>
                                <td />
                                <td />
                                <td className="px-3 py-3 text-right font-bold tabular-nums">{formatCurrency(item.totalTaxable)}</td>
                                <td className="px-3 py-3 text-right font-bold tabular-nums">{formatCurrency(item.totalWithheld)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
