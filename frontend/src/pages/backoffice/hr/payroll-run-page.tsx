import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play, Plus, Download, CheckCircle2, Wallet, RefreshCw, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { useConfirm } from '../../../context/ConfirmContext';
import {
    payrollRunsApi,
    payrollRunStatusLabels,
    payrollRunStatusColors,
    type PayrollRun,
    type PayrollRunStatus,
    type Payroll,
} from '../../../api/hr';
import { formatCurrency } from '../../../utils/format';

const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }));
const yearOptions = (() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 4 }, (_, i) => ({ value: String(now - i), label: String(now - i) }));
})();

/** Default kỳ lương = tháng trước */
function defaultPeriod() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export default function PayrollRunPage() {
    const qc = useQueryClient();
    const confirm = useConfirm();
    const { month: defMonth, year: defYear } = defaultPeriod();
    const [filterMonth, setFilterMonth] = useState<number>(defMonth);
    const [filterYear, setFilterYear] = useState<number>(defYear);
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

    const { data: runs = [], isLoading, refetch } = useQuery({
        queryKey: ['payroll-runs', filterYear, filterMonth],
        queryFn: () => payrollRunsApi.list({ year: filterYear, month: filterMonth }),
    });

    const createMut = useMutation({
        mutationFn: (payload: { periodMonth: number; periodYear: number }) => payrollRunsApi.create(payload),
        onSuccess: (r) => {
            toast.success(`Đã tạo kỳ lương ${r.periodMonth}/${r.periodYear}`);
            refetch();
            setCreateOpen(false);
            setSelectedRunId(r.id);
        },
        onError: () => toast.error('Không thể tạo kỳ lương'),
    });

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        createMut.mutate({
            periodMonth: Number(fd.get('month')),
            periodYear: Number(fd.get('year')),
        });
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                        Kỳ lương <span className="text-accent">tháng</span>
                    </h1>
                    <p className="text-xs text-gray-500 font-medium">
                        Tạo, tính, duyệt và chi trả bảng lương hàng tháng
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={String(filterMonth)}
                        onChange={e => setFilterMonth(Number(e.target.value))}
                        options={monthOptions}
                    />
                    <Select
                        value={String(filterYear)}
                        onChange={e => setFilterYear(Number(e.target.value))}
                        options={yearOptions}
                    />
                    <Button icon={Plus} onClick={() => setCreateOpen(true)}>Tạo kỳ lương</Button>
                </div>
            </header>

            <RunsTable runs={runs} isLoading={isLoading} onOpen={setSelectedRunId} />

            <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Tạo kỳ lương mới">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Tháng"
                            name="month"
                            defaultValue={String(defMonth)}
                            options={monthOptions}
                        />
                        <Select
                            label="Năm"
                            name="year"
                            defaultValue={String(defYear)}
                            options={yearOptions}
                        />
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        Kỳ lương sẽ được tạo ở trạng thái Nháp. Bấm "Tính lương" để chạy tính hàng loạt.
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Hủy</Button>
                        <Button type="submit" loading={createMut.isPending} className="flex-1">Tạo</Button>
                    </div>
                </form>
            </Modal>

            {selectedRunId && (
                <RunDetailDrawer runId={selectedRunId} onClose={() => setSelectedRunId(null)} />
            )}
        </div>
    );
}

// ─── RunsTable ─────────────────────────────────────────
function RunsTable({ runs, isLoading, onOpen }: { runs: PayrollRun[]; isLoading: boolean; onOpen: (id: string) => void }) {
    return (
        <div className="premium-card overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-accent/5 text-accent text-xs uppercase">
                    <tr>
                        <th className="text-left px-6 py-4 font-semibold">Kỳ</th>
                        <th className="text-left px-6 py-4 font-semibold">Trạng thái</th>
                        <th className="text-right px-6 py-4 font-semibold">Số NV</th>
                        <th className="text-right px-6 py-4 font-semibold">Tổng lương gross</th>
                        <th className="text-right px-6 py-4 font-semibold">Tổng thực lĩnh</th>
                        <th className="text-left px-6 py-4 font-semibold">Ngày tạo</th>
                        <th className="text-right px-6 py-4 font-semibold">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                        <tr><td colSpan={7} className="px-6 py-16 text-center text-gray-400">Đang tải...</td></tr>
                    ) : runs.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-16 text-center text-gray-400">Chưa có kỳ lương nào</td></tr>
                    ) : runs.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-6 py-4 font-semibold">{r.periodMonth}/{r.periodYear}</td>
                            <td className="px-6 py-4">
                                <StatusBadge status={r.status} />
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums">{r.employeeCount}</td>
                            <td className="px-6 py-4 text-right font-semibold tabular-nums">{formatCurrency(r.totalGross)}</td>
                            <td className="px-6 py-4 text-right font-semibold text-accent tabular-nums">{formatCurrency(r.totalNet)}</td>
                            <td className="px-6 py-4 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td className="px-6 py-4 text-right">
                                <Button size="sm" variant="outline" icon={Eye} onClick={() => onOpen(r.id)}>Chi tiết</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function StatusBadge({ status }: { status: PayrollRunStatus }) {
    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${payrollRunStatusColors[status]}`}>
            {payrollRunStatusLabels[status]}
        </span>
    );
}

// ─── RunDetailDrawer ────────────────────────────────────
function RunDetailDrawer({ runId, onClose }: { runId: string; onClose: () => void }) {
    const qc = useQueryClient();
    const confirm = useConfirm();

    const { data: run, isLoading, refetch } = useQuery({
        queryKey: ['payroll-run', runId],
        queryFn: () => payrollRunsApi.get(runId),
    });

    const calcMut = useMutation({
        mutationFn: () => payrollRunsApi.calculate(runId),
        onSuccess: () => { toast.success('Đã tính lương'); refetch(); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); },
        onError: () => toast.error('Không thể tính lương'),
    });
    const approveMut = useMutation({
        mutationFn: () => payrollRunsApi.approve(runId),
        onSuccess: () => { toast.success('Đã duyệt kỳ lương'); refetch(); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); },
        onError: () => toast.error('Không thể duyệt'),
    });
    const payMut = useMutation({
        mutationFn: () => payrollRunsApi.markPaid(runId),
        onSuccess: () => { toast.success('Đã đánh dấu chi trả'); refetch(); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); },
        onError: () => toast.error('Không thể chi trả'),
    });
    const recalcOne = useMutation({
        mutationFn: (payrollId: string) => payrollRunsApi.recalculatePayroll(payrollId),
        onSuccess: () => { toast.success('Đã tính lại'); refetch(); },
        onError: () => toast.error('Không thể tính lại'),
    });

    const canApprove = useMemo(() => run?.payrolls?.every(p => p.status === 'Calculated' || p.status === 'Approved') ?? false, [run]);
    const canPay = run?.status === 'Approved';

    const handleDownloadCsv = async () => {
        const ok = await confirm({
            title: 'Xác nhận tải file chuyển khoản',
            message: 'File chứa dữ liệu lương nhạy cảm. Truy cập sẽ được ghi audit log. Tiếp tục?',
            variant: 'warning',
            confirmText: 'Tải file',
        });
        if (!ok) return;
        try {
            const blob = await payrollRunsApi.downloadBankTransferFile(runId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bank-transfer-${run?.periodMonth}-${run?.periodYear}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Đã tải file chuyển khoản');
        } catch {
            toast.error('Không thể tải file');
        }
    };

    const handleApprove = async () => {
        const ok = await confirm({ message: 'Duyệt kỳ lương này? Sau khi duyệt sẽ không thể chỉnh sửa từng payroll.', variant: 'warning' });
        if (ok) approveMut.mutate();
    };
    const handlePay = async () => {
        const ok = await confirm({
            title: 'Xác nhận chi trả',
            message: 'Chi trả sẽ chốt kỳ lương và tạo file chuyển khoản. Bấm OK để tiếp tục.',
            variant: 'danger',
            confirmText: 'Chi trả',
        });
        if (ok) payMut.mutate();
    };

    return (
        <div className="fixed inset-0 z-[90] flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-5xl h-full bg-white shadow-2xl overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-bold">
                            Kỳ lương {run ? `${run.periodMonth}/${run.periodYear}` : ''}
                        </h2>
                        {run && (
                            <div className="mt-1 flex items-center gap-3 text-xs">
                                <StatusBadge status={run.status} />
                                <span className="text-gray-500">{run.employeeCount} NV</span>
                                <span className="text-gray-500">Tổng: {formatCurrency(run.totalGross)}</span>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-red-50 flex items-center justify-center">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {calcMut.isPending && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-center gap-3">
                            <span className="animate-spin border-2 border-blue-500 border-t-transparent rounded-full w-4 h-4" />
                            Đang tính lương cho tất cả nhân viên...
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                        {run?.status === 'Draft' && (
                            <Button icon={Play} loading={calcMut.isPending} onClick={() => calcMut.mutate()}>Tính lương</Button>
                        )}
                        {run?.status === 'Calculated' && (
                            <Button variant="success" icon={CheckCircle2} loading={approveMut.isPending} disabled={!canApprove} onClick={handleApprove}>
                                Duyệt
                            </Button>
                        )}
                        {canPay && (
                            <Button variant="danger" icon={Wallet} loading={payMut.isPending} onClick={handlePay}>Chi trả</Button>
                        )}
                        {(run?.status === 'Approved' || run?.status === 'Paid') && (
                            <Button variant="outline" icon={Download} onClick={handleDownloadCsv}>Tải CSV chuyển khoản</Button>
                        )}
                    </div>

                    {isLoading || !run ? (
                        <p className="text-center py-16 text-gray-400 text-sm">Đang tải...</p>
                    ) : (
                        <PayrollsTable
                            payrolls={run.payrolls ?? []}
                            canRecalc={run.status === 'Draft' || run.status === 'Calculated'}
                            onRecalc={id => recalcOne.mutate(id)}
                            isRecalcPending={recalcOne.isPending}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function PayrollsTable({
    payrolls,
    canRecalc,
    onRecalc,
    isRecalcPending,
}: {
    payrolls: Payroll[];
    canRecalc: boolean;
    onRecalc: (id: string) => void;
    isRecalcPending: boolean;
}) {
    if (payrolls.length === 0) {
        return (
            <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
                Chưa có payroll nào. Bấm "Tính lương" để tạo.
            </div>
        );
    }
    return (
        <div className="premium-card overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                        <th className="text-left px-4 py-3 font-semibold">Nhân viên</th>
                        <th className="text-right px-4 py-3 font-semibold">Lương cơ bản</th>
                        <th className="text-right px-4 py-3 font-semibold">Thưởng</th>
                        <th className="text-right px-4 py-3 font-semibold">Khấu trừ</th>
                        <th className="text-right px-4 py-3 font-semibold">Thực lĩnh</th>
                        <th className="text-left px-4 py-3 font-semibold">Trạng thái</th>
                        <th className="text-right px-4 py-3 font-semibold">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {payrolls.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/60">
                            <td className="px-4 py-3 font-medium">{p.employeeName ?? p.employeeId.slice(0, 6)}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(p.baseSalary)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{formatCurrency(p.bonuses)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-red-600">{formatCurrency(p.deductions)}</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-accent">{formatCurrency(p.netPay)}</td>
                            <td className="px-4 py-3 text-xs">{p.status}</td>
                            <td className="px-4 py-3 text-right">
                                <Link
                                    to={`/backoffice/hr/payroll/${p.id}`}
                                    className="text-accent hover:underline text-xs font-semibold mr-3"
                                >
                                    Xem
                                </Link>
                                {canRecalc && (
                                    <button
                                        onClick={() => onRecalc(p.id)}
                                        disabled={isRecalcPending}
                                        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                                    >
                                        <RefreshCw size={12} className="inline mr-1" />Tính lại
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
