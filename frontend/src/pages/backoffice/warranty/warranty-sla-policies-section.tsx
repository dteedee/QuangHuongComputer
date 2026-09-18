/**
 * Internal SLA target CRUD (D08 §4 binding, phase-63 decision update):
 * "The internal SLA is shown as an operations target and is clearly marked
 * as not printed for the customer." Distinct from the published/committed
 * turnaround shown on the claim itself (`warranty-claims-page.tsx`).
 */
import { useCallback, useEffect, useState } from 'react';
import { Timer, Plus, Pencil, RefreshCw, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { warrantyApi, ClaimType } from '../../../api/warranty';
import type { WarrantySlaPolicy } from '../../../api/warranty/admin-policies';

interface FormState {
    id?: string;
    claimType: string;
    targetHours: number;
    warningPercent: number;
    isActive: boolean;
}

const empty: FormState = { claimType: 'RepairAtShop', targetHours: 168, warningPercent: 80, isActive: true };

export function WarrantySlaPoliciesSection() {
    const [items, setItems] = useState<WarrantySlaPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<FormState | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setItems(await warrantyApi.slaPolicies.getList());
        } catch {
            toast.error('Không tải được SLA nội bộ');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const handleSave = async () => {
        if (!editing) return;
        setSubmitting(true);
        try {
            const payload = { claimType: editing.claimType, targetHours: editing.targetHours, warningPercent: editing.warningPercent, isActive: editing.isActive };
            if (editing.id) {
                await warrantyApi.slaPolicies.update(editing.id, payload);
                toast.success('Đã cập nhật SLA nội bộ');
            } else {
                await warrantyApi.slaPolicies.create(payload);
                toast.success('Đã tạo SLA nội bộ');
            }
            setEditing(null);
            void load();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi lưu SLA nội bộ');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Timer size={18} className="text-amber-600" />
                        SLA nội bộ (mục tiêu vận hành)
                    </h2>
                    <p className="text-xs text-amber-600 font-semibold mt-1">Không in cho khách — chỉ cảnh báo trong admin.</p>
                </div>
                <button onClick={() => setEditing({ ...empty })} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold">
                    <Plus size={14} /> Tạo SLA
                </button>
            </div>
            {loading ? (
                <div className="p-8 text-center text-gray-400"><RefreshCw className="animate-spin inline" size={20} /></div>
            ) : items.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Chưa có SLA nội bộ nào — dùng mặc định trong code.</div>
            ) : (
                <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <th className="px-4 py-2">Loại xử lý</th><th className="px-4 py-2">Mục tiêu (giờ)</th><th className="px-4 py-2">Cảnh báo ở %</th><th className="px-4 py-2 text-right">Sửa</th>
                    </tr></thead>
                    <tbody>
                        {items.map(s => (
                            <tr key={s.id} className="border-b border-gray-100">
                                <td className="px-4 py-2 font-semibold">{s.claimType}</td>
                                <td className="px-4 py-2">{s.targetHours}h ({(s.targetHours / 24).toFixed(1)} ngày)</td>
                                <td className="px-4 py-2">{s.warningPercent}%</td>
                                <td className="px-4 py-2 text-right">
                                    <button onClick={() => setEditing({ id: s.id, claimType: s.claimType, targetHours: s.targetHours, warningPercent: s.warningPercent, isActive: s.isActive })} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                                        <Pencil size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold">{editing.id ? 'Sửa SLA' : 'Tạo SLA'}</h3>
                            <button onClick={() => setEditing(null)}><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Loại xử lý</label>
                                <select value={editing.claimType} onChange={e => setEditing({ ...editing, claimType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                                    {Object.values(ClaimType).filter(v => v !== 'Refuse').map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Mục tiêu (giờ)</label>
                                <input type="number" value={editing.targetHours} onChange={e => setEditing({ ...editing, targetHours: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Cảnh báo ở (%)</label>
                                <input type="number" value={editing.warningPercent} onChange={e => setEditing({ ...editing, warningPercent: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold">Hủy</button>
                            <button onClick={() => void handleSave()} disabled={submitting} className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Lưu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WarrantySlaPoliciesSection;
