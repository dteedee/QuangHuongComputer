import { Price, formatDong } from '../ui';
import type { VatBucketDto } from '../../api/sales/cart-checkout';

export interface CartTotalsProps {
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
  /** VAT đã tách ra (đã nằm trong `total`). 0 ⇒ không hiển thị dòng VAT. */
  tax: number;
  /** Khối VAT theo từng mức thuế do server trả. Nhiều phần tử ⇒ không in một % duy nhất. */
  vatBreakdown?: VatBucketDto[];
  /** Chưa biết phí ship (khách chưa chọn địa chỉ) ⇒ hiện "Tính ở bước thanh toán". */
  shippingUnknown?: boolean;
}

/**
 * Khối tiền chuẩn D01: Tạm tính / Giảm giá / Phí vận chuyển / **Tổng cộng**, kèm một dòng mờ
 * "Trong đó VAT". Mọi con số ở đây do SERVER trả — component này KHÔNG tính bất cứ thứ gì,
 * kể cả thuế (không còn `subtotal * 0.1` như bản cũ của `checkout-order-summary.tsx`).
 */
export function CartTotals({
  subtotal, discountAmount, shippingAmount, total, tax, vatBreakdown, shippingUnknown,
}: CartTotalsProps) {
  const buckets = vatBreakdown?.filter(b => b.vat > 0) ?? [];
  const singleRate = buckets.length === 1 ? buckets[0].rate : null;

  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between text-fg-muted">
        <span>Tạm tính</span>
        <Price value={subtotal} tone="admin" />
      </div>

      {discountAmount > 0 && (
        <div className="flex justify-between text-success">
          <span>Giảm giá</span>
          <span className="num font-semibold">−{formatDong(discountAmount)}₫</span>
        </div>
      )}

      <div className="flex justify-between text-fg-muted pb-3 border-b border-line">
        <span>Phí vận chuyển</span>
        {shippingUnknown
          ? <span className="text-2xs text-fg-subtle">Tính ở bước thanh toán</span>
          : shippingAmount === 0
            ? <span className="font-semibold text-success">Miễn phí</span>
            : <Price value={shippingAmount} tone="admin" />}
      </div>

      <div className="flex justify-between items-end pt-1">
        <span className="font-semibold text-fg">Tổng cộng</span>
        <div className="text-right">
          <Price value={total} className="text-2xl font-bold" />
          {tax > 0 && (
            <p className="text-2xs text-fg-subtle mt-0.5">
              {singleRate !== null
                ? `Trong đó VAT (${Math.round(singleRate * 100)}%): `
                : 'Trong đó VAT: '}
              {formatDong(tax)}₫
            </p>
          )}
        </div>
      </div>

      {buckets.length > 1 && (
        <ul className="text-2xs text-fg-subtle space-y-0.5 pt-1">
          {buckets.map(b => (
            <li key={b.rate} className="flex justify-between">
              <span>VAT {Math.round(b.rate * 100)}%</span>
              <span className="num">{formatDong(b.vat)}₫</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CartTotals;
