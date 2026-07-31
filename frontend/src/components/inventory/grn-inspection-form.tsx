import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { grnInspectionApi } from '../../api/inventory';
import type { GrnInspectItem } from '../../api/inventory';

interface Props {
    grnId: string;
    onSuccess?: () => void;
}

interface Row extends GrnInspectItem {
    _dirty?: boolean;
}

/**
 * Form kiểm hàng cho 1 GRN.
 * - Mỗi item nhập AcceptedQty + RejectedQty + Reason (bắt buộc khi rejected > 0).
 * - Đảm bảo accepted + rejected = total; sai thì disable nút xác nhận.
 * - Nút "Xác nhận nhập kho" gọi inspect + confirm.
 */
export default function GrnInspectionForm({ grnId, onSuccess }: Props) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rows, setRows] = useState<Row[]>([]);
    const [grnNumber, setGrnNumber] = useState<string>('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const detail = await grnInspectionApi.getDetail(grnId);
            setGrnNumber(detail.documentNumber);
            setRows(
                (detail.items || []).map(i => ({
                    ...i,
                    acceptedQty: i.acceptedQty || i.totalQty,
                    rejectedQty: i.rejectedQty || 0,
                    reason: i.reason || '',
                }))
            );
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Lỗi tải chi tiết GRN');
        } finally {
            setLoading(false);
        }
    }, [grnId]);

    useEffect(() => { void load(); }, [load]);

    const updateRow = (idx: number, patch: Partial<Row>) => {
        setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch, _dirty: true } : r)));
    };

    const isRowValid = (r: Row): boolean => {
        const sum = (r.acceptedQty || 0) + (r.rejectedQty || 0);
        if (sum !== r.totalQty) return false;
        if ((r.rejectedQty || 0) > 0 && !r.reason?.trim()) return false;
        return true;
    };

    const allValid = rows.every(isRowValid) && rows.length > 0;

    const handleSubmit = async () => {
        if (!allValid) {
            toast.error('Kiểm tra lại các dòng: tổng số phải khớp và lý do bắt buộc khi có hàng lỗi.');
            return;
        }
        setSubmitting(true);
        try {
            await grnInspectionApi.inspect(grnId, {
                items: rows.map(r => ({
                    itemId: r.itemId,
                    acceptedQty: r.acceptedQty,
                    rejectedQty: r.rejectedQty,
                    reason: r.reason,
                })),
            });
            await grnInspectionApi.confirm(grnId);
            toast.success(`Đã xác nhận nhập kho ${grnNumber}`);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Lỗi xác nhận nhập kho');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <RefreshCw size={24} className="animate-spin text-gray-400" />
                <span className="ml-3 text-gray-500">Đang tải chi tiết GRN...</span>
            </div>
        );
    }

    if (!rows.length) {
        return (
            <div className="text-center py-10 text-gray-500 text-sm">
                GRN này không có sản phẩm để kiểm.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                    Kiểm tra từng dòng. Hàng đạt sẽ vào kho chính, hàng lỗi vào kho Defective và tự sinh phiếu trả NCC.
                </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-semibold text-gray-600">Sản phẩm</th>
                            <th className="text-center px-3 py-2 font-semibold text-gray-600 w-20">Tổng</th>
                            <th className="text-center px-3 py-2 font-semibold text-green-700 w-24">Đạt</th>
                            <th className="text-center px-3 py-2 font-semibold text-red-700 w-24">Lỗi</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-600 min-w-[200px]">Lý do lỗi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const valid = isRowValid(row);
                            return (
                                <tr key={row.itemId} className={`border-b border-gray-100 ${!valid ? 'bg-red-50/40' : ''}`}>
                                    <td className="px-3 py-2">
                                        <div className="font-medium text-gray-900">{row.productName || row.itemId}</div>
                                        {row.sku && <div className="text-xs text-gray-500">{row.sku}</div>}
                                    </td>
                                    <td className="px-3 py-2 text-center text-gray-700 font-semibold">{row.totalQty}</td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min={0}
                                            max={row.totalQty}
                                            value={row.acceptedQty}
                                            onChange={e => {
                                                const v = Math.max(0, parseInt(e.target.value) || 0);
                                                updateRow(idx, { acceptedQty: v, rejectedQty: Math.max(0, row.totalQty - v) });
                                            }}
                                            className={`w-full text-center px-2 py-1 border rounded ${valid ? 'border-gray-300' : 'border-red-400'}`}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min={0}
                                            max={row.totalQty}
                                            value={row.rejectedQty}
                                            onChange={e => {
                                                const v = Math.max(0, parseInt(e.target.value) || 0);
                                                updateRow(idx, { rejectedQty: v, acceptedQty: Math.max(0, row.totalQty - v) });
                                            }}
                                            className={`w-full text-center px-2 py-1 border rounded ${valid ? 'border-gray-300' : 'border-red-400'}`}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="text"
                                            value={row.reason || ''}
                                            onChange={e => updateRow(idx, { reason: e.target.value })}
                                            placeholder={row.rejectedQty > 0 ? 'Bắt buộc khi có hàng lỗi' : 'Không cần'}
                                            disabled={row.rejectedQty === 0}
                                            className={`w-full px-2 py-1 border rounded text-sm ${
                                                row.rejectedQty > 0 && !row.reason?.trim() ? 'border-red-400' : 'border-gray-300'
                                            } disabled:bg-gray-50 disabled:text-gray-400`}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!allValid || submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Xác nhận nhập kho
                </button>
            </div>
        </div>
    );
}
