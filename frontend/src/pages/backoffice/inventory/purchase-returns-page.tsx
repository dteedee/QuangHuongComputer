import { useCallback, useEffect, useState } from 'react';
import { PackageX, RefreshCw, Plus, Eye, Send, CheckCircle, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AnimatedSection } from '../../../components/motion/animated-section';
import { useConfirm } from '../../../context/ConfirmContext';
import { purchaseReturnApi, formatCurrency } from '../../../api/inventory';
import type {
    PurchaseReturn,
    PurchaseReturnStatus,
    CreatePurchaseReturnDto,
    PurchaseReturnItem,
} from '../../../api/inventory';

const STATUS_META: Record<PurchaseReturnStatus, { label: string; className: string }> = {
    Draft: { label: 'Nháp', className: 'bg-gray-100 text-gray-700' },
    Confirmed: { label: 'Đã xác nhận', className: 'bg-blue-100 text-blue-700' },
    Shipped: { label: 'Đã gửi NCC', className: 'bg-indigo-100 text-indigo-700' },
    RefundReceived: { label: 'Đã hoàn tiền', className: 'bg-emerald-100 text-emerald-700' },
    Cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
};

export default function PurchaseReturnsPage() {
    const [items, setItems] = useState<PurchaseReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<PurchaseReturnStatus | 'all'>('all');
    const [showCreate, setShowCreate] = useState(false);
    const [detail, setDetail] = useState<PurchaseReturn | null>(null);
    const confirm = useConfirm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await purchaseReturnApi.getList(status);
            setItems(data);
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi tải danh sách trả NCC');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => { void load(); }, [load]);

    const handleConfirmShip = async (r: PurchaseReturn) => {
        const ok = await confirm({ message: `Xác nhận gửi trả NCC phiếu ${r.number}?`, variant: 'info' });
        if (!ok) return;
        try {
            await purchaseReturnApi.confirm(r.id);
            toast.success('Đã xác nhận gửi trả NCC');
            void load();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi xác nhận');
        }
    };

    const handleRefund = async (r: PurchaseReturn) => {
        const amountStr = window.prompt(`Số tiền đã hoàn (VND) cho phiếu ${r.number}:`, String(r.total));
        if (amountStr == null) return;
        const amount = parseFloat(amountStr);
        if (!isFinite(amount) || amount <= 0) { toast.error('Số tiền không hợp lệ'); return; }
        try {
            await purchaseReturnApi.acceptRefund(r.id, amount);
            toast.success('Đã ghi nhận hoàn tiền');
            void load();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi ghi nhận hoàn tiền');
        }
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                            <PackageX size={22} className="text-white" />
                        </div>
                        Trả hàng nhà cung cấp
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Tạo phiếu trả hàng lỗi từ GRN, theo dõi tiến độ giao trả và hoàn tiền.
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
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90"
                    >
                        <Plus size={16} />
                        Tạo trả NCC
                    </button>
                </div>
            </div>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <label className="text-sm text-gray-600 font-medium">Trạng thái:</label>
                <select
                    value={status}
                    onChange={e => setStatus(e.target.value as PurchaseReturnStatus | 'all')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                    <option value="all">Tất cả</option>
                    {(Object.keys(STATUS_META) as PurchaseReturnStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                </select>
            </AnimatedSection>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" delay={0.05}>
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-500">
                        <RefreshCw size={22} className="animate-spin mr-2" /> Đang tải...
                    </div>
                ) : !items.length ? (
                    <div className="text-center py-16">
                        <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">Chưa có phiếu trả NCC nào</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Số phiếu</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">GRN gốc</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nhà cung cấp</th>
                                <th className="text-right px-4 py-3 font-semibold text-gray-600">Tổng tiền</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Ngày</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(r => (
                                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{r.number}</td>
                                    <td className="px-4 py-3 font-mono text-gray-700 text-xs">{r.grnNumber || r.grnId?.slice(0, 8) || '—'}</td>
                                    <td className="px-4 py-3 text-gray-700">{r.supplierName || '—'}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(r.total)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_META[r.status].className}`}>
                                            {STATUS_META[r.status].label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-1.5">
                                            <button
                                                onClick={() => setDetail(r)}
                                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                                            >
                                                <Eye size={13} /> Xem
                                            </button>
                                            {(r.status === 'Draft' || r.status === 'Confirmed') && (
                                                <button
                                                    onClick={() => void handleConfirmShip(r)}
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold"
                                                >
                                                    <Send size={13} /> Xác nhận gửi
                                                </button>
                                            )}
                                            {r.status === 'Shipped' && (
                                                <button
                                                    onClick={() => void handleRefund(r)}
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold"
                                                >
                                                    <CheckCircle size={13} /> Đã hoàn tiền
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </AnimatedSection>

            {showCreate && (
                <CreateReturnModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => { setShowCreate(false); void load(); }}
                />
            )}

            {detail && (
                <ReturnDetailDrawer purchaseReturn={detail} onClose={() => setDetail(null)} />
            )}
        </div>
    );
}

// -------------------- Create Modal --------------------

function CreateReturnModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [defective, setDefective] = useState<{ grnId: string; grnNumber: string; supplierName?: string; rejectedItemCount: number }[]>([]);
    const [grnId, setGrnId] = useState('');
    const [items, setItems] = useState<PurchaseReturnItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [loadingList, setLoadingList] = useState(true);

    useEffect(() => {
        void (async () => {
            setLoadingList(true);
            try {
                const list = await purchaseReturnApi.getDefectiveGrns();
                setDefective(list);
            } catch {
                setDefective([]);
                toast.error('Lỗi tải danh sách GRN có hàng lỗi');
            } finally {
                setLoadingList(false);
            }
        })();
    }, []);

    const addRow = () => setItems(prev => [...prev, { productId: '', quantity: 1, unitPrice: 0, reason: '' }]);
    const updateRow = (idx: number, patch: Partial<PurchaseReturnItem>) => {
        setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    };
    const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (!grnId) { toast.error('Chọn GRN gốc'); return; }
        const valid = items.filter(i => i.productId && i.quantity > 0);
        if (!valid.length) { toast.error('Nhập ít nhất 1 dòng'); return; }
        setSaving(true);
        try {
            const dto: CreatePurchaseReturnDto = { grnId, items: valid };
            await purchaseReturnApi.create(dto);
            toast.success('Đã tạo phiếu trả NCC');
            onCreated();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi tạo phiếu trả');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Tạo phiếu trả NCC</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">GRN có hàng lỗi</label>
                        <select
                            value={grnId}
                            onChange={e => setGrnId(e.target.value)}
                            disabled={loadingList}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">{loadingList ? 'Đang tải...' : '-- Chọn GRN --'}</option>
                            {defective.map(g => (
                                <option key={g.grnId} value={g.grnId}>
                                    {g.grnNumber} — {g.supplierName || 'NCC ?'} — {g.rejectedItemCount} SP lỗi
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-700">Sản phẩm trả</label>
                        <button
                            type="button"
                            onClick={addRow}
                            className="text-sm text-[var(--accent-primary,#e11d48)] font-semibold hover:underline"
                        >
                            + Thêm dòng
                        </button>
                    </div>

                    {items.length > 0 ? (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Product ID</th>
                                        <th className="text-center px-3 py-2 font-semibold text-gray-600 w-20">SL</th>
                                        <th className="text-right px-3 py-2 font-semibold text-gray-600 w-28">Đơn giá</th>
                                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Lý do</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, idx) => (
                                        <tr key={idx} className="border-b border-gray-100">
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={it.productId}
                                                    onChange={e => updateRow(idx, { productId: e.target.value })}
                                                    placeholder="Nhập Product ID"
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={it.quantity}
                                                    onChange={e => updateRow(idx, { quantity: parseInt(e.target.value) || 1 })}
                                                    className="w-full text-center px-2 py-1 border border-gray-300 rounded"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={it.unitPrice || 0}
                                                    onChange={e => updateRow(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                                    className="w-full text-right px-2 py-1 border border-gray-300 rounded"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={it.reason || ''}
                                                    onChange={e => updateRow(idx, { reason: e.target.value })}
                                                    placeholder="Ví dụ: Hư màn hình"
                                                    className="w-full px-2 py-1 border border-gray-300 rounded"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button onClick={() => removeRow(idx)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Chưa có dòng nào. Bấm "+ Thêm dòng".</p>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Hủy</button>
                    <button
                        onClick={() => void handleSubmit()}
                        disabled={saving || !grnId}
                        className="px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? 'Đang lưu...' : 'Tạo phiếu'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// -------------------- Detail Drawer --------------------

function ReturnDetailDrawer({ purchaseReturn, onClose }: { purchaseReturn: PurchaseReturn; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
            <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Chi tiết phiếu {purchaseReturn.number}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="text-sm text-gray-600">
                        <div>NCC: <span className="font-semibold text-gray-900">{purchaseReturn.supplierName || '—'}</span></div>
                        <div>GRN gốc: <span className="font-mono">{purchaseReturn.grnNumber || purchaseReturn.grnId || '—'}</span></div>
                        <div>Tổng: <span className="font-bold text-gray-900">{formatCurrency(purchaseReturn.total)}</span></div>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Sản phẩm</th>
                                    <th className="text-center px-3 py-2 font-semibold text-gray-600">SL</th>
                                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Đơn giá</th>
                                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Lý do</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(purchaseReturn.items || []).map((it, idx) => (
                                    <tr key={idx} className="border-b border-gray-100">
                                        <td className="px-3 py-2">
                                            <div className="font-medium">{it.productName || it.productId.slice(0, 8)}</div>
                                            {it.sku && <div className="text-xs text-gray-500">{it.sku}</div>}
                                        </td>
                                        <td className="px-3 py-2 text-center">{it.quantity}</td>
                                        <td className="px-3 py-2 text-right">{it.unitPrice ? formatCurrency(it.unitPrice) : '—'}</td>
                                        <td className="px-3 py-2 text-xs text-gray-700">{it.reason || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
