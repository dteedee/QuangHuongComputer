import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useConfirm } from '../../context/ConfirmContext';
import { salaryStructureApi, type CreateSalaryStructureDto, type SalaryStructure } from '../../api/hr';
import { formatCurrency } from '../../utils/format';

interface Props {
    employeeId: string;
    canEdit?: boolean;
}

/**
 * Displays salary structure history timeline for an employee and lets HR add
 * a new structure ("Tăng lương") which auto-sets EndDate of current record.
 */
export function SalaryStructureHistory({ employeeId, canEdit = true }: Props) {
    const qc = useQueryClient();
    const confirm = useConfirm();
    const [modalOpen, setModalOpen] = useState(false);

    const { data: list = [], isLoading } = useQuery({
        queryKey: ['salary-structures', employeeId],
        queryFn: () => salaryStructureApi.list(employeeId),
        enabled: !!employeeId,
    });

    const sorted = [...list].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    const createMut = useMutation({
        mutationFn: async (payload: CreateSalaryStructureDto) => {
            const current = sorted.find(s => !s.endDate);
            if (current) {
                const dayBefore = new Date(payload.effectiveDate);
                dayBefore.setDate(dayBefore.getDate() - 1);
                await salaryStructureApi.update(employeeId, current.id, { endDate: dayBefore.toISOString().split('T')[0] });
            }
            return salaryStructureApi.create(employeeId, payload);
        },
        onSuccess: () => {
            toast.success('Đã tạo cơ cấu lương mới');
            qc.invalidateQueries({ queryKey: ['salary-structures', employeeId] });
            setModalOpen(false);
        },
        onError: () => toast.error('Không thể tạo cơ cấu lương'),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => salaryStructureApi.remove(employeeId, id),
        onSuccess: () => {
            toast.success('Đã xóa');
            qc.invalidateQueries({ queryKey: ['salary-structures', employeeId] });
        },
        onError: () => toast.error('Không thể xóa'),
    });

    const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload: CreateSalaryStructureDto = {
            baseSalary: Number(fd.get('baseSalary')),
            insurableSalary: Number(fd.get('insurableSalary')),
            coefficient: Number(fd.get('coefficient') ?? 1) || 1,
            effectiveDate: String(fd.get('effectiveDate')),
            note: (fd.get('note') as string) || undefined,
        };
        if (!payload.effectiveDate || payload.baseSalary <= 0 || payload.insurableSalary <= 0) {
            toast.error('Nhập đủ thông tin');
            return;
        }
        if (payload.insurableSalary > payload.baseSalary) {
            toast.error('Lương đóng BH không được lớn hơn lương cơ bản');
            return;
        }
        createMut.mutate(payload);
    };

    const handleDelete = async (s: SalaryStructure) => {
        const ok = await confirm({ message: 'Xóa cơ cấu lương này?', variant: 'danger' });
        if (ok) deleteMut.mutate(s.id);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Lịch sử cơ cấu lương</h3>
                {canEdit && (
                    <Button size="sm" icon={TrendingUp} onClick={() => setModalOpen(true)}>Tăng lương</Button>
                )}
            </div>

            {isLoading ? (
                <p className="text-xs text-gray-400">Đang tải...</p>
            ) : sorted.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-6 text-center border border-dashed border-gray-200 rounded-lg">
                    Chưa có cơ cấu lương
                </p>
            ) : (
                <ol className="relative border-l-2 border-accent/20 ml-3 space-y-4">
                    {sorted.map((s, idx) => {
                        const active = !s.endDate;
                        return (
                            <li key={s.id} className="ml-6">
                                <span className={`absolute -left-[9px] flex h-4 w-4 rounded-full ${active ? 'bg-accent ring-4 ring-accent/20' : 'bg-gray-300'}`} />
                                <div className="premium-card p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-900">
                                            Hiệu lực: {fmt(s.effectiveDate)}
                                            {s.endDate ? ` – ${fmt(s.endDate)}` : ' (đang áp dụng)'}
                                        </span>
                                        {active && idx === 0 && (
                                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Hiện tại</span>
                                        )}
                                        {canEdit && !active && (
                                            <button onClick={() => handleDelete(s)} className="text-red-400 hover:text-red-600">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
                                        <div>
                                            <p className="text-gray-400">Lương cơ bản</p>
                                            <p className="font-bold text-slate-900">{formatCurrency(s.baseSalary)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Lương đóng BH</p>
                                            <p className="font-bold text-slate-900">{formatCurrency(s.insurableSalary)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Hệ số</p>
                                            <p className="font-bold text-slate-900">{s.coefficient}</p>
                                        </div>
                                    </div>
                                    {s.note && (
                                        <p className="text-[11px] text-gray-500 mt-2 italic">Ghi chú: {s.note}</p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Tạo cơ cấu lương mới">
                <form onSubmit={handleAdd} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Lương cơ bản (VND) *" name="baseSalary" type="number" required />
                        <Input label="Lương đóng BH (VND) *" name="insurableSalary" type="number" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Hệ số" name="coefficient" type="number" step="0.01" defaultValue="1" />
                        <Input label="Ngày hiệu lực *" name="effectiveDate" type="date" required />
                    </div>
                    <Input label="Ghi chú" name="note" />
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Hủy</Button>
                        <Button type="submit" loading={createMut.isPending} className="flex-1">Tạo</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('vi-VN');
}
