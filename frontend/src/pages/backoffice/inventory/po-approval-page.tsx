import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Check, X, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AnimatedSection } from '../../../components/motion/animated-section';
import { useConfirm } from '../../../context/ConfirmContext';
import { poApprovalApi, formatCurrency } from '../../../api/inventory';
import type { PendingApprovalPO } from '../../../api/inventory';

export default function PoApprovalPage() {
    const [items, setItems] = useState<PendingApprovalPO[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [detailPo, setDetailPo] = useState<PendingApprovalPO | null>(null);
    const [rejectTarget, setRejectTarget] = useState<PendingApprovalPO | null>(null);
    const [busy, setBusy] = useState(false);
    const confirm = useConfirm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await poApprovalApi.getPending();
            setItems(data);
            setSelected(new Set());
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi tải danh sách PO chờ duyệt');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === items.length) setSelected(new Set());
        else setSelected(new Set(items.map(i => i.id)));
    };

    const doApprove = async (ids: string[]) => {
        if (!ids.length) return;
        const ok = await confirm({
            message: ids.length === 1 ? `Duyệt PO này?` : `Duyệt ${ids.length} PO đã chọn?`,
            variant: 'info',
        });
        if (!ok) return;
        setBusy(true);
        let ok_count = 0;
        for (const id of ids) {
            try {
                await poApprovalApi.approve(id);
                ok_count++;
            } catch {
                // Continue with remaining
            }
        }
        toast.success(`Đã duyệt ${ok_count}/${ids.length} PO`);
        setBusy(false);
        void load();
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <ShieldCheck size={22} className="text-white" />
                        </div>
                        Duyệt đơn mua hàng
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        PO chờ duyệt theo hạn mức: &lt;50tr (Trưởng kho) · 50-200tr (Quản lý) · &gt;200tr (Giám đốc).
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
                        onClick={() => void doApprove(Array.from(selected))}
                        disabled={busy || !selected.size}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <Check size={16} />
                        Duyệt {selected.size ? `(${selected.size})` : 'hàng loạt'}
                    </button>
                </div>
            </div>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-500">
                        <RefreshCw size={22} className="animate-spin mr-2" /> Đang tải...
                    </div>
                ) : !items.length ? (
                    <div className="text-center py-16">
                        <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">Không có PO nào chờ duyệt</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="w-12 px-3 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selected.size === items.length && items.length > 0}
                                        onChange={toggleAll}
                                    />
                                </th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Số PO</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nhà cung cấp</th>
                                <th className="text-right px-4 py-3 font-semibold text-gray-600">Tổng tiền</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Cấp duyệt</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Ngày tạo</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Người tạo</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(po => (
                                <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                    <td className="px-3 py-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(po.id)}
                                            onChange={() => toggleSelect(po.id)}
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{po.poNumber}</td>
                                    <td className="px-4 py-3 text-gray-700">{po.supplierName || po.supplierId.slice(0, 8)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(po.totalAmount)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                                            {po.approvalLevelName || (po.approvalLevel != null ? `Cấp ${po.approvalLevel}` : '—')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                        {new Date(po.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 text-xs">{po.createdByName || '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-1.5">
                                            <button
                                                onClick={() => setDetailPo(po)}
                                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                                            >
                                                <Eye size={13} /> Chi tiết
                                            </button>
                                            <button
                                                onClick={() => void doApprove([po.id])}
                                                disabled={busy}
                                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold disabled:opacity-50"
                                            >
                                                <Check size={13} /> Duyệt
                                            </button>
                                            <button
                                                onClick={() => setRejectTarget(po)}
                                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold"
                                            >
                                                <X size={13} /> Từ chối
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </AnimatedSection>

            {detailPo && <PoDetailDrawer po={detailPo} onClose={() => setDetailPo(null)} />}
            {rejectTarget && (
                <RejectPoModal
                    po={rejectTarget}
                    onClose={() => setRejectTarget(null)}
                    onDone={() => { setRejectTarget(null); void load(); }}
                />
            )}
        </div>
    );
}

// -------------------- Detail Drawer --------------------

function PoDetailDrawer({ po, onClose }: { po: PendingApprovalPO; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
            <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Chi tiết PO {po.poNumber}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <div className="text-xs text-gray-500">Nhà cung cấp</div>
                            <div className="font-semibold">{po.supplierName || '—'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Người tạo</div>
                            <div className="font-semibold">{po.createdByName || '—'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Ngày tạo</div>
                            <div className="font-semibold">{new Date(po.createdAt).toLocaleString('vi-VN')}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Cấp duyệt</div>
                            <div className="font-semibold">{po.approvalLevelName || `Cấp ${po.approvalLevel}`}</div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Sản phẩm</th>
                                    <th className="text-center px-3 py-2 font-semibold text-gray-600">SL</th>
                                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Đơn giá</th>
                                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(po.items || []).map((it, idx) => (
                                    <tr key={idx} className="border-b border-gray-100">
                                        <td className="px-3 py-2">
                                            <div className="font-medium">{it.productName || it.productId.slice(0, 8)}</div>
                                        </td>
                                        <td className="px-3 py-2 text-center">{it.quantity}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(it.unitPrice)}</td>
                                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(it.quantity * it.unitPrice)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50">
                                    <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">Tổng cộng</td>
                                    <td className="px-3 py-2 text-right font-bold text-gray-900">{formatCurrency(po.totalAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// -------------------- Reject Modal --------------------

function RejectPoModal({ po, onClose, onDone }: { po: PendingApprovalPO; onClose: () => void; onDone: () => void }) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) { toast.error('Nhập lý do từ chối'); return; }
        setSaving(true);
        try {
            await poApprovalApi.reject(po.id, reason.trim());
            toast.success('Đã từ chối PO');
            onDone();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi từ chối');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Từ chối PO {po.poNumber}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-3">
                    <label className="block text-xs font-semibold text-gray-600">Lý do từ chối (bắt buộc)</label>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={4}
                        placeholder="Ví dụ: Giá cao hơn đơn tương tự tháng trước 15%"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Hủy</button>
                    <button
                        onClick={() => void handleSubmit()}
                        disabled={saving || !reason.trim()}
                        className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                        {saving ? 'Đang xử lý...' : 'Từ chối'}
                    </button>
                </div>
            </div>
        </div>
    );
}
