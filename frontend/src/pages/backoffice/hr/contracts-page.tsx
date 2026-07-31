import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertTriangle, RotateCcw, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { useConfirm } from '../../../context/ConfirmContext';
import { ContractForm } from '../../../components/hr/contract-form';
import {
    contractsApi,
    contractTypeLabels,
    contractStatusLabels,
    type ContractStatus,
    type ContractType,
    type EmploymentContract,
    type CreateContractDto,
} from '../../../api/hr';
import { formatCurrency } from '../../../utils/format';

const STATUS_OPTIONS: (ContractStatus | '')[] = ['', 'Draft', 'Active', 'Expired', 'Terminated', 'Renewed'];
const TYPE_OPTIONS: (ContractType | '')[] = ['', 'Probation', 'FixedTerm1Year', 'FixedTerm3Year', 'Permanent', 'Seasonal', 'Internship'];

export default function ContractsPage() {
    const qc = useQueryClient();
    const confirm = useConfirm();
    const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');
    const [typeFilter, setTypeFilter] = useState<ContractType | ''>('');
    const [expiringOnly, setExpiringOnly] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<EmploymentContract | null>(null);

    const [terminateOpen, setTerminateOpen] = useState<EmploymentContract | null>(null);
    const [renewOpen, setRenewOpen] = useState<EmploymentContract | null>(null);

    const { data: contracts = [], isLoading } = useQuery({
        queryKey: ['contracts', statusFilter, typeFilter],
        queryFn: () => contractsApi.list({
            status: statusFilter || undefined,
            type: typeFilter || undefined,
        }),
    });

    const { data: expiring = [] } = useQuery({
        queryKey: ['contracts-expiring'],
        queryFn: () => contractsApi.expiring(30),
    });

    const filtered = useMemo(() => {
        if (!expiringOnly) return contracts;
        const ids = new Set(expiring.map(e => e.id));
        return contracts.filter(c => ids.has(c.id));
    }, [contracts, expiring, expiringOnly]);

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['contracts'] });
        qc.invalidateQueries({ queryKey: ['contracts-expiring'] });
    };

    const createMut = useMutation({
        mutationFn: (payload: CreateContractDto) => contractsApi.create(payload),
        onSuccess: () => { toast.success('Đã tạo HĐ'); invalidate(); setFormOpen(false); setEditing(null); },
        onError: () => toast.error('Không thể tạo'),
    });
    const updateMut = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateContractDto> }) => contractsApi.update(id, payload),
        onSuccess: () => { toast.success('Đã cập nhật'); invalidate(); setFormOpen(false); setEditing(null); },
        onError: () => toast.error('Không thể cập nhật'),
    });
    const terminateMut = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => contractsApi.terminate(id, reason),
        onSuccess: () => { toast.success('Đã chấm dứt HĐ'); invalidate(); setTerminateOpen(null); },
        onError: () => toast.error('Không thể chấm dứt'),
    });
    const renewMut = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: { newEndDate: string; newSalary?: number } }) => contractsApi.renew(id, payload),
        onSuccess: () => { toast.success('Đã gia hạn'); invalidate(); setRenewOpen(null); },
        onError: () => toast.error('Không thể gia hạn'),
    });

    const handleFormSubmit = (payload: CreateContractDto) => {
        if (editing) updateMut.mutate({ id: editing.id, payload });
        else createMut.mutate(payload);
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                        Hợp đồng <span className="text-accent">lao động</span>
                    </h1>
                    <p className="text-xs text-gray-500">Quản lý toàn bộ HĐLĐ và cảnh báo hết hạn</p>
                </div>
                <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Tạo hợp đồng</Button>
            </header>

            {expiring.length > 0 && (
                <div className="premium-card p-5 border-l-4 border-amber-500">
                    <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="text-amber-500" />
                        <h3 className="text-sm font-bold text-amber-800">
                            Cảnh báo: {expiring.length} HĐ sắp hết hạn trong 30 ngày
                        </h3>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                        {expiring.map(e => (
                            <li key={e.id} className="flex justify-between">
                                <span>{e.employeeName} — {contractTypeLabels[e.type]}</span>
                                <span className="text-amber-700 font-semibold">
                                    Hết hạn {new Date(e.endDate).toLocaleDateString('vi-VN')} ({e.daysLeft} ngày)
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <Select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as ContractStatus | '')}
                    placeholder="Tất cả trạng thái"
                    options={STATUS_OPTIONS.map(v => ({ value: v, label: v === '' ? 'Tất cả trạng thái' : contractStatusLabels[v as ContractStatus] }))}
                />
                <Select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value as ContractType | '')}
                    placeholder="Tất cả loại HĐ"
                    options={TYPE_OPTIONS.map(v => ({ value: v, label: v === '' ? 'Tất cả loại HĐ' : contractTypeLabels[v as ContractType] }))}
                />
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={expiringOnly} onChange={e => setExpiringOnly(e.target.checked)} />
                    Chỉ HĐ sắp hết hạn
                </label>
            </div>

            <div className="premium-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-accent/5 text-accent text-xs uppercase">
                        <tr>
                            <th className="text-left px-6 py-4 font-semibold">Nhân viên</th>
                            <th className="text-left px-6 py-4 font-semibold">Số HĐ</th>
                            <th className="text-left px-6 py-4 font-semibold">Loại</th>
                            <th className="text-left px-6 py-4 font-semibold">Bắt đầu</th>
                            <th className="text-left px-6 py-4 font-semibold">Kết thúc</th>
                            <th className="text-right px-6 py-4 font-semibold">Lương HĐ</th>
                            <th className="text-left px-6 py-4 font-semibold">Trạng thái</th>
                            <th className="text-right px-6 py-4 font-semibold">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan={8} className="text-center py-16 text-gray-400">Đang tải...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-16 text-gray-400">Không có HĐ</td></tr>
                        ) : filtered.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => { setEditing(c); setFormOpen(true); }}>
                                <td className="px-6 py-4 font-medium">{c.employeeName ?? c.employeeId.slice(0, 6)}</td>
                                <td className="px-6 py-4 font-mono text-xs">{c.contractNumber}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
                                        {contractTypeLabels[c.type]}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs">{new Date(c.startDate).toLocaleDateString('vi-VN')}</td>
                                <td className="px-6 py-4 text-xs">{c.endDate ? new Date(c.endDate).toLocaleDateString('vi-VN') : 'Không xác định'}</td>
                                <td className="px-6 py-4 text-right font-semibold tabular-nums">{formatCurrency(c.contractSalary)}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={c.status} />
                                </td>
                                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                    {c.status === 'Active' && (
                                        <>
                                            <button
                                                onClick={() => setRenewOpen(c)}
                                                className="text-blue-600 hover:underline text-xs font-semibold mr-3"
                                            >
                                                <RotateCcw size={12} className="inline mr-1" />Gia hạn
                                            </button>
                                            <button
                                                onClick={() => setTerminateOpen(c)}
                                                className="text-red-500 hover:underline text-xs font-semibold"
                                            >
                                                <Ban size={12} className="inline mr-1" />Chấm dứt
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ContractForm
                isOpen={formOpen}
                onClose={() => { setFormOpen(false); setEditing(null); }}
                onSubmit={handleFormSubmit}
                initial={editing}
                loading={createMut.isPending || updateMut.isPending}
            />

            <TerminateModal
                contract={terminateOpen}
                onClose={() => setTerminateOpen(null)}
                onSubmit={reason => terminateOpen && terminateMut.mutate({ id: terminateOpen.id, reason })}
                loading={terminateMut.isPending}
            />
            <RenewModal
                contract={renewOpen}
                onClose={() => setRenewOpen(null)}
                onSubmit={payload => renewOpen && renewMut.mutate({ id: renewOpen.id, payload })}
                loading={renewMut.isPending}
            />
        </div>
    );
}

function StatusBadge({ status }: { status: ContractStatus }) {
    const map: Record<ContractStatus, string> = {
        Draft: 'bg-gray-100 text-gray-700',
        Active: 'bg-emerald-100 text-emerald-700',
        Expired: 'bg-amber-100 text-amber-700',
        Terminated: 'bg-red-100 text-red-700',
        Renewed: 'bg-blue-100 text-blue-700',
    };
    return <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${map[status]}`}>{contractStatusLabels[status]}</span>;
}

function TerminateModal({ contract, onClose, onSubmit, loading }: {
    contract: EmploymentContract | null;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    loading: boolean;
}) {
    const [reason, setReason] = useState('');
    return (
        <Modal isOpen={!!contract} onClose={onClose} title={`Chấm dứt HĐ ${contract?.contractNumber ?? ''}`}>
            <div className="space-y-4">
                <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Nhập lý do chấm dứt..."
                    rows={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
                    <Button
                        type="button"
                        variant="danger"
                        onClick={() => { if (reason.trim()) onSubmit(reason); }}
                        loading={loading}
                        disabled={!reason.trim()}
                        className="flex-1"
                    >
                        Chấm dứt
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function RenewModal({ contract, onClose, onSubmit, loading }: {
    contract: EmploymentContract | null;
    onClose: () => void;
    onSubmit: (payload: { newEndDate: string; newSalary?: number }) => void;
    loading: boolean;
}) {
    const [newEndDate, setNewEndDate] = useState('');
    const [newSalary, setNewSalary] = useState<number | ''>('');
    return (
        <Modal isOpen={!!contract} onClose={onClose} title={`Gia hạn HĐ ${contract?.contractNumber ?? ''}`}>
            <div className="space-y-4">
                <Input
                    label="Ngày kết thúc mới *"
                    type="date"
                    value={newEndDate}
                    onChange={e => setNewEndDate(e.target.value)}
                />
                <Input
                    label="Lương mới (nếu thay đổi)"
                    type="number"
                    value={newSalary === '' ? '' : String(newSalary)}
                    onChange={e => setNewSalary(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
                    <Button
                        type="button"
                        onClick={() => { if (newEndDate) onSubmit({ newEndDate, newSalary: newSalary === '' ? undefined : newSalary }); }}
                        loading={loading}
                        disabled={!newEndDate}
                        className="flex-1"
                    >
                        Gia hạn
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
