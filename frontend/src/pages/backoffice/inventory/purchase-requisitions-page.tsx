import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, RefreshCw, Plus, Search, CheckCircle, ArrowRight, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AnimatedSection } from '../../../components/motion/animated-section';
import { useConfirm } from '../../../context/ConfirmContext';
import RequisitionCreateModal from '../../../components/inventory/requisition-create-modal';
import {
    requisitionApi,
    inventoryApi,
    formatCurrency,
} from '../../../api/inventory';
import type {
    PurchaseRequisition,
    RequisitionStatus,
    UrgencyLevel,
    SupplierDropdownItem,
} from '../../../api/inventory';

const URGENCY_META: Record<UrgencyLevel, { label: string; className: string }> = {
    Low: { label: 'Thấp', className: 'bg-gray-100 text-gray-700' },
    Normal: { label: 'Thường', className: 'bg-blue-100 text-blue-700' },
    High: { label: 'Cao', className: 'bg-orange-100 text-orange-700' },
    Urgent: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700' },
};

const STATUS_META: Record<RequisitionStatus, { label: string; className: string }> = {
    Draft: { label: 'Nháp', className: 'bg-gray-100 text-gray-700' },
    Submitted: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-800' },
    Approved: { label: 'Đã duyệt', className: 'bg-emerald-100 text-emerald-700' },
    Rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700' },
    Converted: { label: 'Đã chuyển PO', className: 'bg-indigo-100 text-indigo-700' },
    Cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-red-500' },
};

export default function PurchaseRequisitionsPage() {
    const [items, setItems] = useState<PurchaseRequisition[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<RequisitionStatus | 'all'>('all');
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [convertTarget, setConvertTarget] = useState<PurchaseRequisition | null>(null);
    const confirm = useConfirm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await requisitionApi.getList(status);
            setItems(data);
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi tải danh sách đề nghị mua');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => { void load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(r =>
            r.number.toLowerCase().includes(q)
            || (r.requestedByName || '').toLowerCase().includes(q)
            || (r.reason || '').toLowerCase().includes(q)
        );
    }, [items, search]);

    const handleApprove = async (req: PurchaseRequisition) => {
        const ok = await confirm({ message: `Duyệt đề nghị ${req.number}?`, variant: 'info' });
        if (!ok) return;
        try {
            await requisitionApi.approve(req.id);
            toast.success('Đã duyệt đề nghị');
            void load();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi duyệt đề nghị');
        }
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                            <ClipboardList size={22} className="text-white" />
                        </div>
                        Đề nghị mua hàng
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Nhân viên và AutoReorder gửi đề nghị; quản lý duyệt và chuyển thành PO.
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
                        Tạo đề nghị
                    </button>
                </div>
            </div>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[240px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm theo số phiếu, người đề nghị, lý do..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                </div>
                <select
                    value={status}
                    onChange={e => setStatus(e.target.value as RequisitionStatus | 'all')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                    <option value="all">Tất cả trạng thái</option>
                    {(Object.keys(STATUS_META) as RequisitionStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                </select>
            </AnimatedSection>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" delay={0.05}>
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-500">
                        <RefreshCw size={22} className="animate-spin mr-2" /> Đang tải...
                    </div>
                ) : !filtered.length ? (
                    <div className="text-center py-16">
                        <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">Không có đề nghị nào phù hợp</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Số phiếu</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Người đề nghị</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Mức khẩn</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Số SP</th>
                                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ước tính</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Ngày</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(req => (
                                <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{req.number}</td>
                                    <td className="px-4 py-3 text-gray-700">{req.requestedByName || '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${URGENCY_META[req.urgency].className}`}>
                                            {URGENCY_META[req.urgency].label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">{req.itemCount}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(req.estimatedTotal)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_META[req.status].className}`}>
                                            {STATUS_META[req.status].label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                        {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-1.5">
                                            {req.status === 'Submitted' && (
                                                <button
                                                    onClick={() => void handleApprove(req)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold"
                                                >
                                                    <CheckCircle size={13} /> Duyệt
                                                </button>
                                            )}
                                            {req.status === 'Approved' && (
                                                <button
                                                    onClick={() => setConvertTarget(req)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold"
                                                >
                                                    <ArrowRight size={13} /> Chuyển PO
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
                <RequisitionCreateModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => { setShowCreate(false); void load(); }}
                />
            )}

            {convertTarget && (
                <ConvertToPoModal
                    requisition={convertTarget}
                    onClose={() => setConvertTarget(null)}
                    onDone={() => { setConvertTarget(null); void load(); }}
                />
            )}
        </div>
    );
}

// -------------------- Convert-to-PO inline modal (small, keep here) --------------------

interface ConvertProps {
    requisition: PurchaseRequisition;
    onClose: () => void;
    onDone: () => void;
}

function ConvertToPoModal({ requisition, onClose, onDone }: ConvertProps) {
    const [suppliers, setSuppliers] = useState<SupplierDropdownItem[]>([]);
    const [supplierId, setSupplierId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        void (async () => {
            try {
                const list = await inventoryApi.getSuppliersDropdown();
                setSuppliers(list);
            } catch {
                toast.error('Lỗi tải danh sách NCC');
            }
        })();
    }, []);

    const handleSubmit = async () => {
        if (!supplierId) { toast.error('Chọn NCC'); return; }
        setSaving(true);
        try {
            const res = await requisitionApi.convertToPO(requisition.id, supplierId);
            toast.success(`Đã tạo PO ${res.poNumber}`);
            onDone();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi chuyển sang PO');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Chuyển thành PO</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-3">
                    <div className="text-sm text-gray-600">Đề nghị: <span className="font-mono font-semibold text-gray-900">{requisition.number}</span></div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Chọn nhà cung cấp</label>
                        <select
                            value={supplierId}
                            onChange={e => setSupplierId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">-- Chọn NCC --</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Hủy</button>
                    <button
                        onClick={() => void handleSubmit()}
                        disabled={saving || !supplierId}
                        className="px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? 'Đang xử lý...' : 'Tạo PO'}
                    </button>
                </div>
            </div>
        </div>
    );
}
