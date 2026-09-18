/**
 * Shared types cho luồng checkout 4 bước (Giao hàng → Khuyến mãi → Thanh toán → Xác nhận).
 * Không chứa logic — chỉ định nghĩa hình dạng dữ liệu.
 */

export type CheckoutStep = 1 | 2 | 3 | 4;

export type DeliveryMethod = 'delivery' | 'pickup';

export type PaymentMethod =
    | 'cod'
    | 'bank_transfer'
    | 'vnpay'
    | 'momo'
    | 'zalopay'
    | 'installment';

export type VnpayBankKind = 'domestic' | 'international' | 'atm';

export interface ShippingFormState {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    /** Tên phường/xã (2 cấp 2025) — hiển thị và lưu vào địa chỉ đơn. */
    ward: string;
    /** Mã phường/xã do backend trả (`GET /sales/shipping/provinces/{code}/wards`). */
    wardCode: string;
    /** Tên tỉnh/thành. Cấp "quận/huyện" đã bị bỏ từ 01/07/2025. */
    province: string;
    /** Mã tỉnh 2 chữ số. */
    provinceCode: string;
    deliveryMethod: DeliveryMethod;
    pickupStoreId: string;
    pickupStoreName: string;
    /** Guest tuỳ chọn tạo tài khoản sau khi đặt (chỉ gửi cờ, không thu password ở đây). */
    createAccount: boolean;
    /** Lưu địa chỉ này vào sổ địa chỉ sau khi đặt hàng. */
    saveAddress: boolean;
    /** Khoá địa chỉ đã chọn từ sổ (nếu có). */
    addressId?: string;
    notes?: string;
}

/** D07 — khối "Thông tin hóa đơn" ở bước xác nhận. */
export interface InvoiceFormState {
    /** Khách tick "Xuất hóa đơn cho công ty/đơn vị". */
    requested: boolean;
    buyerType: 'Company' | 'BudgetUnit';
    legalName: string;
    taxCode: string;
    budgetUnitCode: string;
    address: string;
    email: string;
}

export interface PaymentFormState {
    paymentMethod: PaymentMethod;
    vnpayBank?: VnpayBankKind;
    installmentProviderCode?: string;
    installmentTerm?: 6 | 9 | 12;
    installmentDownPayment?: number;
    installmentMonthly?: number;
    /** D10 — khách đồng ý cho chuyển thông tin sang công ty tài chính. */
    installmentConsent?: boolean;
}

export interface CheckoutPersistedState {
    step: CheckoutStep;
    shipping: ShippingFormState;
    payment: PaymentFormState;
    invoice: InvoiceFormState;
    promotionCode: string | null;
    sessionId?: string;
    sessionExpiresAt?: string;
    /** Phí ship do SERVER báo ở bước 1 (chỉ để hiển thị; server tính lại khi chốt đơn). */
    quotedShippingFee: number;
}

export const initialShippingState: ShippingFormState = {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    ward: '',
    wardCode: '',
    province: '',
    provinceCode: '',
    deliveryMethod: 'delivery',
    pickupStoreId: '',
    pickupStoreName: '',
    createAccount: false,
    saveAddress: false,
    notes: '',
};

export const initialInvoiceState: InvoiceFormState = {
    requested: false,
    buyerType: 'Company',
    legalName: '',
    taxCode: '',
    budgetUnitCode: '',
    address: '',
    email: '',
};

export const initialPaymentState: PaymentFormState = {
    paymentMethod: 'cod',
};

export const CHECKOUT_STORAGE_KEY = 'qhc.checkout.v2';
