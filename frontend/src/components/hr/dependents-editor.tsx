import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useConfirm } from '../../context/ConfirmContext';
import {
    dependentsApi,
    dependentRelationLabels,
    type Dependent,
    type DependentRelation,
    type CreateDependentDto,
} from '../../api/hr';

interface Props {
    employeeId: string;
}

const RELATION_OPTIONS: DependentRelation[] = ['Child', 'Spouse', 'Parent', 'Grandparent', 'Sibling', 'Other'];

export function DependentsEditor({ employeeId }: Props) {
    const qc = useQueryClient();
    const confirm = useConfirm();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Dependent | null>(null);

    const { data: deps = [], isLoading } = useQuery({
        queryKey: ['dependents', employeeId],
        queryFn: () => dependentsApi.list(employeeId),
        enabled: !!employeeId,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: ['dependents', employeeId] });

    const createMut = useMutation({
        mutationFn: (payload: CreateDependentDto) => dependentsApi.create(employeeId, payload),
        onSuccess: () => { toast.success('Thêm người phụ thuộc thành công'); invalidate(); setModalOpen(false); },
        onError: () => toast.error('Không thể thêm'),
    });
    const updateMut = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateDependentDto> }) =>
            dependentsApi.update(employeeId, id, payload),
        onSuccess: () => { toast.success('Cập nhật thành công'); invalidate(); setModalOpen(false); },
        onError: () => toast.error('Không thể cập nhật'),
    });
    const deleteMut = useMutation({
        mutationFn: (id: string) => dependentsApi.remove(employeeId, id),
        onSuccess: () => { toast.success('Đã xóa'); invalidate(); },
        onError: () => toast.error('Không thể xóa'),
    });

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload: CreateDependentDto = {
            fullName: String(fd.get('fullName') ?? '').trim(),
            relation: (fd.get('relation') as DependentRelation) || 'Child',
            birthDate: String(fd.get('birthDate') ?? ''),
            taxCode: (fd.get('taxCode') as string) || undefined,
            deductionStartDate: String(fd.get('deductionStartDate') ?? ''),
            deductionEndDate: (fd.get('deductionEndDate') as string) || undefined,
        };
        if (!payload.fullName || !payload.birthDate || !payload.deductionStartDate) {
            toast.error('Thiếu thông tin bắt buộc');
            return;
        }
        if (editing) updateMut.mutate({ id: editing.id, payload });
        else createMut.mutate(payload);
    };

    const openAdd = () => { setEditing(null); setModalOpen(true); };
    const openEdit = (d: Dependent) => { setEditing(d); setModalOpen(true); };
    const handleDelete = async (d: Dependent) => {
        const ok = await confirm({ message: `Xóa người phụ thuộc "${d.fullName}"?`, variant: 'danger' });
        if (ok) deleteMut.mutate(d.id);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Người phụ thuộc (giảm trừ 4.4tr/người/tháng)</h3>
                <Button size="sm" icon={Plus} onClick={openAdd}>Thêm</Button>
            </div>

            {isLoading ? (
                <p className="text-xs text-gray-400">Đang tải...</p>
            ) : deps.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-6 text-center border border-dashed border-gray-200 rounded-lg">
                    Chưa có người phụ thuộc
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                            <tr>
                                <th className="text-left px-3 py-2">Họ tên</th>
                                <th className="text-left px-3 py-2">Quan hệ</th>
                                <th className="text-left px-3 py-2">Ngày sinh</th>
                                <th className="text-left px-3 py-2">MST</th>
                                <th className="text-left px-3 py-2">Bắt đầu giảm trừ</th>
                                <th className="text-left px-3 py-2">Kết thúc</th>
                                <th className="text-right px-3 py-2">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {deps.map(d => (
                                <tr key={d.id} className="hover:bg-gray-50/60">
                                    <td className="px-3 py-2 font-medium">{d.fullName}</td>
                                    <td className="px-3 py-2">{dependentRelationLabels[d.relation]}</td>
                                    <td className="px-3 py-2">{fmt(d.birthDate)}</td>
                                    <td className="px-3 py-2">{d.taxCode ?? '—'}</td>
                                    <td className="px-3 py-2">{fmt(d.deductionStartDate)}</td>
                                    <td className="px-3 py-2">{d.deductionEndDate ? fmt(d.deductionEndDate) : '—'}</td>
                                    <td className="px-3 py-2 text-right">
                                        <button onClick={() => openEdit(d)} className="text-accent hover:underline mr-3">
                                            <Edit2 size={14} className="inline" />
                                        </button>
                                        <button onClick={() => handleDelete(d)} className="text-red-500 hover:underline">
                                            <Trash2 size={14} className="inline" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Sửa người phụ thuộc' : 'Thêm người phụ thuộc'}
            >
                <form onSubmit={onSubmit} className="space-y-4">
                    <Input label="Họ và tên *" name="fullName" defaultValue={editing?.fullName} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Quan hệ"
                            name="relation"
                            defaultValue={editing?.relation ?? 'Child'}
                            options={RELATION_OPTIONS.map(v => ({ value: v, label: dependentRelationLabels[v] }))}
                        />
                        <Input label="Ngày sinh *" name="birthDate" type="date" defaultValue={editing?.birthDate?.split('T')[0]} required />
                    </div>
                    <Input label="Mã số thuế" name="taxCode" defaultValue={editing?.taxCode} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Bắt đầu giảm trừ *" name="deductionStartDate" type="date" defaultValue={editing?.deductionStartDate?.split('T')[0]} required />
                        <Input label="Kết thúc giảm trừ" name="deductionEndDate" type="date" defaultValue={editing?.deductionEndDate?.split('T')[0]} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Hủy</Button>
                        <Button type="submit" loading={createMut.isPending || updateMut.isPending} className="flex-1">
                            {editing ? 'Cập nhật' : 'Thêm'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('vi-VN');
}
