import { useCallback, useEffect, useState } from 'react';
import { Package, Plus, RefreshCw, Send, CheckCircle, X, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { warrantyApi, RmaStatus, RmaResult } from '../../../api/warranty';
import type {
    WarrantyRma, RmaItem, RmaStatus as RmaStatusT, RmaResult as RmaResultT,
    CreateRmaRequest, WarrantyClaim
} from '../../../api/warranty';
import { inventoryApi } from '../../../api/inventory';
import type { SupplierDropdownItem } from '../../../api/inventory';

const STATUS_META: Record<RmaStatusT, { label: string; cls: string }> = {
    Draft: { label: 'Nháp', cls: 'bg-gray-100 text-gray-700' },
    Sent: { label: 'Đã gửi hãng', cls: 'bg-indigo-100 text-indigo-700' },
    Received: { label: 'Đã nhận về', cls: 'bg-emerald-100 text-emerald-700' },
    Closed: { label: 'Đã đóng', cls: 'bg-green-100 text-green-700' },
    Cancelled: { label: 'Đã hủy', cls: 'bg-red-100 text-red-700' },
};

const RESULT_META: Record<RmaResultT, { label: string; cls: string }> = {
    Repaired: { label: 'Sửa xong', cls: 'bg-blue-100 text-blue-700' },
    Replaced: { label: 'Đổi mới', cls: 'bg-purple-100 text-purple-700' },
    Refunded: { label: 'Hoàn tiền', cls: 'bg-emerald-100 text-emerald-700' },
    Rejected: { label: 'Từ chối', cls: 'bg-red-100 text-red-700' },
};

export default function WarrantyRmaPage() {
    const [items, setItems] = useState<WarrantyRma[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<RmaStatusT | ''>('');
    const [showCreate, setShowCreate] = useState(false);
    const [sending, setSending] = useState<WarrantyRma | null>(null);
    const [receiving, setReceiving] = useState<WarrantyRma | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await warrantyApi.rma.getList(statusFilter || undefined);
            setItems(list);
        } catch {
            toast.error('Không tải được RMA');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                            <Package size={22} className="text-white" />
                        </div>
                        RMA — Gửi hãng
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Theo dõi các lô máy gửi hãng bảo hành, mã RMA và ngày trả.
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
                        Tạo RMA
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as RmaStatusT | '')}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
                >
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(STATUS_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={24} className="animate-spin text-gray-400" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        Chưa có RMA.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase text-xs">
                                    <th className="px-4 py-3 font-semibold">Mã</th>
                                    <th className="px-4 py-3 font-semibold">Supplier</th>
                                    <th className="px-4 py-3 font-semibold">Ext. RMA</th>
                                    <th className="px-4 py-3 font-semibold text-center">Serial</th>
                                    <th className="px-4 py-3 font-semibold">Gửi</th>
                                    <th className="px-4 py-3 font-semibold">Dự kiến nhận</th>
                                    <th className="px-4 py-3 font-semibold">Thực nhận</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Kết quả</th>
                                    <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(r => (
                                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                                        <td className="px-4 py-3">{r.supplierName || r.supplierId.slice(0, 8)}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{r.externalRmaCode || '—'}</td>
                                        <td className="px-4 py-3 text-center font-semibold">{r.items.length}</td>
                                        <td className="px-4 py-3 text-xs">
                                            {r.sentDate ? new Date(r.sentDate).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <div className={r.isOverdue ? 'text-red-600 font-semibold' : ''}>
                                                {r.expectedReturnDate ? new Date(r.expectedReturnDate).toLocaleDateString('vi-VN') : '—'}
                                                {r.isOverdue && (
                                                    <div className="text-red-600 font-semibold text-[10px] flex items-center gap-1">
                                                        <AlertTriangle size={10} />
                                                        Quá hạn
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {r.actualReturnDate ? new Date(r.actualReturnDate).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_META[r.status].cls}`}>
                                                {STATUS_META[r.status].label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.result && (
                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${RESULT_META[r.result].cls}`}>
                                                    {RESULT_META[r.result].label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-1">
                                            {r.status === RmaStatus.Draft && (
                                                <button
                                                    onClick={() => setSending(r)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                                                >
                                                    <Send size={12} />
                                                    Gửi hãng
                                                </button>
                                            )}
                                            {r.status === RmaStatus.Sent && (
                                                <button
                                                    onClick={() => setReceiving(r)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                                                >
                                                    <CheckCircle size={12} />
                                                    Nhận về
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreate && (
                <CreateRmaModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void load(); }} />
            )}
            {sending && (
                <SendRmaModal rma={sending} onClose={() => setSending(null)} onDone={() => { setSending(null); void load(); }} />
            )}
            {receiving && (
                <ReceiveRmaModal rma={receiving} onClose={() => setReceiving(null)} onDone={() => { setReceiving(null); void load(); }} />
            )}
        </div>
    );
}

// -------------------- Create RMA --------------------

function CreateRmaModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [suppliers, setSuppliers] = useState<SupplierDropdownItem[]>([]);
    const [supplierId, setSupplierId] = useState('');
    const [availableClaims, setAvailableClaims] = useState<WarrantyClaim[]>([]);
    const [selectedClaimIds, setSelectedClaimIds] = useState<Set<string>>(new Set());
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        void inventoryApi.getSuppliersDropdown().then(setSuppliers).catch(() => setSuppliers([]));
        // Lấy claim đã Assigned với claimType=SendToManufacturer
        void warrantyApi.admin.getAllClaims({ claimType: 'SendToManufacturer' })
            .then(list => setAvailableClaims(list.filter(c => !c.rmaId)))
            .catch(() => setAvailableClaims([]));
    }, []);

    const toggle = (id: string) => {
        const next = new Set(selectedClaimIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedClaimIds(next);
    };

    const items: RmaItem[] = availableClaims
        .filter(c => selectedClaimIds.has(c.id))
        .map(c => ({
            serialNumber: c.serialNumber,
            productName: c.productName,
            issue: c.issueDescription,
            warrantyClaimId: c.id,
        }));

    const handleCreate = async () => {
        if (!supplierId) { toast.error('Chọn nhà cung cấp'); return; }
        if (items.length === 0) { toast.error('Chọn ít nhất 1 claim'); return; }
        setSubmitting(true);
        try {
            const payload: CreateRmaRequest = { supplierId, items, notes: notes || undefined };
            await warrantyApi.rma.create(payload);
            toast.success('Đã tạo RMA');
            onCreated();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Không tạo được RMA');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Tạo RMA gửi hãng</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nhà cung cấp</label>
                        <select
                            value={supplierId}
                            onChange={e => setSupplierId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        >
                            <option value="">-- Chọn --</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Chọn claim (gán loại "Gửi hãng", chưa vào RMA)
                        </label>
                        {availableClaims.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 border border-dashed border-gray-300 rounded-xl text-sm">
                                Không có claim nào phù hợp.
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                {availableClaims.map(c => (
                                    <label
                                        key={c.id}
                                        className="flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedClaimIds.has(c.id)}
                                            onChange={() => toggle(c.id)}
                                        />
                                        <div className="flex-1">
                                            <div className="font-mono text-xs">{c.serialNumber}</div>
                                            <div className="text-xs text-gray-600">{c.productName || '—'}</div>
                                            <div className="text-[11px] text-gray-500 truncate">{c.issueDescription}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {items.length > 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
                            <b>Preview:</b> {items.length} serial sẽ được đưa vào RMA.
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none"
                        />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">Hủy</button>
                    <button
                        onClick={handleCreate}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting && <RefreshCw size={14} className="animate-spin" />}
                        Tạo RMA
                    </button>
                </div>
            </div>
        </div>
    );
}

// -------------------- Send RMA --------------------

function SendRmaModal({ rma, onClose, onDone }: { rma: WarrantyRma; onClose: () => void; onDone: () => void }) {
    const [externalRmaCode, setExternalRmaCode] = useState('');
    const [expectedReturnDate, setExpectedReturnDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (!externalRmaCode.trim() || !expectedReturnDate) {
            toast.error('Nhập mã RMA hãng và ngày dự kiến nhận');
            return;
        }
        setSubmitting(true);
        try {
            await warrantyApi.rma.send(rma.id, { externalRmaCode: externalRmaCode.trim(), expectedReturnDate });
            toast.success('Đã gửi hãng');
            onDone();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Không gửi được');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Gửi RMA {rma.code}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Mã RMA của hãng</label>
                        <input
                            type="text"
                            value={externalRmaCode}
                            onChange={e => setExternalRmaCode(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày dự kiến nhận</label>
                        <input
                            type="date"
                            value={expectedReturnDate}
                            onChange={e => setExpectedReturnDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">Hủy</button>
                    <button
                        onClick={submit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                        Gửi
                    </button>
                </div>
            </div>
        </div>
    );
}

// -------------------- Receive RMA --------------------

function ReceiveRmaModal({ rma, onClose, onDone }: { rma: WarrantyRma; onClose: () => void; onDone: () => void }) {
    const [result, setResult] = useState<RmaResultT>('Repaired');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            await warrantyApi.rma.receive(rma.id, { result, notes: notes || undefined });
            toast.success('Đã ghi nhận nhận về từ hãng');
            onDone();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Không cập nhật được');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Nhận RMA {rma.code}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Kết quả từ hãng</label>
                        <select
                            value={result}
                            onChange={e => setResult(e.target.value as RmaResultT)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        >
                            {Object.entries(RESULT_META).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none"
                        />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">Hủy</button>
                    <button
                        onClick={submit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
}
