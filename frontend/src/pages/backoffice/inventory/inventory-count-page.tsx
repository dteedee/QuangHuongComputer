import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, CheckCircle, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
    getInventoryCounts, getInventoryCount, approveInventoryCount, recordInventoryCount
} from '../../../api/inventory';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

function getStatusLabel(status: number | string) {
    if (status === 1 || status === 'Approved') return 'Đã duyệt';
    if (status === 2 || status === 'Cancelled') return 'Đã hủy';
    return 'Đang kiểm';
}

function StatusBadge({ status }: { status: number | string }) {
    const isApproved = status === 1 || status === 'Approved';
    const isCancelled = status === 2 || status === 'Cancelled';
    const cls = isApproved
        ? 'bg-green-100 text-green-700'
        : isCancelled
        ? 'bg-red-100 text-red-700'
        : 'bg-blue-100 text-blue-700';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
            {getStatusLabel(status)}
        </span>
    );
}

function VarianceCell({ system, counted }: { system: number; counted: number }) {
    const variance = counted - system;
    if (variance === 0) return <span className="text-gray-500 text-xs">0</span>;
    if (variance < 0) return <span className="text-red-600 font-semibold text-xs">{variance}</span>;
    return <span className="text-blue-600 font-semibold text-xs">+{variance}</span>;
}

interface CountItem {
    productId: string;
    productName?: string;
    productSku?: string;
    systemQuantity: number;
    countedQuantity: number;
}

function SessionDetail({ sessionId, onApprove }: { sessionId: string; onApprove: () => void }) {
    const [items, setItems] = useState<CountItem[]>([]);
    const [edited, setEdited] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [approving, setApproving] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<number | string>(0);
    const confirm = useConfirm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getInventoryCount(sessionId);
            setItems(data.items || []);
            setSessionStatus(data.status ?? 0);
        } catch {
            toast.error('Lỗi tải chi tiết phiên kiểm kê');
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = items.map((item, idx) => ({
                productId: item.productId,
                countedQuantity: edited[idx] !== undefined ? edited[idx] : item.countedQuantity,
            }));
            await recordInventoryCount(sessionId, payload);
            toast.success('Đã lưu kết quả kiểm kê');
            load();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Lỗi lưu kết quả');
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async () => {
        const ok = await confirm({ message: 'Duyệt phiên kiểm kê này? Tồn kho sẽ được điều chỉnh theo kết quả đếm.', variant: 'info' });
        if (!ok) return;
        setApproving(true);
        try {
            await approveInventoryCount(sessionId);
            toast.success('Đã duyệt phiên kiểm kê');
            onApprove();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Lỗi duyệt phiên kiểm kê');
        } finally {
            setApproving(false);
        }
    };

    if (loading) return (
        <tr><td colSpan={7} className="px-5 py-6 text-center text-gray-400">
            <RefreshCw size={18} className="inline animate-spin mr-2" />Đang tải...
        </td></tr>
    );

    const isDone = sessionStatus === 1 || sessionStatus === 'Approved';

    return (
        <>
            {items.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-6 text-center text-gray-400 text-sm">Chưa có sản phẩm trong phiên này</td></tr>
            ) : items.map((item, idx) => {
                const counted = edited[idx] !== undefined ? edited[idx] : item.countedQuantity;
                const variance = counted - item.systemQuantity;
                const rowCls = variance < 0 ? 'bg-red-50/40' : variance > 0 ? 'bg-blue-50/40' : '';
                return (
                    <tr key={item.productId} className={`border-b border-gray-100 ${rowCls}`}>
                        <td className="px-5 py-3 pl-16 text-gray-800 font-medium text-sm">{item.productName || item.productId}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs font-mono">{item.productSku || '-'}</td>
                        <td className="px-5 py-3 text-center text-gray-700 font-semibold">{item.systemQuantity}</td>
                        <td className="px-5 py-3 text-center">
                            {isDone ? (
                                <span className="font-semibold text-gray-800">{item.countedQuantity}</span>
                            ) : (
                                <input
                                    type="number"
                                    min={0}
                                    value={counted}
                                    onChange={e => setEdited(prev => ({ ...prev, [idx]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                    className="w-20 text-center px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
                                />
                            )}
                        </td>
                        <td className="px-5 py-3 text-center"><VarianceCell system={item.systemQuantity} counted={counted} /></td>
                        <td className="px-5 py-3" colSpan={2}></td>
                    </tr>
                );
            })}
            {!isDone && items.length > 0 && (
                <tr className="bg-gray-50 border-b border-gray-200">
                    <td colSpan={7} className="px-5 py-3 pl-16">
                        <div className="flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
                            >
                                {saving && <RefreshCw size={12} className="animate-spin" />}
                                Lưu kết quả
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={approving}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {approving && <RefreshCw size={12} className="animate-spin" />}
                                <CheckCircle size={13} />
                                Duyệt phiên
                            </button>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

export default function InventoryCountPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getInventoryCounts();
            setSessions(Array.isArray(data) ? data : data.items || []);
        } catch {
            toast.error('Lỗi tải danh sách kiểm kê');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                            <ClipboardList size={22} className="text-white" />
                        </div>
                        Kiểm Kê Kho
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">Quản lý các phiên kiểm kê tồn kho</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw size={24} className="animate-spin text-gray-400" />
                        <span className="ml-3 text-gray-500">Đang tải...</span>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-20">
                        <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-500">Chưa có phiên kiểm kê</h3>
                        <p className="text-sm text-gray-400 mt-1">Phiên kiểm kê sẽ hiển thị ở đây sau khi được tạo</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 w-10"></th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Mã phiên</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Ngày</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Kho</th>
                                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Trạng thái</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Ghi chú</th>
                                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">SP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map(session => (
                                <>
                                    <tr
                                        key={session.id}
                                        className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors"
                                        onClick={() => toggle(session.id)}
                                    >
                                        <td className="px-5 py-4 text-gray-400">
                                            {expanded === session.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-mono font-semibold text-gray-900">{session.sessionNumber || session.id?.slice(0, 8)}</span>
                                        </td>
                                        <td className="px-5 py-4 text-gray-700">
                                            {session.sessionDate
                                                ? new Date(session.sessionDate).toLocaleDateString('vi-VN')
                                                : '-'}
                                        </td>
                                        <td className="px-5 py-4 text-gray-700">{session.warehouseName || session.warehouseId || '-'}</td>
                                        <td className="px-5 py-4 text-center">
                                            <StatusBadge status={session.status} />
                                        </td>
                                        <td className="px-5 py-4 text-gray-500 text-xs">{session.notes || '-'}</td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-lg text-xs font-bold text-gray-700">
                                                {session.itemCount ?? '-'}
                                            </span>
                                        </td>
                                    </tr>
                                    {expanded === session.id && (
                                        <SessionDetail
                                            sessionId={session.id}
                                            onApprove={() => { setExpanded(null); fetchData(); }}
                                        />
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
