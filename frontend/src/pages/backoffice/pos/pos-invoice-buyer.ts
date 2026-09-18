/** Người mua trên hoá đơn công ty (D07). Tách khỏi dialog để file component chỉ export component. */
export interface PosInvoiceBuyer {
    companyName: string;
    taxCode: string;
    address: string;
    email: string;
}

/** Gửi kèm đơn qua `notes` cho tới khi backend mở trường `invoiceBuyer` (IR w3#6). */
export const buyerToNote = (b: PosInvoiceBuyer) =>
    `Xuất HĐ công ty: ${b.companyName} | MST: ${b.taxCode} | ĐC: ${b.address}${b.email ? ` | Email: ${b.email}` : ''}`;
