/**
 * Phiếu in tại quầy (khổ 80mm).
 *
 * Số liệu vào đây PHẢI là số server trả về (`/sales/pos/quote` + `/sales/pos/orders`), không phải
 * số client tự cộng — hoá đơn in ra và đơn lưu trong CSDL luôn phải khớp nhau đến từng đồng.
 *
 * Sửa IR w0#31: dòng VAT không còn nằm trong phép cộng dọc. Giá đã GỒM VAT (D01), nên VAT là
 * dòng thông tin ("Trong đó VAT (đã gồm)"), không phải một khoản cộng thêm vào tổng.
 * D10: thu thiếu tổng đơn ⇒ in PHIẾU THU (đặt cọc), không in hoá đơn bán lẻ.
 */
import { forwardRef } from 'react';
import { useCompanyInfo } from '../hooks/use-company-info';

export interface ReceiptLine {
    productName: string;
    quantity: number;
    unitPrice: number;
    payable: number;
}

export interface ReceiptTender {
    method: string;
    amount: number;
}

export interface ReceiptData {
    orderNumber: string;
    issuedAt: string;
    cashierName?: string;
    customerName?: string | null;
    customerPhone?: string | null;
    lines: ReceiptLine[];
    subtotal: number;
    discount: number;
    /** Đã nằm TRONG `total` — chỉ để khách và kế toán đối chiếu. */
    taxAmount: number;
    total: number;
    collected: number;
    changeDue: number;
    amountDue: number;
    isDeposit: boolean;
    tenders: ReceiptTender[];
    loyaltyPointsEarned?: number;
}

const dong = (n: number) => n.toLocaleString('vi-VN');

const TENDER_LABELS: Record<string, string> = {
    Cash: 'Tiền mặt', Card: 'Thẻ', Transfer: 'Chuyển khoản', SePay: 'SePay',
};

const PosReceiptTemplate = forwardRef<HTMLDivElement, { data: ReceiptData }>(function PosReceiptTemplate({ data }, ref) {
    const { companyInfo } = useCompanyInfo();
    return (
        <div ref={ref} id="pos-receipt" className="mx-auto w-[80mm] bg-white p-2 font-mono text-xs text-black print:p-0">
            <div className="mb-3 text-center">
                <h1 className="text-sm font-bold">{companyInfo.name}</h1>
                <p>{companyInfo.address}</p>
                <p>ĐT: {companyInfo.phone2}</p>
                <p className="text-[10px]">MST: {companyInfo.taxCode}</p>
                <p className="mt-2 text-sm font-bold">
                    {data.isDeposit ? 'PHIẾU THU ĐẶT CỌC' : 'HOÁ ĐƠN BÁN LẺ'}
                </p>
            </div>

            <div className="mb-2 border-t border-dashed border-black pt-2">
                <p>Số: {data.orderNumber}</p>
                <p>Ngày: {new Date(data.issuedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
                {data.cashierName && <p>Thu ngân: {data.cashierName}</p>}
                {data.customerName && <p>Khách: {data.customerName}</p>}
                {data.customerPhone && <p>SĐT: {data.customerPhone}</p>}
            </div>

            <div className="border-t border-dashed border-black pt-2">
                {data.lines.map((line, i) => (
                    <div key={`${line.productName}-${i}`} className="mb-1">
                        <div className="truncate">{line.productName}</div>
                        <div className="flex justify-between">
                            <span>{line.quantity} x {dong(line.unitPrice)}</span>
                            <span>{dong(line.payable)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-2 border-t border-dashed border-black pt-2">
                <div className="flex justify-between"><span>Tạm tính:</span><span>{dong(data.subtotal)}</span></div>
                {data.discount > 0 && (
                    <div className="flex justify-between"><span>Giảm giá:</span><span>-{dong(data.discount)}</span></div>
                )}
                <div className="flex justify-between border-t border-dashed border-black pt-1 text-sm font-bold">
                    <span>TỔNG CỘNG:</span><span>{dong(data.total)}đ</span>
                </div>
                <div className="flex justify-between text-[10px]">
                    <span>Trong đó VAT (đã gồm):</span><span>{dong(data.taxAmount)}</span>
                </div>
            </div>

            <div className="mt-2 border-t border-dashed border-black pt-2">
                {data.tenders.map((t, i) => (
                    <div key={`${t.method}-${i}`} className="flex justify-between">
                        <span>{TENDER_LABELS[t.method] ?? t.method}:</span><span>{dong(t.amount)}</span>
                    </div>
                ))}
                <div className="flex justify-between"><span>Đã thu:</span><span>{dong(data.collected)}</span></div>
                {data.changeDue > 0 && (
                    <div className="flex justify-between font-bold"><span>Tiền thối:</span><span>{dong(data.changeDue)}</span></div>
                )}
                {data.amountDue > 0 && (
                    <div className="flex justify-between font-bold"><span>Còn phải thu:</span><span>{dong(data.amountDue)}</span></div>
                )}
            </div>

            <div className="mt-3 border-t border-dashed border-black pt-2 text-center">
                {data.isDeposit && <p className="mb-1 font-bold">Hàng giao khi thanh toán đủ.</p>}
                {!!data.loyaltyPointsEarned && <p>Điểm tích luỹ: +{data.loyaltyPointsEarned}</p>}
                <p>Cảm ơn quý khách!</p>
                <p className="text-[10px]">Bảo hành theo chính sách nhà sản xuất</p>
            </div>
        </div>
    );
});

export default PosReceiptTemplate;
