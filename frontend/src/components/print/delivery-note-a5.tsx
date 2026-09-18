import type { OrderDetail } from '../../api/sales/types';
import type { CompanyLetterhead } from './use-company-letterhead';
import { amountInWords } from './amount-in-words';
import { formatPrintDate } from './print-date';

interface DeliveryNoteA5Props {
    order: OrderDetail;
    company: CompanyLetterhead;
}

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

/**
 * A5 delivery note ("Phiếu giao hàng"). `@page size A5` — exact mm, no background bleed.
 * Sender comes from `company` (config, never hardcoded — Success Criteria). COD amount is
 * `amountDue` if the recipient still owes on delivery (COD order), else 0.
 */
export function DeliveryNoteA5({ order, company }: DeliveryNoteA5Props) {
    const cod = order.money.amountDue > 0 ? order.money.amountDue : 0;
    return (
        <div className="print-doc mx-auto bg-surface p-0 text-ink" style={{ width: '148mm' }}>
            <style>{`@media print { @page { size: A5 portrait; margin: 8mm; } }`}</style>
            <div className="p-[8mm] text-[10px] leading-snug">
                <header className="mb-3 flex items-start justify-between border-b border-ink-line pb-2">
                    <div>
                        <div className="text-[12px] font-bold">{company.name || 'Quang Hưởng Computer'}</div>
                        <div>{company.address}</div>
                        <div>ĐT: {company.phone || company.hotline} {company.taxCode && `· MST: ${company.taxCode}`}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[13px] font-bold uppercase">Phiếu giao hàng</div>
                        <div>Số: {order.orderNumber}</div>
                        <div>Ngày: {formatPrintDate(order.dates.orderDate)}</div>
                    </div>
                </header>

                <section className="mb-3">
                    <div className="font-semibold">Người nhận</div>
                    <div>{order.customer.name || '—'} {order.customer.phone ? `· ĐT: ${order.customer.phone}` : ''}</div>
                    <div>{order.shipping.shippingAddress || (order.shipping.isPickup ? `Nhận tại ${order.shipping.pickupStoreName || 'cửa hàng'}` : '—')}</div>
                </section>

                <table className="w-full border-collapse text-[9px]">
                    <thead>
                        <tr className="border-y border-ink-line">
                            <th className="py-1 text-left">STT</th>
                            <th className="py-1 text-left">Sản phẩm</th>
                            <th className="py-1 text-right">SL</th>
                            <th className="py-1 text-right">Đơn giá</th>
                            <th className="py-1 text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((it, idx) => (
                            <tr key={it.id} className="border-b border-ink-line/40">
                                <td className="py-1">{idx + 1}</td>
                                <td className="py-1">{it.productName}{it.variantName ? ` (${it.variantName})` : ''}</td>
                                <td className="py-1 text-right num">{it.quantity}</td>
                                <td className="py-1 text-right num">{money(it.unitPrice)}</td>
                                <td className="py-1 text-right num">{money(it.lineTotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-2 flex justify-end">
                    <div className="w-1/2 space-y-0.5 text-right">
                        <div>Tổng tiền hàng: <span className="num">{money(order.money.subtotalAmount)}</span></div>
                        {order.money.shippingAmount > 0 && <div>Phí vận chuyển: <span className="num">{money(order.money.shippingAmount)}</span></div>}
                        <div className="font-bold">Tổng cộng: <span className="num">{money(order.money.totalAmount)}</span></div>
                        {cod > 0 && <div className="font-bold">Thu hộ (COD): <span className="num">{money(cod)}</span></div>}
                    </div>
                </div>
                {cod > 0 && (
                    <div className="mt-1 italic">Bằng chữ: {amountInWords(cod)}.</div>
                )}

                <footer className="mt-8 grid grid-cols-2 gap-4 text-center">
                    <div>
                        <div className="font-semibold">Người giao hàng</div>
                        <div className="text-[8px] text-fg-muted">(Ký, ghi rõ họ tên)</div>
                        <div className="mt-10 border-t border-ink-line" />
                    </div>
                    <div>
                        <div className="font-semibold">Người nhận hàng</div>
                        <div className="text-[8px] text-fg-muted">(Ký, ghi rõ họ tên)</div>
                        <div className="mt-10 border-t border-ink-line" />
                    </div>
                </footer>
            </div>
        </div>
    );
}
