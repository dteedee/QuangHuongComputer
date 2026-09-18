import { z } from 'zod';

/**
 * Zod schema cho luồng checkout — soi theo validator backend
 * (`backend/Services/Sales/Validators/CheckoutValidators.cs` + `CheckoutRequestGuard`):
 * bắt buộc tên người nhận và số điện thoại; địa chỉ bắt buộc khi giao tận nơi.
 *
 * Dùng MỘT object phẳng + `superRefine` (không phải `discriminatedUnion`) để `Control<T>`
 * của RHF còn suy ra được đường dẫn field — union làm hỏng `FieldPath`.
 */

const phoneRe = /^0\d{9,10}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const shippingSchema = z.object({
    deliveryMethod: z.enum(['delivery', 'pickup']),
    fullName: z.string().trim().min(2, 'Vui lòng nhập họ tên người nhận'),
    phone: z.string().trim().regex(phoneRe, 'Số điện thoại phải có 10-11 chữ số và bắt đầu bằng 0'),
    email: z.string().trim(),
    provinceCode: z.string(),
    province: z.string(),
    wardCode: z.string(),
    ward: z.string(),
    address: z.string().trim(),
    pickupStoreId: z.string(),
    pickupStoreName: z.string(),
    notes: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
    createAccount: z.boolean(),
    saveAddress: z.boolean(),
    addressId: z.string().optional(),
}).superRefine((v, ctx) => {
    const require = (path: keyof typeof v, message: string) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (v.deliveryMethod === 'delivery') {
        if (!emailRe.test(v.email)) require('email', 'Email không hợp lệ');
        if (!v.province) require('provinceCode', 'Vui lòng chọn tỉnh/thành phố');
        if (!v.ward) require('wardCode', 'Vui lòng chọn phường/xã');
        if (v.address.trim().length < 5) require('address', 'Nhập số nhà và tên đường');
    } else {
        if (!v.pickupStoreId) require('pickupStoreId', 'Vui lòng chọn cửa hàng nhận hàng');
        if (v.email && !emailRe.test(v.email)) require('email', 'Email không hợp lệ');
    }
});

export type ShippingSchemaValues = z.infer<typeof shippingSchema>;

/**
 * D07 (hoá đơn cho tổ chức) + D08 (đồng ý điều khoản) — bước 4 "Xác nhận & đặt hàng".
 * Mã số thuế 10 chữ số (hoặc `0123456789-001` cho đơn vị phụ thuộc); đơn vị dùng ngân sách
 * nhà nước khai mã quan hệ ngân sách thay cho mã số thuế.
 */
export const reviewSchema = z.object({
    requested: z.boolean(),
    buyerType: z.enum(['Company', 'BudgetUnit']),
    legalName: z.string().trim(),
    taxCode: z.string().trim(),
    budgetUnitCode: z.string().trim(),
    address: z.string().trim(),
    email: z.string().trim(),
    /** D08 — không tick thì không đặt được hàng. */
    termsAccepted: z.boolean(),
}).superRefine((v, ctx) => {
    const require = (path: keyof typeof v, message: string) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (!v.termsAccepted) {
        require('termsAccepted', 'Vui lòng xác nhận bạn đã đọc và đồng ý với các chính sách của cửa hàng');
    }

    if (!v.requested) return;

    if (v.legalName.length < 3) require('legalName', 'Nhập tên đơn vị theo đăng ký kinh doanh');
    if (v.address.length < 5) require('address', 'Nhập địa chỉ trên đăng ký kinh doanh');
    if (!emailRe.test(v.email)) require('email', 'Email nhận hóa đơn không hợp lệ');

    if (v.buyerType === 'BudgetUnit') {
        if (!v.budgetUnitCode) require('budgetUnitCode', 'Nhập mã quan hệ ngân sách');
    } else if (!/^\d{10}(-\d{3})?$/.test(v.taxCode)) {
        require('taxCode', 'Mã số thuế gồm 10 chữ số (hoặc dạng 0123456789-001)');
    }
});

export type ReviewSchemaValues = z.infer<typeof reviewSchema>;
