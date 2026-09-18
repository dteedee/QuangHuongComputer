/**
 * Ba hành động ghi dữ liệu của quầy: giữ đơn, gọi đơn giữ ra, và chốt đơn + dựng phiếu in.
 * Tách khỏi `pos-page.tsx` để mỗi file dưới 200 dòng (quy tắc chung của bản kế hoạch).
 * Phiếu in dựng từ số server trả về (`PosSaleResult`) + dòng hàng của tạm tính — không tự cộng.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '../../../components/ui';
import { salesPosApi, type PosSaleResult, type PosTender } from '../../../api/sales/pos';
import type { ReceiptData } from '../../../components/pos-receipt-template';
import { fetchProductById } from './pos-catalog-lookup';
import { buyerToNote, type PosInvoiceBuyer } from './pos-invoice-buyer';
import type { PosSession } from './use-pos-session';

const errMessage = (err: unknown) => (err as { normalized?: { message?: string } })?.normalized?.message;
interface UsePosActionsArgs {
    session: PosSession;
    cashierName?: string;
    buyer: PosInvoiceBuyer | null;
    serialCategoryIds?: Set<string>;
    onSold: () => void;
}

export function usePosActions({ session, cashierName, buyer, serialCategoryIds, onSold }: UsePosActionsArgs) {
    const qc = useQueryClient();
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState<ReceiptData | null>(null);
    const [lastSale, setLastSale] = useState<PosSaleResult | null>(null);

    const hold = async () => {
        if (!session.store) return;
        const label = session.customer?.fullName || session.walkInName || `Quầy ${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}`;
        try {
            await salesPosApi.heldOrders.create({
                label,
                storeId: session.store.id,
                lines: session.lines.map((l) => ({
                    productId: l.productId, quantity: l.quantity, variantId: l.variantId ?? null, serials: l.serials ?? [],
                })),
                estimatedTotal: session.quote?.total ?? 0,
                customerId: session.customer?.id ?? null,
                customerName: session.customer?.fullName ?? session.walkInName ?? null,
                customerPhone: session.customer?.phone ?? session.walkInPhone ?? null,
            });
            notify.success('Đã giữ đơn', { description: label });
            qc.invalidateQueries({ queryKey: ['pos', 'held-orders'] });
            session.reset();
        } catch (err) {
            notify.error('Không giữ được đơn', {
                description: errMessage(err),
            });
        }
    };

    const resume = async (id: string) => {
        try {
            const detail = await salesPosApi.heldOrders.get(id);
            session.reset();
            for (const line of detail.lines) {
                const product = await fetchProductById(line.productId);
                session.addLine({
                    productId: line.productId,
                    quantity: line.quantity,
                    variantId: line.variantId ?? null,
                    serials: line.serials ?? [],
                    productName: product?.name ?? 'Sản phẩm',
                    sku: product?.sku,
                    imageUrl: product?.thumbnailUrl ?? product?.imageUrl ?? null,
                    listPrice: product?.price ?? 0,
                    serialTracked: product ? (serialCategoryIds?.has(product.categoryId) ?? false) : false,
                });
            }
            session.setHeldOrderId(id);
            if (detail.header.customerName) session.setWalkInName(detail.header.customerName);
            if (detail.header.customerPhone) session.setWalkInPhone(detail.header.customerPhone);
            notify.success('Đã gọi đơn giữ ra quầy');
        } catch (err) {
            notify.error('Không gọi được đơn giữ', {
                description: errMessage(err),
            });
        }
    };

    const checkout = async (tenders: PosTender[]) => {
        if (!session.store || !session.quote) return;
        // Chốt chặn thứ hai: tạm tính đang tải lại ⇒ số tiền thu ngân vừa nhìn là số CŨ.
        if (session.quoteQuery.isFetching || session.quoteQuery.isPlaceholderData) {
            notify.warning('Đang tính lại tổng tiền', { description: 'Chờ tạm tính mới rồi thu tiền.' });
            return;
        }
        setSubmitting(true);
        try {
            const noteParts = [session.notes, buyer ? buyerToNote(buyer) : null].filter(Boolean);
            const sale = await salesPosApi.createOrder({
                lines: session.lines.map((l) => ({
                    productId: l.productId, quantity: l.quantity, variantId: l.variantId ?? null, serials: l.serials ?? [],
                })),
                storeId: session.store.id,
                customerId: session.customer?.id ?? null,
                customerName: session.customer?.fullName ?? (session.walkInName || null),
                customerPhone: session.customer?.phone ?? (session.walkInPhone || null),
                manualDiscount: session.manualDiscount,
                manualDiscountReason: session.discountReason || null,
                approvedBy: session.approvedBy,
                tenders,
                notes: noteParts.length ? noteParts.join(' | ') : null,
                heldOrderId: session.heldOrderId,
            });
            setLastSale(sale);
            setReceipt({
                orderNumber: sale.orderNumber,
                issuedAt: new Date().toISOString(),
                cashierName: cashierName,
                customerName: session.customer?.fullName ?? session.walkInName ?? null,
                customerPhone: session.customer?.phone ?? session.walkInPhone ?? null,
                lines: session.quote.lines.map((l) => ({
                    productName: l.productName, quantity: l.quantity, unitPrice: l.unitPrice, payable: l.payable,
                })),
                subtotal: session.quote.subtotal,
                discount: session.quote.discount,
                taxAmount: session.quote.taxAmount,
                total: sale.total,
                collected: sale.collected,
                changeDue: sale.changeDue,
                amountDue: sale.amountDue,
                isDeposit: sale.isDeposit,
                tenders: tenders.map((t) => ({ method: t.method, amount: t.amount })),
                loyaltyPointsEarned: sale.loyaltyPointsEarned,
            });
            onSold();
            session.reset();
            notify.success(`Đã chốt đơn ${sale.orderNumber}`, {
                description: sale.changeDue > 0 ? `Thối lại ${sale.changeDue.toLocaleString('vi-VN')}đ` : undefined,
            });
        } catch (err) {
            notify.error('Không chốt được đơn', {
                description: errMessage(err),
            });
        } finally {
            setSubmitting(false);
        }
    };


    return { hold, resume, checkout, submitting, receipt, lastSale };
}
