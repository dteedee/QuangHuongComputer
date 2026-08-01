import { useCallback, useEffect, useState } from 'react';
import { HandHelping, RefreshCw, Plus, X, ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { warrantyApi, LoanerStatus } from '../../../api/warranty';
import type {
    LoanerDevice, LoanerStatus as LoanerStatusT, CreateLoanerRequest, WarrantyClaim
} from '../../../api/warranty';

const STATUS_META: Record<LoanerStatusT, { label: string; cls: string }> = {
    Loaned: { label: 'Đang mượn', cls: 'bg-blue-100 text-blue-700' },
    Returned: { label: 'Đã trả', cls: 'bg-emerald-100 text-emerald-700' },
    Lost: { label: 'Mất', cls: 'bg-red-100 text-red-700' },
};

export default function LoanerDevicesPage() {
    const [items, setItems] = useState<LoanerDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<LoanerStatusT | ''>('');
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [returning, setReturning] = useState<LoanerDevice | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await warrantyApi.loaner.getList(status || undefined, overdueOnly);
            setItems(list);
        } catch {
            toast.error('Không tải được danh sách máy cho mượn');
        } finally {
            setLoading(false);
        }
    }, [status, overdueOnly]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                            <HandHelping size={22} className="text-white" />
                        </div>
                        Máy cho mượn
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Theo dõi máy cho khách mượn trong thời gian bảo hành.
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
                        Cho mượn
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <select
                    value={status}
                    onChange={e => setStatus(e.target.value as LoanerStatusT | '')}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
                >
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(STATUS_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />
                    <span className="text-red-600 font-semibold">Chỉ quá hạn</span>
                </label>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={24} className="animate-spin text-gray-400" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <HandHelping className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        Chưa có máy đang cho mượn.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase text-xs">
                                    <th className="px-4 py-3 font-semibold">Serial</th>
                                    <th className="px-4 py-3 font-semibold">Khách</th>
                                    <th className="px-4 py-3 font-semibold">Claim liên kết</th>
                                    <th className="px-4 py-3 font-semibold">Mượn</th>
                                    <th className="px-4 py-3 font-semibold">Dự kiến trả</th>
                                    <th className="px-4 py-3 font-semibold">Thực trả</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(l => (
                                    <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-xs">{l.serialNumber || l.serialNumberId.slice(0, 8)}</div>
                                            {l.productName && <div className="text-xs text-gray-500">{l.productName}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>{l.customerName || l.customerId.slice(0, 8)}</div>
                                            {l.customerPhone && <div className="text-xs text-gray-500">{l.customerPhone}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {l.warrantyClaimCode || (l.warrantyClaimId ? `#${l.warrantyClaimId.slice(0, 8)}` : '—')}
                                        </td>
                                        <td className="px-4 py-3 text-xs">{new Date(l.loanedDate).toLocaleDateString('vi-VN')}</td>
                                        <td className="px-4 py-3 text-xs">
                                            <span className={l.isOverdue ? 'text-red-600 font-semibold' : ''}>
                                                {new Date(l.expectedReturnDate).toLocaleDateString('vi-VN')}
                                            </span>
                                            {l.isOverdue && (
                                                <div className="text-red-600 font-semibold text-[10px] flex items-center gap-1">
                                                    <AlertTriangle size={10} />
                                                    Quá hạn
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {l.actualReturnDate ? new Date(l.actualReturnDate).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_META[l.status].cls}`}>
                                                {STATUS_META[l.status].label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {l.status === LoanerStatus.Loaned && (
                                                <button
                                                    onClick={() => setReturning(l)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                                                >
                                                    <ArrowLeft size={12} />
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
                <CreateLoanerModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void load(); }} />
            )}
            {returning && (
                <ReturnLoanerModal loaner={returning} onClose={() => setReturning(null)} onDone={() => { setReturning(null); void load(); }} />
            )}
        </div>
    );
}

// -------------------- Create Loaner --------------------

function CreateLoanerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [eligible, setEligible] = useState<Array<{ id: string; serialNumber: string; productName: string }>>([]);
    const [claims, setClaims] = useState<WarrantyClaim[]>([]);
    const [serialNumberId, setSerialNumberId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [warrantyClaimId, setWarrantyClaimId] = useState('');
    const [expectedReturnDate, setExpectedReturnDate] = useState('');
    const [conditionAtLoan, setConditionAtLoan] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        void warrantyApi.loaner.getEligibleSerials().then(setEligible).catch(() => setEligible([]));
        // Chỉ hiện claim đang xử lý — cho phép gắn máy mượn
        void warrantyApi.admin.getAllClaims({ status: 'Processing' })
            .then(setClaims)
            .catch(() => setClaims([]));
    }, []);

    // Prefill customerId + claimId từ query ?claimId=... (khi mở từ Claim drawer)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const cid = params.get('claimId');
        if (cid && claims.length) {
            const c = claims.find(x => x.id === cid);
            if (c) {
                setWarrantyClaimId(cid);
                if (c.customerId) setCustomerId(c.customerId);
            }
        }
    }, [claims]);

    const submit = async () => {
        if (!serialNumberId) { toast.error('Chọn serial'); return; }
        if (!customerId.trim()) { toast.error('Nhập customer'); return; }
        if (!expectedReturnDate) { toast.error('Chọn ngày dự kiến trả'); return; }
        setSubmitting(true);
        try {
            const payload: CreateLoanerRequest = {
                serialNumberId,
                customerId: customerId.trim(),
                warrantyClaimId: warrantyClaimId || undefined,
                expectedReturnDate,
                conditionAtLoan: conditionAtLoan.trim() || undefined,
                notes: notes.trim() || undefined,
            };
            await warrantyApi.loaner.create(payload);
            toast.success('Đã ghi nhận cho mượn máy');
            onCreated();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Không tạo được');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Cho khách mượn máy</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Serial máy (đủ điều kiện)</label>
                        <select
                            value={serialNumberId}
                            onChange={e => setSerialNumberId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        >
                            <option value="">-- Chọn --</option>
                            {eligible.map(s => (
                                <option key={s.id} value={s.id}>{s.serialNumber} — {s.productName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Customer ID</label>
                        <input
                            type="text"
                            value={customerId}
                            onChange={e => setCustomerId(e.target.value)}
                            placeholder="uuid khách"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Claim liên kết (tuỳ chọn)</label>
                        <select
                            value={warrantyClaimId}
                            onChange={e => setWarrantyClaimId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        >
                            <option value="">-- Không có --</option>
                            {claims.map(c => (
                                <option key={c.id} value={c.id}>
                                    #{c.id.slice(0, 8)} — {c.serialNumber}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày dự kiến trả</label>
                        <input
                            type="date"
                            value={expectedReturnDate}
                            onChange={e => setExpectedReturnDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tình trạng khi giao</label>
                        <input
                            type="text"
                            value={conditionAtLoan}
                            onChange={e => setConditionAtLoan(e.target.value)}
                            placeholder="Máy mới, đủ phụ kiện..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        />
                    </div>
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
                        onClick={submit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting && <RefreshCw size={14} className="animate-spin" />}
                        Cho mượn
                    </button>
                </div>
            </div>
        </div>
    );
}

// -------------------- Return Loaner --------------------

function ReturnLoanerModal({ loaner, onClose, onDone }: { loaner: LoanerDevice; onClose: () => void; onDone: () => void }) {
    const [conditionAtReturn, setConditionAtReturn] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (!conditionAtReturn.trim()) { toast.error('Nhập tình trạng khi nhận'); return; }
        setSubmitting(true);
        try {
            await warrantyApi.loaner.returnDevice(loaner.id, { conditionAtReturn: conditionAtReturn.trim(), notes: notes || undefined });
            toast.success('Đã nhận máy về');
            onDone();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Không nhận được');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        Nhận máy về — {loaner.serialNumber || loaner.serialNumberId.slice(0, 8)}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tình trạng khi nhận</label>
                        <input
                            type="text"
                            value={conditionAtReturn}
                            onChange={e => setConditionAtReturn(e.target.value)}
                            placeholder="Còn nguyên, trầy nhẹ..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        />
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
                        {submitting && <RefreshCw size={14} className="animate-spin" />}
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
}
