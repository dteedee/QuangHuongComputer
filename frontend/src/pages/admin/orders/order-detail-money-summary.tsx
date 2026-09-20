/**
 * Khối tiền + hàng hoá của ngăn chi tiết đơn: khách hàng, thanh toán, danh
 * sách sản phẩm (VAT + giảm giá phân bổ theo dòng — D01, khớp với hoá đơn in),
 * tổng tiền, giao hàng và lịch sử thu tiền.
 *
 * Tách khỏi `order-detail-drawer.tsx` để mỗi file dưới 200 dòng (CLAUDE.md).
 */
import { MapPin, Package } from 'lucide-react';
import { Card, formatDong } from '../../../components/ui';
import type { OrderDetail } from '../../../api/sales/types';
import { getPaymentStatusLabel } from './order-status-badges';

/** §9.6: mọi con số tiền phải có đơn vị. */
const dong = (n: number) => `${formatDong(n)} ₫`;

const SectionTitle = ({ icon: Icon, children }: { icon?: typeof Package; children: React.ReactNode }) => (
    <h3 className="flex items-center gap-2 text-13 font-semibold uppercase tracking-wider text-fg-subtle">
        {Icon && <Icon size={14} aria-hidden />} {children}
    </h3>
);

const MoneyRow = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className="flex items-baseline justify-between gap-3">
        <span className={strong ? 'text-13 font-semibold text-fg' : 'text-13 text-fg-muted'}>{label}</span>
        <span className={strong ? 'num text-base font-semibold text-fg' : 'num text-13 text-fg'}>{value}</span>
    </div>
);

export const OrderDetailMoneySummary = ({ order }: { order: OrderDetail }) => (
    <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
            <Card padded radius="xl" variant="flat" className="bg-sunken">
                <p className="text-2xs text-fg-subtle">Khách hàng</p>
                <p className="text-13 font-medium text-fg">{order.customer.name || 'Khách vãng lai'}</p>
                <p className="num text-xs text-fg-muted">{order.customer.phone || '—'}</p>
            </Card>
            <Card padded radius="xl" variant="flat" className="bg-sunken">
                <p className="text-2xs text-fg-subtle">Thanh toán</p>
                <p className="text-13 font-medium text-fg">{getPaymentStatusLabel(order.paymentStatus)}</p>
                <p className="text-xs text-fg-muted">
                    Đã thu {dong(order.money.collected)} / còn {dong(order.money.amountDue)}
                </p>
            </Card>
        </div>

        <div className="flex flex-col gap-2">
            <SectionTitle icon={Package}>Sản phẩm ({order.items.length})</SectionTitle>
            <ul className="divide-y divide-line/70 rounded-xl border border-line">
                {order.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-13 font-medium text-fg">
                                {item.productName}{item.isGift ? ' · Hàng tặng' : ''}
                            </p>
                            <p className="text-xs text-fg-muted">
                                x{item.quantity} @ {dong(item.unitPrice)}
                                {item.vatRate != null && ` · VAT ${(item.vatRate * 100).toFixed(0)}% (${dong(item.vatAmount ?? 0)})`}
                                {!!item.discountAmount && ` · Giảm giá phân bổ ${dong(item.discountAmount)}`}
                            </p>
                        </div>
                        <span className="num shrink-0 text-13 font-medium text-fg">{dong(item.lineTotal)}</span>
                    </li>
                ))}
            </ul>
        </div>

        <Card padded radius="xl" variant="flat" className="flex flex-col gap-1.5 bg-sunken">
            <MoneyRow label="Tạm tính" value={dong(order.money.subtotalAmount)} />
            {order.money.discountAmount > 0 && (
                <MoneyRow label="Giảm giá" value={`-${dong(order.money.discountAmount)}`} />
            )}
            <MoneyRow label="Phí vận chuyển" value={dong(order.money.shippingAmount)} />
            <MoneyRow label="Trong đó VAT (đã gồm trong tổng)" value={dong(order.money.taxAmount)} />
            <div className="mt-1 border-t border-line pt-2">
                <MoneyRow label="Tổng cộng" value={dong(order.money.totalAmount)} strong />
            </div>
        </Card>

        <div className="flex flex-col gap-2">
            <SectionTitle icon={MapPin}>Giao hàng</SectionTitle>
            <Card padded radius="xl" variant="flat" className="bg-sunken">
                <p className="text-13 text-fg">
                    {order.shipping.shippingAddress
                        || (order.shipping.isPickup
                            ? `Nhận tại ${order.shipping.pickupStoreName || 'cửa hàng'}`
                            : 'Chưa có địa chỉ')}
                </p>
                {order.shipping.deliveryTrackingNumber && (
                    <p className="mt-1 text-xs text-fg-muted">
                        {order.shipping.deliveryCarrier} · <span className="num">{order.shipping.deliveryTrackingNumber}</span>
                    </p>
                )}
            </Card>
        </div>

        {order.payments.length > 0 && (
            <div className="flex flex-col gap-2">
                <SectionTitle>Lịch sử thu tiền</SectionTitle>
                <ul className="divide-y divide-line/70 rounded-xl border border-line">
                    {order.payments.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                            <span className="text-13 text-fg">
                                {p.method} · {p.reference || '—'}{p.isReversed ? ' (đã đảo)' : ''}
                            </span>
                            <span className="num text-13 font-medium text-fg">{dong(p.amount)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);
