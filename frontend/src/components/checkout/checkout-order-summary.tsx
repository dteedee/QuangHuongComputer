import { ShieldCheck, ShoppingBag } from 'lucide-react';
import { Card, CardBody, Img, Price } from '../ui';
import { CartTotals } from '../cart/cart-totals';
import type { VatBucketDto } from '../../api/sales/cart-checkout';

interface SummaryItem {
  id: string;
  name: string;
  lineTotal: number;
  quantity: number;
  imageUrl?: string;
}

interface CheckoutOrderSummaryProps {
  items: SummaryItem[];
  subtotal: number;
  /** VAT đã tách ra do SERVER trả. KHÔNG còn fallback `subtotal * 0.1` (D01). */
  tax: number;
  vatBreakdown?: VatBucketDto[];
  total: number;
  discountAmount: number;
  shippingAmount: number;
  shippingUnknown?: boolean;
}

export default function CheckoutOrderSummary({
  items, subtotal, tax, vatBreakdown, total, discountAmount, shippingAmount, shippingUnknown,
}: CheckoutOrderSummaryProps) {
  return (
    <div className="lg:sticky lg:top-28 space-y-4">
      <Card>
        <div className="flex items-center justify-between bg-ink px-5 py-4 text-on-ink">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Đơn hàng của bạn</h2>
            <p className="text-2xs text-on-ink-muted">{items.length} sản phẩm</p>
          </div>
          <ShoppingBag className="w-5 h-5" aria-hidden />
        </div>

        <CardBody className="space-y-5">
          <ul className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {items.map(item => (
              <li key={item.id} className="flex gap-3">
                <div className="w-14 h-14 flex-shrink-0 overflow-hidden rounded-lg bg-stage">
                  <Img src={item.imageUrl} alt={item.name} ratio="1/1" fit="contain" blend className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-13 font-medium text-fg line-clamp-2">{item.name}</p>
                  <div className="mt-1 flex items-end justify-between">
                    <span className="text-2xs text-fg-subtle">SL: {item.quantity}</span>
                    <Price value={item.lineTotal} className="text-13" showDiscount={false} />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-dashed border-line pt-4">
            <CartTotals
              subtotal={subtotal} discountAmount={discountAmount} shippingAmount={shippingAmount}
              total={total} tax={tax} vatBreakdown={vatBreakdown} shippingUnknown={shippingUnknown}
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-subtle text-success">
          <ShieldCheck className="w-5 h-5" aria-hidden />
        </div>
        <div>
          <p className="text-13 font-semibold text-fg">Thanh toán an toàn</p>
          <p className="text-2xs text-fg-subtle">Thông tin cá nhân được mã hoá theo chuẩn TLS.</p>
        </div>
      </div>
    </div>
  );
}
