/**
 * Technicians directory CRUD (W3-15 step 5). No dedicated deactivate/
 * soft-delete endpoint exists yet — `isAvailable:false` is the closest
 * equivalent (`docs/api-contracts/repair.md` "Known gaps"); filed as an
 * integration request rather than faked here.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertCircle, Pencil, Plus, RefreshCw, UserCog, X } from 'lucide-react';
import { repairApi } from '../../../api/repair';
import { formatCurrency } from '../../../utils/format';

interface FormState {
    id?: string;
    name: string;
    specialty: string;
    hourlyRate: number;
    isAvailable: boolean;
}

const empty: FormState = { name: '', specialty: '', hourlyRate: 100000, isAvailable: true };

export default function TechniciansDirectoryPage() {
    const [editing, setEditing] = useState<FormState | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const queryClient = useQueryClient();

    const { data: technicians = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['repair-technicians'],
        queryFn: () => repairApi.admin.getTechnicians(),
    });

    const createMutation = useMutation({
        mutationFn: (data: { name: string; specialty: string; hourlyRate?: number }) => repairApi.admin.createTechnician(data),
        onSuccess: () => {
            toast.success('Đã tạo kỹ thuật viên');
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: ['repair-technicians'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.error || 'Không tạo được'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: { name: string; specialty: string; hourlyRate: number; isAvailable?: boolean } }) =>
            repairApi.admin.updateTechnician(id, data),
        onSuccess: () => {
            toast.success('Đã cập nhật');
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: ['repair-technicians'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.error || 'Không cập nhật được'),
    });

    const handleSave = () => {
        if (!editing) return;
        if (!editing.name.trim()) { toast.error('Nhập tên kỹ thuật viên'); return; }
        setSubmitting(true);
        if (editing.id) {
            updateMutation.mutate({
                id: editing.id,
                data: { name: editing.name.trim(), specialty: editing.specialty.trim(), hourlyRate: editing.hourlyRate, isAvailable: editing.isAvailable },
            }, { onSettled: () => setSubmitting(false) });
        } else {
            createMutation.mutate({ name: editing.name.trim(), specialty: editing.specialty.trim(), hourlyRate: editing.hourlyRate }, { onSettled: () => setSubmitting(false) });
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Kỹ thuật viên</h1>
                    <p className="text-gray-500 text-sm mt-1">Danh sách kỹ thuật viên sửa chữa, khối lượng công việc hiện tại</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => void refetch()} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Làm mới
                    </button>
                    <button onClick={() => setEditing({ ...empty })} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:opacity-90">
                        <Plus size={16} /> Thêm kỹ thuật viên
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-16 text-center text-gray-400"><RefreshCw className="animate-spin inline-block mb-2" size={24} /><p>Đang tải...</p></div>
                ) : isError ? (
                    <div className="p-16 text-center text-red-500">
                        <AlertCircle className="inline-block mb-2" size={24} /><p>Không tải được danh sách kỹ thuật viên.</p>
                        <button onClick={() => void refetch()} className="mt-3 text-sm underline">Thử lại</button>
                    </div>
                ) : technicians.length === 0 ? (
                    <div className="p-16 text-center text-gray-400"><UserCog className="mx-auto mb-2 text-gray-300" size={32} /><p>Chưa có kỹ thuật viên nào.</p></div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase text-xs">
                                <th className="px-4 py-3 font-semibold">Tên</th>
                                <th className="px-4 py-3 font-semibold">Chuyên môn</th>
                                <th className="px-4 py-3 font-semibold text-right">Giá công/giờ</th>
                                <th className="px-4 py-3 font-semibold text-center">Đang xử lý</th>
                                <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {technicians.map(t => (
                                <tr key={t.id} className="border-b border-gray-100">
                                    <td className="px-4 py-3 font-semibold text-gray-900">{t.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{t.specialty || '—'}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(t.hourlyRate)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${t.activeWorkOrders > 3 ? 'bg-red-100 text-red-700' : t.activeWorkOrders > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {t.activeWorkOrders} phiếu
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {t.isAvailable ? (
                                            <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700">Sẵn sàng</span>
                                        ) : (
                                            <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500">Ngừng nhận việc</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => setEditing({ id: t.id, name: t.name, specialty: t.specialty, hourlyRate: t.hourlyRate, isAvailable: t.isAvailable })}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                                            title="Sửa"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">{editing.id ? 'Sửa kỹ thuật viên' : 'Thêm kỹ thuật viên'}</h2>
                            <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên *</label>
                                <input type="text" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Chuyên môn</label>
                                <input type="text" value={editing.specialty} onChange={e => setEditing({ ...editing, specialty: e.target.value })} placeholder="Laptop, PC, mạng..." className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Giá công/giờ (VNĐ)</label>
                                <input type="number" value={editing.hourlyRate} onChange={e => setEditing({ ...editing, hourlyRate: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                            </div>
                            {editing.id && (
                                <label className="inline-flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={editing.isAvailable} onChange={e => setEditing({ ...editing, isAvailable: e.target.checked })} />
                                    Đang sẵn sàng nhận việc
                                </label>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold">Hủy</button>
                            <button onClick={handleSave} disabled={submitting} className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">Lưu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
