import type { OrderDetail, OrderDetailPayment } from '../../api/sales/types';
import type { CompanyLetterhead } from './use-company-letterhead';
import { amountInWords } from './amount-in-words';
import { formatPrintDate } from './print-date';

interface DepositReceiptA6Props {
    order: OrderDetail;
    payment: OrderDetailPayment;
    company: CompanyLetterhead;
    /** Optional shift label if the cashier session carries one — no fabricated shift when unknown. */
    shiftLabel?: string;
}

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** `OrderDetailPayment.receivedBy` is a user GUID, not a display name (verified live on TEST
 *  :5050, 2026-09-18 — `docs/api-contracts/sales-pos-returns-loyalty.md` §4 does not document a
 *  name projection here). Printing a raw GUID to a customer would be a defect, so this is
 *  suppressed rather than fabricated — filed as an integration request for a name field. */
const cashierLabel = (receivedBy?: string) => (receivedBy && !GUID_RE.test(receivedBy) ? receivedBy : '—');

/**
 * A6 deposit receipt. Key Insight: this is NOT an invoice — heading is always "Phiếu thu tiền
 * đặt cọc", never "Hóa đơn", and the printed footnote makes that explicit (Risk Assessment:
 * "deposit mistaken for an invoice").
 */
export function DepositReceiptA6({ order, payment, company, shiftLabel }: DepositReceiptA6Props) {
    return (
        <div className="print-doc mx-auto bg-surface text-ink" style={{ width: '105mm' }}>
            <style>{`@media print { @page { size: 105mm 148mm; margin: 6mm; } }`}</style>
            <div className="p-[6mm] text-[10px] leading-snug">
                <header className="mb-2 text-center">
                    <div className="text-[11px] font-bold">{company.name || 'Quang Hưởng Computer'}</div>
                    <div>{company.address}</div>
                    {company.phone && <div>ĐT: {company.phone}</div>}
                </header>
                <div className="mb-2 border-y-2 border-ink py-1 text-center text-[13px] font-bold uppercase">
                    Phiếu thu tiền đặt cọc
                </div>

                <div className="space-y-1">
                    <Row label="Số phiếu" value={payment.reference || payment.id.slice(0, 8).toUpperCase()} />
                    <Row label="Ngày thu" value={formatPrintDate(payment.receivedAt, true)} />
                    <Row label="Đơn hàng" value={order.orderNumber} />
                    <Row label="Khách hàng" value={order.customer.name || '—'} />
                    {order.customer.phone && <Row label="Điện thoại" value={order.customer.phone} />}
                    <Row label="Hình thức" value={payment.method} />
                </div>

                <div className="my-2 border-t border-dashed border-ink-line" />

                <div className="space-y-1">
                    <Row label="Tổng giá trị đơn" value={money(order.money.totalAmount)} bold />
                    <Row label="Số tiền đặt cọc" value={money(payment.amount)} bold />
                    <Row label="Còn phải thu" value={money(Math.max(order.money.amountDue, 0))} bold />
                </div>
                <div className="mt-1 italic">Bằng chữ: {amountInWords(payment.amount)}.</div>

                <div className="my-2 border-t border-dashed border-ink-line" />
                <Row label="Thu ngân" value={cashierLabel(payment.receivedBy)} />
                {shiftLabel && <Row label="Ca làm việc" value={shiftLabel} />}

                <footer className="mt-6 grid grid-cols-2 gap-2 text-center">
                    <div>
                        <div className="font-semibold">Khách hàng</div>
                        <div className="mt-8 border-t border-ink-line" />
                    </div>
                    <div>
                        <div className="font-semibold">Thu ngân</div>
                        <div className="mt-8 border-t border-ink-line" />
                    </div>
                </footer>

                <p className="mt-3 text-center text-[8px] italic text-fg-muted">
                    Đây KHÔNG phải hoá đơn. Hoá đơn sẽ được xuất khi bàn giao hàng.
                </p>
            </div>
        </div>
    );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <div className={`flex justify-between gap-2 ${bold ? 'font-bold' : ''}`}>
            <span>{label}:</span>
            <span className="num text-right">{value}</span>
        </div>
    );
}
