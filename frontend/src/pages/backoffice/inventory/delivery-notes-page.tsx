import { useState, useEffect, useCallback } from 'react';
import { Truck, CheckCircle, XCircle, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { getDeliveryNotes, confirmDeliveryNote } from '../../../api/inventory';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

function getStatusLabel(status: number | string) {
    if (status === 1 || status === 'Confirmed') return 'Đã xác nhận';
    if (status === 2 || status === 'Cancelled') return 'Đã hủy';
    return 'Nháp';
}

function StatusBadge({ status }: { status: number | string }) {
    const isDraft = status === 0 || status === 'Draft';
    const isConfirmed = status === 1 || status === 'Confirmed';
    const isCancelled = status === 2 || status === 'Cancelled';
    const cls = isConfirmed
        ? 'bg-green-100 text-green-700'
        : isCancelled
        ? 'bg-red-100 text-red-700'
        : isDraft
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-gray-100 text-gray-700';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
            {isConfirmed && <CheckCircle size={11} />}
            {isCancelled && <XCircle size={11} />}
            {isDraft && <FileText size={11} />}
            {getStatusLabel(status)}
        </span>
    );
}

export default function DeliveryNotesPage() {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const confirm = useConfirm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getDeliveryNotes();
            setNotes(Array.isArray(data) ? data : data.items || []);
        } catch {
            toast.error('Lỗi tải danh sách phiếu xuất kho');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleConfirm = async (dn: any) => {
        const ok = await confirm({
            message: `Xác nhận phiếu xuất kho ${dn.documentNumber}? Thao tác này sẽ trừ tồn kho.`,
            variant: 'info',
        });
        if (!ok) return;
        try {
            await confirmDeliveryNote(dn.id);
            toast.success(`Đã xác nhận phiếu ${dn.documentNumber}`);
            fetchData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Lỗi xác nhận phiếu xuất kho');
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Truck size={22} className="text-white" />
                        </div>
                        Phiếu Xuất Kho (DN)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">Quản lý phiếu xuất hàng ra khỏi kho</p>
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
                ) : notes.length === 0 ? (
                    <div className="text-center py-20">
                        <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-500">Chưa có phiếu xuất kho</h3>
                        <p className="text-sm text-gray-400 mt-1">Phiếu xuất kho sẽ hiển thị ở đây sau khi được tạo</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Số phiếu</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Ngày</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Kho</th>
                                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Trạng thái</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Ghi chú</th>
                                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notes.map(dn => (
                                <tr key={dn.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <span className="font-mono font-semibold text-gray-900">{dn.documentNumber}</span>
                                    </td>
                                    <td className="px-5 py-4 text-gray-700">
                                        {dn.documentDate
                                            ? new Date(dn.documentDate).toLocaleDateString('vi-VN')
                                            : '-'}
                                    </td>
                                    <td className="px-5 py-4 text-gray-700">{dn.warehouseName || dn.warehouseId || '-'}</td>
                                    <td className="px-5 py-4 text-center">
                                        <StatusBadge status={dn.status} />
                                    </td>
                                    <td className="px-5 py-4 text-gray-500 text-xs">{dn.notes || '-'}</td>
                                    <td className="px-5 py-4 text-center">
                                        {(dn.status === 0 || dn.status === 'Draft') && (
                                            <button
                                                onClick={() => handleConfirm(dn)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                                            >
                                                <CheckCircle size={13} />
                                                Xác nhận
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
