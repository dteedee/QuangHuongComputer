import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import {
    hrApi,
    employeeAssetsApi,
    assetTypeLabels,
    assetConditionLabels,
    type Employee,
    type EmployeeAsset,
    type AssetType,
    type AssetCondition,
    type CreateAssetDto,
    type ReturnAssetDto,
} from '../../../api/hr';
import { formatCurrency } from '../../../utils/format';

const TYPE_OPTIONS: AssetType[] = ['Laptop', 'Desktop', 'Phone', 'Monitor', 'Uniform', 'Vehicle', 'Other'];
const CONDITION_OPTIONS: AssetCondition[] = ['New', 'Good', 'Fair', 'Damaged', 'Lost'];

export default function EmployeeAssetsPage() {
    const qc = useQueryClient();
    const [selectedEmp, setSelectedEmp] = useState<string>('');
    const [showAll, setShowAll] = useState(true);
    const [assignOpen, setAssignOpen] = useState(false);
    const [returnAsset, setReturnAsset] = useState<EmployeeAsset | null>(null);

    const { data: empResp } = useQuery({
        queryKey: ['employees', 'asset-picker'],
        queryFn: () => hrApi.getEmployees(1, 500),
    });

    const empOptions = useMemo(() => {
        const items = empResp?.items ?? [];
        return items.map((e: Employee) => ({ value: e.id, label: `${e.fullName}${e.employeeCode ? ' · ' + e.employeeCode : ''}` }));
    }, [empResp]);

    const empById = useMemo(() => {
        const map: Record<string, Employee> = {};
        (empResp?.items ?? []).forEach(e => { map[e.id] = e; });
        return map;
    }, [empResp]);

    const { data: assets = [], isLoading } = useQuery({
        queryKey: ['assets', showAll ? 'all' : selectedEmp],
        queryFn: () => employeeAssetsApi.list(showAll ? undefined : selectedEmp),
        enabled: showAll || !!selectedEmp,
    });

    const assignMut = useMutation({
        mutationFn: ({ empId, payload }: { empId: string; payload: CreateAssetDto }) => employeeAssetsApi.assign(empId, payload),
        onSuccess: () => { toast.success('Đã cấp phát'); qc.invalidateQueries({ queryKey: ['assets'] }); setAssignOpen(false); },
        onError: () => toast.error('Không thể cấp phát'),
    });
    const returnMut = useMutation({
        mutationFn: ({ empId, assetId, payload }: { empId: string; assetId: string; payload: ReturnAssetDto }) =>
            employeeAssetsApi.return(empId, assetId, payload),
        onSuccess: () => { toast.success('Đã thu hồi'); qc.invalidateQueries({ queryKey: ['assets'] }); setReturnAsset(null); },
        onError: () => toast.error('Không thể thu hồi'),
    });

    // Alert if employees quit with unreturned assets
    const alerts = useMemo(() => {
        return assets.filter(a => {
            if (a.returnedDate) return false;
            const emp = empById[a.employeeId];
            return emp && (emp.status === 'Resigned' || emp.status === 'Terminated' || emp.status === 'Inactive');
        });
    }, [assets, empById]);

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                        Tài sản <span className="text-accent">cấp phát</span>
                    </h1>
                    <p className="text-xs text-gray-500 font-medium">Laptop, phone, đồng phục cấp cho nhân viên</p>
                </div>
                <Button icon={Plus} onClick={() => setAssignOpen(true)}>Cấp phát tài sản</Button>
            </header>

            {alerts.length > 0 && (
                <div className="premium-card p-4 border-l-4 border-amber-500 flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 mt-1" size={20} />
                    <div>
                        <h3 className="text-sm font-bold text-amber-800">
                            {alerts.length} tài sản chưa thu hồi từ NV đã nghỉ việc
                        </h3>
                        <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
                            {alerts.slice(0, 5).map(a => (
                                <li key={a.id}>{a.employeeName ?? empById[a.employeeId]?.fullName} — {assetTypeLabels[a.type]} {a.code}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
                    Tất cả nhân viên
                </label>
                {!showAll && (
                    <div className="min-w-[280px]">
                        <SearchableSelect
                            options={empOptions}
                            value={selectedEmp}
                            onChange={setSelectedEmp}
                            placeholder="Chọn nhân viên..."
                        />
                    </div>
                )}
            </div>

            <div className="premium-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-accent/5 text-accent text-xs uppercase">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold">Nhân viên</th>
                            <th className="text-left px-4 py-3 font-semibold">Loại</th>
                            <th className="text-left px-4 py-3 font-semibold">Mã</th>
                            <th className="text-left px-4 py-3 font-semibold">Serial</th>
                            <th className="text-left px-4 py-3 font-semibold">Ngày cấp</th>
                            <th className="text-right px-4 py-3 font-semibold">Giá trị</th>
                            <th className="text-left px-4 py-3 font-semibold">Tình trạng</th>
                            <th className="text-left px-4 py-3 font-semibold">Ngày thu hồi</th>
                            <th className="text-right px-4 py-3 font-semibold">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan={9} className="text-center py-16 text-gray-400">Đang tải...</td></tr>
                        ) : assets.length === 0 ? (
                            <tr><td colSpan={9} className="text-center py-16 text-gray-400">Không có tài sản</td></tr>
                        ) : assets.map(a => (
                            <tr key={a.id} className="hover:bg-gray-50/60">
                                <td className="px-4 py-3 font-medium">{a.employeeName ?? empById[a.employeeId]?.fullName ?? a.employeeId.slice(0, 6)}</td>
                                <td className="px-4 py-3">{assetTypeLabels[a.type]}</td>
                                <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                                <td className="px-4 py-3 text-xs">
                                    {a.serialNumber ? (
                                        <a href={`/backoffice/inventory/serial-trace?serial=${encodeURIComponent(a.serialNumber)}`} className="text-accent hover:underline">
                                            {a.serialNumber}
                                        </a>
                                    ) : '—'}
                                </td>
                                <td className="px-4 py-3 text-xs">{new Date(a.assignedDate).toLocaleDateString('vi-VN')}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(a.value)}</td>
                                <td className="px-4 py-3">{assetConditionLabels[a.condition]}</td>
                                <td className="px-4 py-3 text-xs">
                                    {a.returnedDate ? (
                                        <span className="text-emerald-600">{new Date(a.returnedDate).toLocaleDateString('vi-VN')}</span>
                                    ) : <span className="text-gray-400">Chưa thu hồi</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {!a.returnedDate && (
                                        <button onClick={() => setReturnAsset(a)} className="text-blue-600 hover:underline text-xs font-semibold">
                                            <RotateCcw size={12} className="inline mr-1" />Thu hồi
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AssignAssetModal
                isOpen={assignOpen}
                onClose={() => setAssignOpen(false)}
                employeeOptions={empOptions}
                onSubmit={(empId, payload) => assignMut.mutate({ empId, payload })}
                loading={assignMut.isPending}
            />

            <ReturnAssetModal
                asset={returnAsset}
                onClose={() => setReturnAsset(null)}
                onSubmit={payload => returnAsset && returnMut.mutate({ empId: returnAsset.employeeId, assetId: returnAsset.id, payload })}
                loading={returnMut.isPending}
            />
        </div>
    );
}

function AssignAssetModal({ isOpen, onClose, employeeOptions, onSubmit, loading }: {
    isOpen: boolean;
    onClose: () => void;
    employeeOptions: Array<{ value: string; label: string }>;
    onSubmit: (empId: string, payload: CreateAssetDto) => void;
    loading: boolean;
}) {
    const [empId, setEmpId] = useState('');

    const handle = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!empId) return toast.error('Chọn nhân viên');
        const fd = new FormData(e.currentTarget);
        onSubmit(empId, {
            type: fd.get('type') as AssetType,
            code: String(fd.get('code') ?? '').trim(),
            serialNumber: (fd.get('serialNumber') as string) || undefined,
            name: String(fd.get('name') ?? '').trim(),
            value: Number(fd.get('value')),
            condition: fd.get('condition') as AssetCondition,
            assignedDate: String(fd.get('assignedDate') ?? ''),
            notes: (fd.get('notes') as string) || undefined,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cấp phát tài sản">
            <form onSubmit={handle} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">Nhân viên *</label>
                    <SearchableSelect options={employeeOptions} value={empId} onChange={setEmpId} placeholder="Chọn nhân viên..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Loại tài sản *"
                        name="type"
                        defaultValue="Laptop"
                        options={TYPE_OPTIONS.map(v => ({ value: v, label: assetTypeLabels[v] }))}
                    />
                    <Select
                        label="Tình trạng *"
                        name="condition"
                        defaultValue="New"
                        options={CONDITION_OPTIONS.map(v => ({ value: v, label: assetConditionLabels[v] }))}
                    />
                </div>
                <Input label="Tên tài sản *" name="name" required />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Mã *" name="code" required />
                    <Input label="Serial (nếu có)" name="serialNumber" hint="Tra cứu từ Inventory" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Giá trị (VND) *" name="value" type="number" required />
                    <Input label="Ngày cấp *" name="assignedDate" type="date" required />
                </div>
                <Input label="Ghi chú" name="notes" />
                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
                    <Button type="submit" loading={loading} className="flex-1">Cấp phát</Button>
                </div>
            </form>
        </Modal>
    );
}

function ReturnAssetModal({ asset, onClose, onSubmit, loading }: {
    asset: EmployeeAsset | null;
    onClose: () => void;
    onSubmit: (payload: ReturnAssetDto) => void;
    loading: boolean;
}) {
    const [condition, setCondition] = useState<AssetCondition>('Good');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    return (
        <Modal isOpen={!!asset} onClose={onClose} title={`Thu hồi tài sản: ${asset?.name ?? ''}`}>
            <div className="space-y-4">
                <Select
                    label="Tình trạng khi thu hồi *"
                    value={condition}
                    onChange={e => setCondition(e.target.value as AssetCondition)}
                    options={CONDITION_OPTIONS.map(v => ({ value: v, label: assetConditionLabels[v] }))}
                />
                <Input label="Ngày thu hồi *" type="date" value={date} onChange={e => setDate(e.target.value)} />
                <Input label="Ghi chú" value={notes} onChange={e => setNotes(e.target.value)} />
                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
                    <Button
                        type="button"
                        onClick={() => onSubmit({ returnCondition: condition, returnedDate: date, notes: notes || undefined })}
                        loading={loading}
                        className="flex-1"
                    >
                        Xác nhận thu hồi
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
