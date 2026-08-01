import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Plus, RefreshCw, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { warrantyApi, WarrantyProvider } from '../../../api/warranty';
import type { WarrantyPolicy, CreateWarrantyPolicyRequest, WarrantyProvider as WarrantyProviderT } from '../../../api/warranty';
import { useConfirm } from '../../../context/ConfirmContext';

interface FormState {
    id?: string;
    name: string;
    scope: string;
    exclusions: string;   // textarea join by newlines
    durationMonths: number;
    provider: WarrantyProviderT;
    categoryId: string;
    isActive: boolean;
}

const empty: FormState = {
    name: '',
    scope: '',
    exclusions: '',
    durationMonths: 12,
    provider: 'Manufacturer',
    categoryId: '',
    isActive: true,
};

export default function WarrantyPoliciesPage() {
    const [items, setItems] = useState<WarrantyPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<FormState | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const confirm = useConfirm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await warrantyApi.policies.getList();
            setItems(list);
        } catch {
            toast.error('Không tải được chính sách bảo hành');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const openCreate = () => setEditing({ ...empty });
    const openEdit = (p: WarrantyPolicy) => setEditing({
        id: p.id,
        name: p.name,
        scope: p.scope,
        exclusions: (p.exclusions || []).join('\n'),
        durationMonths: p.durationMonths,
        provider: p.provider,
        categoryId: p.categoryId || '',
        isActive: p.isActive,
    });

    const handleSave = async () => {
        if (!editing) return;
        if (!editing.name.trim()) { toast.error('Nhập tên chính sách'); return; }
        if (editing.durationMonths <= 0) { toast.error('Thời hạn phải > 0'); return; }
        setSubmitting(true);
        try {
            const payload: CreateWarrantyPolicyRequest = {
                name: editing.name.trim(),
                scope: editing.scope.trim(),
                exclusions: editing.exclusions.split('\n').map(l => l.trim()).filter(Boolean),
                durationMonths: editing.durationMonths,
                provider: editing.provider,
                categoryId: editing.categoryId.trim() || undefined,
                isActive: editing.isActive,
            };
            if (editing.id) {
                await warrantyApi.policies.update(editing.id, payload);
                toast.success('Đã cập nhật');
            } else {
                await warrantyApi.policies.create(payload);
                toast.success('Đã tạo');
            }
            setEditing(null);
            void load();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi lưu');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (p: WarrantyPolicy) => {
        const ok = await confirm({ message: 'Xoá chính sách này?', variant: 'danger' });
        if (!ok) return;
        try {
            await warrantyApi.policies.delete(p.id);
            toast.success('Đã xoá');
            void load();
        } catch {
            toast.error('Không xoá được');
        }
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <ShieldCheck size={22} className="text-white" />
                        </div>
                        Chính sách bảo hành
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Cấu hình phạm vi, thời hạn và loại trừ theo hãng/shop.
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
                        <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        Chưa có chính sách nào.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase text-xs">
                                <th className="px-4 py-3 font-semibold">Tên</th>
                                <th className="px-4 py-3 font-semibold">Provider</th>
                                <th className="px-4 py-3 font-semibold text-center">Thời hạn</th>
                                <th className="px-4 py-3 font-semibold">Phạm vi</th>
                                <th className="px-4 py-3 font-semibold">Loại trừ</th>
                                <th className="px-4 py-3 font-semibold text-center">Active</th>
                                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(p => (
                                <tr key={p.id} className="border-b border-gray-100">
                                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${
                                            p.provider === WarrantyProvider.Manufacturer
                                                ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                            {p.provider === WarrantyProvider.Manufacturer ? 'Hãng' : 'Shop'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">{p.durationMonths} tháng</td>
                                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[220px] truncate">{p.scope}</td>
                                    <td className="px-4 py-3 text-xs">
                                        <ul className="list-disc list-inside space-y-0.5 max-w-[220px]">
                                            {(p.exclusions || []).slice(0, 3).map((e, i) => (
                                                <li key={i} className="truncate">{e}</li>
                                            ))}
                                            {(p.exclusions || []).length > 3 && (
                                                <li className="text-gray-400">+{p.exclusions.length - 3} khác</li>
                                            )}
                                        </ul>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {p.isActive ? (
                                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                                        ) : (
                                            <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
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
                                        <button
                                            onClick={() => void handleDelete(p)}
                                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                                            title="Xoá"
                                        >
                                            <Trash2 size={14} />
                                        </button>
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
                    onClose={() => setEditing(null)}
                    submitting={submitting}
                />
            )}
        </div>
    );
}

function PolicyModal({ form, setForm, onSave, onClose, submitting }: {
    form: FormState;
    setForm: (f: FormState) => void;
    onSave: () => void;
    onClose: () => void;
    submitting: boolean;
}) {
    const upd = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">{form.id ? 'Sửa chính sách' : 'Tạo chính sách'}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tên *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => upd('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Provider</label>
                            <select
                                value={form.provider}
                                onChange={e => upd('provider', e.target.value as WarrantyProviderT)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                            >
                                <option value="Manufacturer">Hãng (Manufacturer)</option>
                                <option value="Store">Shop (Store)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Thời hạn (tháng)</label>
                            <input
                                type="number"
                                min={1}
                                value={form.durationMonths}
                                onChange={e => upd('durationMonths', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Phạm vi bảo hành</label>
                        <textarea
                            value={form.scope}
                            onChange={e => upd('scope', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Loại trừ (mỗi dòng 1 mục — vd: Rơi vỡ, Vào nước, Tự tháo máy)
                        </label>
                        <textarea
                            value={form.exclusions}
                            onChange={e => upd('exclusions', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Category ID (bỏ trống = mặc định)</label>
                        <input
                            type="text"
                            value={form.categoryId}
                            onChange={e => upd('categoryId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono"
                        />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.isActive} onChange={e => upd('isActive', e.target.checked)} />
                        Đang áp dụng
                    </label>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">Hủy</button>
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
