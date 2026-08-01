import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Shield, RefreshCw, Plus, X, Wrench, Send, Package, AlertTriangle,
    Clock, CheckCircle, XCircle, Printer, FileText, User
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { warrantyApi, ClaimStatus, ClaimType, WarrantyProvider } from '../../../api/warranty';
import type {
    WarrantyClaim, WarrantyCoverage, CreateClaimRequest, ClaimListFilter,
    ClaimStatus as ClaimStatusT, ClaimType as ClaimTypeT
} from '../../../api/warranty';
import { repairApi } from '../../../api/repair';
import WarrantyReceiptPrint from '../../../components/warranty/warranty-receipt-print';

const STATUS_LABELS: Record<ClaimStatusT, { label: string; cls: string; icon: React.ComponentType<{ size?: number | string }> }> = {
    Pending: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700', icon: Clock },
    Approved: { label: 'Đã duyệt', cls: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    Rejected: { label: 'Từ chối', cls: 'bg-red-100 text-red-700', icon: XCircle },
    Assigned: { label: 'Đã phân', cls: 'bg-indigo-100 text-indigo-700', icon: Wrench },
    Processing: { label: 'Đang xử lý', cls: 'bg-purple-100 text-purple-700', icon: RefreshCw },
    Resolved: { label: 'Đã giải quyết', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    Completed: { label: 'Hoàn tất', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
};

const CLAIM_TYPE_LABELS: Record<ClaimTypeT, string> = {
    RepairAtShop: 'Sửa tại shop',
    SendToManufacturer: 'Gửi hãng (RMA)',
    ExchangeNew: 'Đổi mới',
    Refuse: 'Từ chối',
};

function statusBadge(s: ClaimStatusT) {
    const meta = STATUS_LABELS[s] || STATUS_LABELS.Pending;
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${meta.cls}`}>
            <Icon size={11} />
            {meta.label}
        </span>
    );
}

function slaBar(claim: WarrantyClaim) {
    if (!claim.slaTargetHours) return null;
    const pct = Math.min(100, Math.max(0, claim.slaElapsedPercent ?? 0));
    const color = pct >= 100 ? 'bg-red-600' : pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-500';
    return (
        <div className="w-24">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <div className={`text-[10px] mt-0.5 ${pct >= 80 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                {pct.toFixed(0)}% / {claim.slaTargetHours}h
            </div>
        </div>
    );
}

export default function WarrantyClaimsPage() {
    const [claims, setClaims] = useState<WarrantyClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<WarrantyClaim | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showReceipt, setShowReceipt] = useState<string | null>(null);

    // Filters
    const [status, setStatus] = useState<ClaimStatusT | ''>('');
    const [claimType, setClaimType] = useState<ClaimTypeT | ''>('');
    const [slaWarning, setSlaWarning] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const filter: ClaimListFilter = {};
            if (status) filter.status = status;
            if (claimType) filter.claimType = claimType;
            if (slaWarning) filter.slaWarning = true;
            if (startDate) filter.startDate = startDate;
            if (endDate) filter.endDate = endDate;
            const data = await warrantyApi.admin.getAllClaims(filter);
            setClaims(data);
        } catch {
            toast.error('Không tải được danh sách claim');
        } finally {
            setLoading(false);
        }
    }, [status, claimType, slaWarning, startDate, endDate]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Shield size={22} className="text-white" />
                        </div>
                        Yêu cầu bảo hành
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Tiếp nhận, phân loại và xử lý claim theo SLA.
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
                        Tạo claim
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <select
                    value={status}
                    onChange={e => setStatus(e.target.value as ClaimStatusT | '')}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
                >
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <select
                    value={claimType}
                    onChange={e => setClaimType(e.target.value as ClaimTypeT | '')}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
                >
                    <option value="">Tất cả loại xử lý</option>
                    {Object.entries(CLAIM_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
                />
                <label className="inline-flex items-center gap-2 text-sm ml-auto">
                    <input type="checkbox" checked={slaWarning} onChange={e => setSlaWarning(e.target.checked)} />
                    <span className="text-red-600 font-semibold">Chỉ SLA cảnh báo</span>
                </label>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={24} className="animate-spin text-gray-400" />
                    </div>
                ) : claims.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        Chưa có yêu cầu bảo hành.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase text-xs">
                                    <th className="px-4 py-3 font-semibold">Mã</th>
                                    <th className="px-4 py-3 font-semibold">Serial</th>
                                    <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                                    <th className="px-4 py-3 font-semibold">Khách</th>
                                    <th className="px-4 py-3 font-semibold">Loại</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">SLA</th>
                                    <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                                    <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {claims.map(c => (
                                    <tr
                                        key={c.id}
                                        onClick={() => setSelected(c)}
                                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-gray-700">#{c.id.slice(0, 8)}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{c.serialNumber}</td>
                                        <td className="px-4 py-3">{c.productName || '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm">{c.customerName || '—'}</div>
                                            {c.customerPhone && <div className="text-xs text-gray-500">{c.customerPhone}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {c.claimType ? CLAIM_TYPE_LABELS[c.claimType] : '—'}
                                        </td>
                                        <td className="px-4 py-3">{statusBadge(c.status)}</td>
                                        <td className="px-4 py-3">
                                            {slaBar(c) ?? (c.slaWarning ? (
                                                <span className="text-red-600 font-semibold text-xs">Cảnh báo</span>
                                            ) : <span className="text-gray-400 text-xs">—</span>)}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">
                                            {new Date(c.filedDate).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowReceipt(c.id); }}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                                                title="In phiếu"
                                            >
                                                <Printer size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Drawer chi tiết */}
            {selected && (
                <ClaimDrawer
                    claim={selected}
                    onClose={() => setSelected(null)}
                    onChanged={() => { void load(); setSelected(null); }}
                    onPrint={() => setShowReceipt(selected.id)}
                />
            )}

            {/* Modal tạo claim */}
            {showCreate && (
                <CreateClaimModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => { setShowCreate(false); void load(); }}
                />
            )}

            {/* Modal in phiếu */}
            {showReceipt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
                        <div className="p-6">
                            <WarrantyReceiptPrint claimId={showReceipt} onClose={() => setShowReceipt(null)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// -------------------- Drawer chi tiết claim --------------------

function ClaimDrawer({ claim, onClose, onChanged, onPrint }: {
    claim: WarrantyClaim;
    onClose: () => void;
    onChanged: () => void;
    onPrint: () => void;
}) {
    const [assignType, setAssignType] = useState<ClaimTypeT>('RepairAtShop');
    const [technicianId, setTechnicianId] = useState('');
    const [technicians, setTechnicians] = useState<Array<{ id: string; name: string; specialty: string; isAvailable: boolean }>>([]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (assignType === 'RepairAtShop') {
            void repairApi.admin.getTechnicians().then(setTechnicians).catch(() => setTechnicians([]));
        }
    }, [assignType]);

    const handleAssign = async () => {
        setSubmitting(true);
        try {
            const res = await warrantyApi.admin.assignClaim(claim.id, {
                claimType: assignType,
                technicianId: technicianId || undefined,
                notes: notes || undefined,
            });
            toast.success(`Đã phân xử lý (${CLAIM_TYPE_LABELS[assignType]})`);
            if (res.rmaId) toast.success(`Tạo RMA ${res.rmaId.slice(0, 8)}...`);
            if (res.workOrderId) toast.success(`Tạo Work Order ${res.workOrderId.slice(0, 8)}...`);
            onChanged();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Không phân được claim');
        } finally {
            setSubmitting(false);
        }
    };

    const handleComplete = async () => {
        setSubmitting(true);
        try {
            await warrantyApi.admin.completeClaim(claim.id, { result: 'Success', notes });
            toast.success('Đã hoàn tất claim');
            onChanged();
        } catch {
            toast.error('Không hoàn tất được');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-50">
            <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Claim #{claim.id.slice(0, 8)}</h2>
                        <div className="mt-1">{statusBadge(claim.status)}</div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Serial + Product + Provider */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                        <div><b>Serial:</b> <span className="font-mono">{claim.serialNumber}</span></div>
                        <div><b>Sản phẩm:</b> {claim.productName || '—'}</div>
                        {claim.warrantyProvider && (
                            <div>
                                <b>Loại BH:</b>{' '}
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                                    claim.warrantyProvider === WarrantyProvider.Manufacturer
                                        ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                    {claim.warrantyProvider === WarrantyProvider.Manufacturer ? 'Hãng' : 'Shop'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Khách */}
                    <div className="bg-gray-50 rounded-xl p-4 text-sm">
                        <div className="text-xs uppercase text-gray-500 font-bold mb-1 flex items-center gap-1">
                            <User size={12} /> Khách hàng
                        </div>
                        <div className="font-semibold">{claim.customerName || '—'}</div>
                        {claim.customerPhone && <div className="text-xs text-gray-600">{claim.customerPhone}</div>}
                    </div>

                    {/* Mô tả lỗi */}
                    <div className="bg-gray-50 rounded-xl p-4 text-sm">
                        <div className="text-xs uppercase text-gray-500 font-bold mb-1">Mô tả lỗi</div>
                        <div className="whitespace-pre-wrap">{claim.issueDescription}</div>
                    </div>

                    {/* SLA */}
                    {claim.slaWarning && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            <span className="font-semibold">Cảnh báo SLA — đã vượt 80% thời hạn</span>
                        </div>
                    )}

                    {/* Attachments */}
                    {claim.attachmentUrls && claim.attachmentUrls.length > 0 && (
                        <div>
                            <div className="text-xs uppercase text-gray-500 font-bold mb-2">Ảnh đính kèm</div>
                            <div className="flex flex-wrap gap-2">
                                {claim.attachmentUrls.map((u, i) => (
                                    <a key={i} href={u} target="_blank" rel="noreferrer">
                                        <img src={u} className="w-20 h-20 object-cover rounded border" alt={`att-${i}`} />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Assign panel: chỉ khi status Pending/Approved và chưa có claimType */}
                    {(claim.status === ClaimStatus.Pending || claim.status === ClaimStatus.Approved) && !claim.claimType && (
                        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                            <div className="text-sm font-bold text-gray-900">Phân loại xử lý</div>
                            <select
                                value={assignType}
                                onChange={e => setAssignType(e.target.value as ClaimTypeT)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                            >
                                {Object.entries(CLAIM_TYPE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                            {assignType === ClaimType.RepairAtShop && (
                                <select
                                    value={technicianId}
                                    onChange={e => setTechnicianId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                                >
                                    <option value="">-- Chọn kỹ thuật viên --</option>
                                    {technicians.filter(t => t.isAvailable).map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.specialty})</option>
                                    ))}
                                </select>
                            )}
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Ghi chú xử lý..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none"
                            />
                            <button
                                onClick={handleAssign}
                                disabled={submitting}
                                className="w-full inline-flex items-center justify-center gap-2 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                            >
                                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                Xác nhận phân xử lý
                            </button>
                        </div>
                    )}

                    {/* Hoàn tất */}
                    {(claim.status === ClaimStatus.Assigned || claim.status === ClaimStatus.Processing) && (
                        <button
                            onClick={handleComplete}
                            disabled={submitting}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Hoàn tất claim
                        </button>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={onPrint}
                            className="inline-flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            <Printer size={14} />
                            In phiếu
                        </button>
                        {claim.workOrderId && (
                            <a
                                href={`/backoffice/tech/work-orders/${claim.workOrderId}`}
                                className="inline-flex items-center justify-center gap-2 py-2 border border-blue-300 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-50"
                            >
                                <Wrench size={14} />
                                Work Order
                            </a>
                        )}
                        {claim.rmaId && (
                            <a
                                href={`/backoffice/warranty/rma`}
                                className="inline-flex items-center justify-center gap-2 py-2 border border-amber-300 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50"
                            >
                                <Package size={14} />
                                Xem RMA
                            </a>
                        )}
                        <a
                            href={`/backoffice/warranty/loaner-devices?claimId=${claim.id}`}
                            className="inline-flex items-center justify-center gap-2 py-2 border border-purple-300 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-50"
                        >
                            <FileText size={14} />
                            Cho mượn máy
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// -------------------- Modal tạo claim --------------------

function CreateClaimModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [serial, setSerial] = useState('');
    const [coverage, setCoverage] = useState<WarrantyCoverage | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [lookingUp, setLookingUp] = useState(false);
    const [issueDescription, setIssueDescription] = useState('');
    const [accessoriesReceived, setAccessoriesReceived] = useState('');
    const [receivedCondition, setReceivedCondition] = useState('');
    const [attachmentUrls, setAttachmentUrls] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isExpired = useMemo(() => coverage && !coverage.isValid, [coverage]);

    const doLookup = async () => {
        if (!serial.trim()) return;
        setLookingUp(true);
        setLookupError(null);
        setCoverage(null);
        try {
            const res = await warrantyApi.lookupCoverage(serial.trim());
            setCoverage(res);
        } catch (err) {
            setLookupError((err as Error).message || 'Không tìm thấy bảo hành');
        } finally {
            setLookingUp(false);
        }
    };

    const handleCreate = async () => {
        if (!coverage) {
            toast.error('Tra cứu serial trước');
            return;
        }
        if (isExpired) {
            toast.error('Serial hết hạn — tạo Work Order sửa chữa có phí thay vì claim.');
            return;
        }
        if (!issueDescription.trim()) {
            toast.error('Nhập mô tả lỗi');
            return;
        }
        setSubmitting(true);
        try {
            const payload: CreateClaimRequest = {
                serialNumber: serial.trim(),
                issueDescription: issueDescription.trim(),
                accessoriesReceived: accessoriesReceived.trim() || undefined,
                receivedCondition: receivedCondition.trim() || undefined,
                attachmentUrls: attachmentUrls
                    .split('\n')
                    .map(l => l.trim())
                    .filter(Boolean),
            };
            await warrantyApi.createClaim(payload);
            toast.success('Đã tạo claim');
            onCreated();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Không tạo được claim');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Tạo claim bảo hành</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    {/* Serial */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Serial máy</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={serial}
                                onChange={e => setSerial(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && doLookup()}
                                placeholder="Nhập/quét serial..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)]"
                            />
                            <button
                                onClick={doLookup}
                                disabled={!serial.trim() || lookingUp}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                            >
                                {lookingUp ? <RefreshCw size={14} className="animate-spin" /> : 'Tra cứu'}
                            </button>
                        </div>
                    </div>

                    {lookupError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            {lookupError}
                        </div>
                    )}

                    {coverage && (
                        <div className={`p-3 rounded-xl border ${isExpired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                            <div className="text-sm font-semibold">
                                {isExpired ? 'HẾT HẠN' : 'Còn hạn'} — hết hạn {new Date(coverage.expirationDate).toLocaleDateString('vi-VN')}
                            </div>
                            {coverage.productName && <div className="text-xs mt-1">{coverage.productName}</div>}
                            {coverage.warrantyProvider && (
                                <div className="text-xs">Loại: {coverage.warrantyProvider === WarrantyProvider.Manufacturer ? 'Hãng' : 'Shop'}</div>
                            )}
                            {isExpired && (
                                <div className="text-xs mt-2 font-normal">
                                    Vui lòng chuyển sang <a href="/backoffice/tech" className="underline">Repair Work Order có phí</a>.
                                </div>
                            )}
                        </div>
                    )}

                    {coverage && !isExpired && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Mô tả lỗi *</label>
                                <textarea
                                    value={issueDescription}
                                    onChange={e => setIssueDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tình trạng máy khi nhận</label>
                                <input
                                    type="text"
                                    value={receivedCondition}
                                    onChange={e => setReceivedCondition(e.target.value)}
                                    placeholder="Trầy nhẹ, còn nguyên vỏ..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Phụ kiện kèm theo</label>
                                <input
                                    type="text"
                                    value={accessoriesReceived}
                                    onChange={e => setAccessoriesReceived(e.target.value)}
                                    placeholder="Sạc, hộp, dây..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    URL ảnh (mỗi dòng 1 URL)
                                </label>
                                <textarea
                                    value={attachmentUrls}
                                    onChange={e => setAttachmentUrls(e.target.value)}
                                    rows={2}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono resize-none"
                                />
                            </div>
                        </>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={submitting || !coverage || !!isExpired}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting && <RefreshCw size={14} className="animate-spin" />}
                        Tạo claim
                    </button>
                </div>
            </div>
        </div>
    );
}
