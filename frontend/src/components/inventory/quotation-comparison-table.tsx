import { useMemo } from 'react';
import { Award, Clock, Shield, CreditCard } from 'lucide-react';
import type { QuotationComparison, QuotationCell } from '../../api/inventory';
import { formatCurrency, paymentTermLabels } from '../../api/inventory';

interface Props {
    comparison: QuotationComparison;
    onAward?: (quotationId: string) => void;
    isAwarding?: string | null; // quotationId đang chờ award
}

/**
 * Bảng so sánh báo giá từ nhiều NCC.
 * - Mỗi hàng = 1 sản phẩm; mỗi cột = 1 NCC.
 * - Ô giá thấp nhất trên hàng được tô xanh.
 * - Hàng phụ hiển thị Payment Term / Delivery / Warranty / Total, tô sáng giá trị tốt nhất.
 * - Cột cuối cùng có nút "Chọn NCC này" để award RFQ.
 */
export default function QuotationComparisonTable({ comparison, onAward, isAwarding }: Props) {
    const { items, quotations } = comparison;

    // Tính giá thấp nhất per row
    const minPricePerRow = useMemo(() => {
        return items.map(row => {
            const prices = row.prices.map(p => p.unitPrice).filter((p): p is number => typeof p === 'number' && p > 0);
            return prices.length ? Math.min(...prices) : null;
        });
    }, [items]);

    // Tính giá trị tốt nhất cho các cột phụ
    const bestPaymentQid = useMemo(() => {
        const rank: Record<string, number> = { COD: 4, NET7: 3, NET15: 2, NET30: 1, NET45: 1, NET60: 0, Prepaid: -1, Custom: 0 };
        let best: { qid?: string; score: number } = { score: -Infinity };
        for (const q of quotations) {
            const score = q.paymentTerm ? rank[q.paymentTerm] ?? 0 : 0;
            if (score > best.score) best = { qid: q.quotationId, score };
        }
        return best.qid;
    }, [quotations]);

    const bestDeliveryQid = useMemo(() => {
        const withDays = quotations.filter(q => typeof q.deliveryDays === 'number');
        if (!withDays.length) return undefined;
        return withDays.reduce((best, q) => (q.deliveryDays! < (best.deliveryDays ?? Infinity) ? q : best)).quotationId;
    }, [quotations]);

    const bestWarrantyQid = useMemo(() => {
        const withMonths = quotations.filter(q => typeof q.warrantyMonths === 'number');
        if (!withMonths.length) return undefined;
        return withMonths.reduce((best, q) => (q.warrantyMonths! > (best.warrantyMonths ?? -1) ? q : best)).quotationId;
    }, [quotations]);

    const bestTotalQid = useMemo(() => {
        if (!quotations.length) return undefined;
        return quotations.reduce((best, q) => (q.total < best.total ? q : best)).quotationId;
    }, [quotations]);

    const findCell = (row: (typeof items)[number], qid: string): QuotationCell | undefined =>
        row.prices.find(p => p.quotationId === qid);

    const highlight = 'bg-green-50 font-semibold text-green-800';

    if (!quotations.length) {
        return (
            <div className="border border-dashed border-gray-300 rounded-xl bg-gray-50/50 p-10 text-center text-sm text-gray-500">
                Chưa có báo giá nào cho RFQ này.
            </div>
        );
    }

    return (
        <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white shadow-sm">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                            Sản phẩm / Chỉ số
                        </th>
                        {quotations.map(q => (
                            <th key={q.quotationId} className="text-center px-4 py-3 font-semibold text-gray-700 min-w-[160px]">
                                {q.supplierName || q.supplierId.slice(0, 8)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {/* Rows: mỗi sản phẩm 1 dòng */}
                    {items.map((row, rIdx) => {
                        const minPrice = minPricePerRow[rIdx];
                        return (
                            <tr key={row.productId} className="border-b border-gray-100">
                                <td className="px-4 py-3 sticky left-0 bg-white z-10">
                                    <div className="font-medium text-gray-900">{row.productName}</div>
                                    {row.sku && <div className="text-xs text-gray-500">SKU: {row.sku}</div>}
                                    <div className="text-xs text-gray-500 mt-0.5">SL: {row.quantity}</div>
                                </td>
                                {quotations.map(q => {
                                    const cell = findCell(row, q.quotationId);
                                    const isBest =
                                        typeof cell?.unitPrice === 'number' && minPrice !== null && cell.unitPrice === minPrice;
                                    return (
                                        <td
                                            key={q.quotationId}
                                            className={`px-4 py-3 text-right ${isBest ? highlight : ''}`}
                                            title={cell?.notes || ''}
                                        >
                                            {typeof cell?.unitPrice === 'number' ? formatCurrency(cell.unitPrice) : '—'}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}

                    {/* Payment term row */}
                    <tr className="border-b border-gray-100 bg-gray-50/40">
                        <td className="px-4 py-3 sticky left-0 bg-gray-50/40 z-10 font-medium text-gray-700 flex items-center gap-1.5">
                            <CreditCard size={14} /> Thanh toán
                        </td>
                        {quotations.map(q => (
                            <td
                                key={q.quotationId}
                                className={`px-4 py-3 text-center ${q.quotationId === bestPaymentQid ? highlight : ''}`}
                            >
                                {q.paymentTerm ? paymentTermLabels[q.paymentTerm] : '—'}
                            </td>
                        ))}
                    </tr>

                    {/* Delivery row */}
                    <tr className="border-b border-gray-100 bg-gray-50/40">
                        <td className="px-4 py-3 sticky left-0 bg-gray-50/40 z-10 font-medium text-gray-700 flex items-center gap-1.5">
                            <Clock size={14} /> Giao hàng
                        </td>
                        {quotations.map(q => (
                            <td
                                key={q.quotationId}
                                className={`px-4 py-3 text-center ${q.quotationId === bestDeliveryQid ? highlight : ''}`}
                            >
                                {typeof q.deliveryDays === 'number' ? `${q.deliveryDays} ngày` : '—'}
                            </td>
                        ))}
                    </tr>

                    {/* Warranty row */}
                    <tr className="border-b border-gray-100 bg-gray-50/40">
                        <td className="px-4 py-3 sticky left-0 bg-gray-50/40 z-10 font-medium text-gray-700 flex items-center gap-1.5">
                            <Shield size={14} /> Bảo hành
                        </td>
                        {quotations.map(q => (
                            <td
                                key={q.quotationId}
                                className={`px-4 py-3 text-center ${q.quotationId === bestWarrantyQid ? highlight : ''}`}
                            >
                                {typeof q.warrantyMonths === 'number' ? `${q.warrantyMonths} tháng` : '—'}
                            </td>
                        ))}
                    </tr>

                    {/* Total row */}
                    <tr className="border-b-2 border-gray-200 bg-gray-100">
                        <td className="px-4 py-3 sticky left-0 bg-gray-100 z-10 font-bold text-gray-900">Tổng cộng</td>
                        {quotations.map(q => (
                            <td
                                key={q.quotationId}
                                className={`px-4 py-3 text-right font-bold ${q.quotationId === bestTotalQid ? highlight : 'text-gray-900'}`}
                            >
                                {formatCurrency(q.total)}
                            </td>
                        ))}
                    </tr>

                    {/* Action row */}
                    {onAward && (
                        <tr>
                            <td className="px-4 py-3 sticky left-0 bg-white z-10"></td>
                            {quotations.map(q => (
                                <td key={q.quotationId} className="px-4 py-3 text-center">
                                    <button
                                        type="button"
                                        onClick={() => onAward(q.quotationId)}
                                        disabled={isAwarding === q.quotationId}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                                    >
                                        <Award size={13} />
                                        {isAwarding === q.quotationId ? 'Đang xử lý...' : 'Chọn NCC này'}
                                    </button>
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
