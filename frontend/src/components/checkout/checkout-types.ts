/**
 * Shared types cho luồng checkout 4 bước.
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
    ward: string;
    district: string;
    province: string;
    deliveryMethod: DeliveryMethod;
    pickupStoreId: string;
    pickupStoreName: string;
    /** Guest tuỳ chọn tạo tài khoản sau khi đặt (chỉ gửi cờ, không thu password ở đây). */
    createAccount: boolean;
    /** Khoá địa chỉ đã chọn từ sổ (nếu có), để backend biết dùng lại thay vì tạo mới. */
    addressId?: string;
    notes?: string;
}

export interface PaymentFormState {
    paymentMethod: PaymentMethod;
    vnpayBank?: VnpayBankKind;
    installmentProviderCode?: string;
    installmentTerm?: 6 | 9 | 12;
    installmentDownPayment?: number;
    installmentMonthly?: number;
    installmentIdFrontFileId?: string;
    installmentIdBackFileId?: string;
}

export interface CheckoutPersistedState {
    step: CheckoutStep;
    shipping: ShippingFormState;
    payment: PaymentFormState;
    promotionCode: string | null;
    sessionId?: string;
    sessionExpiresAt?: string;
    calculatedShippingFee: number;
    ghnDistrictId: number;
    ghnWardCode: string;
}

export const initialShippingState: ShippingFormState = {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    ward: '',
    district: '',
    province: '',
    deliveryMethod: 'delivery',
    pickupStoreId: '',
    pickupStoreName: '',
    createAccount: false,
    notes: '',
};

export const initialPaymentState: PaymentFormState = {
    paymentMethod: 'cod',
};

export const CHECKOUT_STORAGE_KEY = 'qhc.checkout.v1';
