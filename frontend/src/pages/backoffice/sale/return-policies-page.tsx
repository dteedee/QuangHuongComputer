import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, RefreshCw, Pencil, Trash2, X, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { salesApi } from '../../../api/sales';
import type { ReturnPolicy } from '../../../api/sales';
import { useConfirm } from '../../../context/ConfirmContext';

interface PolicyFormState extends Omit<ReturnPolicy, 'id'> {
    id?: string;
}

const emptyForm: PolicyFormState = {
    daysForReturn: 7,
    daysForExchange: 15,
    daysForDefectReplace: 7,
    requireOriginalPackaging: true,
    requireAllAccessories: true,
    restockingFeePercent: 0,
    excludedCategories: [],
    categoryId: '',
};

export default function ReturnPoliciesPage() {
    const [items, setItems] = useState<ReturnPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<PolicyFormState | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const confirm = useConfirm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await salesApi.orders.returnPolicies.getList();
            setItems(list);
        } catch {
            toast.error('Không tải được chính sách đổi trả');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const openCreate = () => setEditing({ ...emptyForm });
    const openEdit = (p: ReturnPolicy) => setEditing({ ...p });

    const handleSave = async () => {
        if (!editing) return;
        if (editing.daysForReturn < 0 || editing.daysForExchange < 0 || editing.daysForDefectReplace < 0) {
            toast.error('Số ngày không hợp lệ');
            return;
        }
        if (editing.restockingFeePercent < 0 || editing.restockingFeePercent > 100) {
            toast.error('Restocking Fee % phải trong [0, 100]');
            return;
        }
        setSubmitting(true);
        try {
            const payload: ReturnPolicy = {
                categoryId: editing.categoryId || undefined,
                daysForReturn: editing.daysForReturn,
                daysForExchange: editing.daysForExchange,
                daysForDefectReplace: editing.daysForDefectReplace,
                requireOriginalPackaging: editing.requireOriginalPackaging,
                requireAllAccessories: editing.requireAllAccessories,
                restockingFeePercent: editing.restockingFeePercent,
                excludedCategories: editing.excludedCategories || [],
            };
            if (editing.id) {
                await salesApi.orders.returnPolicies.update(editing.id, payload);
                toast.success('Đã cập nhật chính sách');
            } else {
                await salesApi.orders.returnPolicies.create(payload);
                toast.success('Đã tạo chính sách');
            }
            setEditing(null);
            void load();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Không lưu được chính sách');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (p: ReturnPolicy) => {
        if (!p.id) return;
        const ok = await confirm({ message: 'Xoá chính sách này?', variant: 'danger' });
        if (!ok) return;
        try {
            await salesApi.orders.returnPolicies.delete(p.id);
            toast.success('Đã xoá');
            void load();
        } catch {
            toast.error('Xoá thất bại');
        }
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                            <FileText size={22} className="text-white" />
                        </div>
                        Chính sách đổi trả
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Số ngày cho phép đổi/trả và phí restocking theo danh mục.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => void load()}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Làm mới
                    </button>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90"
                    >
                        <Plus size={16} />
                        Tạo chính sách
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={24} className="animate-spin text-gray-400" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        Chưa có chính sách nào. Nhấn "Tạo chính sách".
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase text-xs">
                                <th className="px-4 py-3 font-semibold">Danh mục</th>
                                <th className="px-4 py-3 font-semibold text-center">Trả (ngày)</th>
                                <th className="px-4 py-3 font-semibold text-center">Đổi (ngày)</th>
                                <th className="px-4 py-3 font-semibold text-center">Đổi lỗi (ngày)</th>
                                <th className="px-4 py-3 font-semibold text-center">Restocking %</th>
                                <th className="px-4 py-3 font-semibold text-center">Điều kiện</th>
                                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(p => (
                                <tr key={p.id ?? p.categoryId ?? 'default'} className="border-b border-gray-100">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">
                                            {p.categoryId ? `Category ${p.categoryId.slice(0, 8)}` : 'Mặc định'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">{p.daysForReturn}</td>
                                    <td className="px-4 py-3 text-center">{p.daysForExchange}</td>
                                    <td className="px-4 py-3 text-center">{p.daysForDefectReplace}</td>
                                    <td className="px-4 py-3 text-center">{p.restockingFeePercent}%</td>
                                    <td className="px-4 py-3 text-center text-xs">
                                        {p.requireOriginalPackaging && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded mr-1">
                                                <CheckCircle size={10} /> Seal
                                            </span>
                                        )}
                                        {p.requireAllAccessories && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                <CheckCircle size={10} /> Đủ PK
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-1">
                                        <button
                                            onClick={() => openEdit(p)}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                                            title="Sửa"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        {p.id && (
                                            <button
                                                onClick={() => void handleDelete(p)}
                                                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                                                title="Xoá"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editing && (
                <PolicyModal
                    form={editing}
                    setForm={setEditing}
                    onSave={handleSave}
                    submitting={submitting}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}

function PolicyModal({
    form,
    setForm,
    onSave,
    onClose,
    submitting,
}: {
    form: PolicyFormState;
    setForm: (f: PolicyFormState) => void;
    onSave: () => void;
    onClose: () => void;
    submitting: boolean;
}) {
    const upd = <K extends keyof PolicyFormState>(k: K, v: PolicyFormState[K]) => setForm({ ...form, [k]: v });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        {form.id ? 'Sửa chính sách' : 'Tạo chính sách'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Category ID (bỏ trống = áp mặc định)</label>
                        <input
                            type="text"
                            value={form.categoryId ?? ''}
                            onChange={e => upd('categoryId', e.target.value)}
                            placeholder="uuid hoặc để trống"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <NumField label="Trả (ngày)" v={form.daysForReturn} on={n => upd('daysForReturn', n)} />
                        <NumField label="Đổi (ngày)" v={form.daysForExchange} on={n => upd('daysForExchange', n)} />
                        <NumField label="Đổi lỗi (ngày)" v={form.daysForDefectReplace} on={n => upd('daysForDefectReplace', n)} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Restocking Fee (%)</label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={form.restockingFeePercent}
                            onChange={e => upd('restockingFeePercent', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="inline-flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.requireOriginalPackaging}
                                onChange={e => upd('requireOriginalPackaging', e.target.checked)}
                            />
                            Yêu cầu nguyên seal
                        </label>
                        <br />
                        <label className="inline-flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.requireAllAccessories}
                                onChange={e => upd('requireAllAccessories', e.target.checked)}
                            />
                            Yêu cầu đủ phụ kiện
                        </label>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onSave}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting && <RefreshCw size={14} className="animate-spin" />}
                        Lưu
                    </button>
                </div>
            </div>
        </div>
    );
}

function NumField({ label, v, on }: { label: string; v: number; on: (n: number) => void }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            <input
                type="number"
                min={0}
                value={v}
                onChange={e => on(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none text-center"
            />
        </div>
    );
}
