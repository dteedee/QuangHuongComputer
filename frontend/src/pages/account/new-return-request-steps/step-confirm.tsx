import { AlertCircle } from 'lucide-react';
import type { OrderItem, ReturnPolicy, ReturnType } from '../../../api/sales';
import type { Product, ProductVariant } from '../../../api/catalog';
import { formatCurrency } from '../../../utils/format';

const typeLabel = (t: ReturnType | null): string => {
    if (t === 'Refund') return 'Hoàn tiền';
    if (t === 'Exchange') return 'Đổi sản phẩm khác';
    if (t === 'Replace') return 'Đổi 1-1 cùng loại';
    return '—';
};

const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
        <span className="text-gray-500 flex-shrink-0">{label}</span>
        <span className="text-gray-900 font-semibold text-right">{value}</span>
    </div>
);

interface StepConfirmProps {
    item: OrderItem | null;
    type: ReturnType | null;
    reason: string;
    description: string;
    policy: ReturnPolicy | null;
    exchangeProduct: Product | null;
    exchangeVariant: ProductVariant | null;
    priceDiff: number | null;
    attachments: string[];
}

export const StepConfirm = ({
    item, type, reason, description, policy, exchangeProduct, exchangeVariant, priceDiff, attachments,
}: StepConfirmProps) => (
    <div>
        <h2 className="text-base font-bold text-gray-900 mb-4">Xác nhận yêu cầu</h2>

        <div className="space-y-3 text-sm mb-5">
            <Row label="Sản phẩm" value={item?.productName ?? '—'} />
            <Row label="Loại" value={typeLabel(type)} />
            {reason && <Row label="Lý do" value={reason} />}
            {description && <Row label="Ghi chú" value={description} />}
            {type === 'Exchange' && exchangeProduct && (
                <>
                    <Row
                        label="Đổi sang"
                        value={`${exchangeProduct.name}${exchangeVariant ? ` (${exchangeVariant.name})` : ''}`}
                    />
                    {priceDiff != null && (
                        <Row
                            label="Chênh lệch"
                            value={
                                priceDiff > 0
                                    ? `Bù ${formatCurrency(priceDiff)}`
                                    : priceDiff < 0
                                      ? `Hoàn ${formatCurrency(-priceDiff)}`
                                      : 'Bằng giá'
                            }
                        />
                    )}
                </>
            )}
            <Row label="Ảnh minh chứng" value={attachments.length > 0 ? `${attachments.length} ảnh` : 'Không'} />
        </div>

        {policy && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed space-y-1">
                    <p className="font-semibold">Điều kiện đổi/trả:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                        {policy.requireOriginalPackaging && <li>Còn nguyên seal / hộp gốc</li>}
                        {policy.requireAllAccessories && <li>Đầy đủ phụ kiện, giấy tờ đi kèm</li>}
                        {policy.restockingFeePercent > 0 && (
                            <li>Có thể áp phí xử lý {policy.restockingFeePercent}% giá sản phẩm</li>
                        )}
                        <li>Yêu cầu được xử lý trong 1-3 ngày làm việc</li>
                    </ul>
                </div>
            </div>
        )}
    </div>
);

export default StepConfirm;
