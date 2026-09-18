/**
 * Client thanh toán. Hợp đồng: `docs/api-contracts/payments.md`.
 *
 * Ba luật của D04 được phản ánh ngay trong kiểu dữ liệu ở đây:
 *  - Không có đường "thành công giả": `mockWebhook` và `parseVNPayCallback` đã bị xoá.
 *    Kết quả thanh toán CHỈ đọc từ `GET /payments/{id}` (tham số redirect không phải bằng chứng).
 *  - Số tiền do server quyết định. `amount` trong body `/initiate` bị server bỏ qua hoàn toàn.
 *  - Không API nào trả secret: `/admin/config` che mọi giá trị `isSecret`, `/admin/status` chỉ
 *    trả TÊN khoá còn thiếu.
 */
import client from './client';
import { providerEnumFor } from './payments/methods';

export type PaymentStatus =
    | 'Pending'
    | 'Succeeded'
    | 'Failed'
    | 'Cancelled'
    | 'Refunded'
    | 'PartiallyRefunded';

/** `GET /api/payments/{id}` — trạng thái công khai, không chứa secret. */
export interface PaymentStatusResponse {
    id: string;
    orderId: string;
    amount: number;
    amountRefunded: number;
    currency: string;
    status: PaymentStatus;
    /** Tên enum backend: `COD` · `SePay` (= chuyển khoản VietQR) · `VnPay` · `Momo` · `Installment`. */
    provider: string;
    externalId?: string | null;
    paymentCode?: string | null;
    expiresAt?: string | null;
    confirmedAt?: string | null;
    settlement: string;
    createdAt: string;
}

/** Dữ liệu màn VietQR (D04 mục 3b) — QR KHÔNG BAO GIỜ đứng một mình. */
export interface PaymentTransferInfo {
    bankBin: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    paymentCode: string;
    qrPayload: string;
    /** Đường dẫn ảnh QR; cần token nên phải tải bằng `fetchQrObjectUrl`, không đặt thẳng vào `<img src>`. */
    qrImageUrl: string;
    expiresAt?: string | null;
    notice: string;
}

/** `kind`: `none` (COD) · `bank_transfer` (VietQR) · `redirect` (cổng → dùng `paymentUrl`). */
export type PaymentInstructionKind = 'none' | 'bank_transfer' | 'redirect';

export interface PaymentInitiationResponse {
    paymentId: string;
    status: PaymentStatus;
    amount: number;
    /** true khi tái sử dụng một intent `Pending` đã có của cùng (đơn, provider). */
    reused: boolean;
    kind: PaymentInstructionKind;
    paymentUrl: string;
    paymentCode?: string | null;
    expiresAt?: string | null;
    transfer?: PaymentTransferInfo | null;
    message?: string | null;
}

export interface InitiatePaymentRequest {
    orderId: string;
    /** Bị server BỎ QUA (giữ để không phá hợp đồng cũ) — số tiền luôn là tổng đơn đọc ở server. */
    amount?: number;
    /** Giá trị enum `PaymentProvider`. Dùng `initiateByMethodCode` để khỏi nhớ số. */
    provider: number;
    bankCode?: string;
}

/** `GET /api/payments/admin/status` — bảng "Đã cấu hình / Thiếu: ...". */
export interface PaymentProviderStatus {
    provider: string;
    code: string;
    name: string;
    configured: boolean;
    direct: boolean;
    /** TÊN khoá còn thiếu, không bao giờ là giá trị. */
    missingKeys: string[];
}

export interface PaymentWebhookUrls {
    sePayWebhook: string;
    vnPayReturn: string;
    moMoIpn: string;
}

export interface PaymentConfigEntry {
    key: string;
    /** Giá trị đã che `****1234` khi `isSecret` — server không bao giờ trả secret thật. */
    value: string;
    description?: string;
    isSecret: boolean;
    updatedAt?: string;
}

export const paymentApi = {
    /** Tạo/tái dùng intent. Ném lỗi API chuẩn (`PAYMENT_METHOD_UNAVAILABLE` 400, ...). */
    initiate: async (data: InitiatePaymentRequest): Promise<PaymentInitiationResponse> => {
        const { data: res } = await client.post<PaymentInitiationResponse>('/payments/initiate', data);
        return res;
    },

    /** Tiện ích: nhận mã phương thức của `/methods` thay vì số enum. */
    initiateByMethodCode: async (
        orderId: string,
        methodCode: string,
        bankCode?: string,
    ): Promise<PaymentInitiationResponse> => {
        const provider = providerEnumFor(methodCode);
        if (provider === null) {
            throw new Error(`Phương thức thanh toán không được hỗ trợ: ${methodCode}`);
        }
        return paymentApi.initiate({ orderId, provider, bankCode });
    },

    /** Nguồn sự thật DUY NHẤT của kết quả thanh toán (trang kết quả poll endpoint này). */
    get: async (id: string): Promise<PaymentStatusResponse> => {
        const { data } = await client.get<PaymentStatusResponse>(`/payments/${id}`);
        return data;
    },

    /**
     * Ảnh QR nằm trong nhóm đã yêu cầu đăng nhập ⇒ `<img src>` thuần sẽ 401.
     * Tải kèm token rồi tạo blob URL. Nơi gọi phải `URL.revokeObjectURL` khi unmount.
     */
    fetchQrObjectUrl: async (id: string, guestToken?: string): Promise<string> => {
        const url = guestToken
            ? `/payments/guest/${id}/qr.png?token=${encodeURIComponent(guestToken)}`
            : `/payments/${id}/qr.png`;
        const { data } = await client.get<Blob>(url, { responseType: 'blob' });
        return URL.createObjectURL(data);
    },

    /* --- khách vãng lai: token ký cho ĐÚNG một đơn (payments.md §3) --------- */
    guestInitiate: async (
        orderId: string,
        token: string,
        methodCode: string,
        bankCode?: string,
    ): Promise<PaymentInitiationResponse> => {
        const provider = providerEnumFor(methodCode);
        if (provider === null) {
            throw new Error(`Phương thức thanh toán không được hỗ trợ: ${methodCode}`);
        }
        const { data } = await client.post<PaymentInitiationResponse>('/payments/guest/initiate', {
            orderId, token, provider, bankCode,
        });
        return data;
    },

    guestGet: async (id: string, token: string): Promise<PaymentStatusResponse> => {
        const { data } = await client.get<PaymentStatusResponse>(
            `/payments/guest/${id}?token=${encodeURIComponent(token)}`,
        );
        return data;
    },

    /* --- admin (`Payments.Configure`) -------------------------------------- */
    getProviderStatus: async (): Promise<PaymentProviderStatus[]> => {
        const { data } = await client.get<PaymentProviderStatus[]>('/payments/admin/status');
        return data;
    },

    getWebhookUrls: async (): Promise<PaymentWebhookUrls> => {
        const { data } = await client.get<PaymentWebhookUrls>('/payments/admin/webhook-urls');
        return data;
    },

    getConfigs: async (): Promise<PaymentConfigEntry[]> => {
        const { data } = await client.get<PaymentConfigEntry[]>('/payments/admin/config');
        return data;
    },

    /** Chỉ dùng cho thiết lập KHÔNG mật (`isSecret` luôn false — secret chỉ nằm ở env, D04 R5). */
    saveConfig: async (entry: {
        key: string;
        value: string;
        description?: string;
    }): Promise<{ key: string; saved: boolean }> => {
        const { data } = await client.post('/payments/admin/config', {
            ...entry,
            description: entry.description ?? '',
            isSecret: false,
        });
        return data;
    },
};

/** Nhãn trạng thái tiếng Việt cho màn kết quả và trang admin. */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
    Pending: 'Đang chờ thanh toán',
    Succeeded: 'Đã thanh toán',
    Failed: 'Thanh toán thất bại',
    Cancelled: 'Đã huỷ',
    Refunded: 'Đã hoàn tiền',
    PartiallyRefunded: 'Đã hoàn một phần',
};

/** Trạng thái cuối — không cần poll tiếp. */
export const isTerminalPaymentStatus = (s: PaymentStatus): boolean =>
    s !== 'Pending';

/**
 * @deprecated Ví MoMo nằm trong backlog D04 (chưa có khoá ⇒ vắng khỏi `/methods`, `/initiate`
 * trả 400). Chỉ còn tồn tại vì `components/checkout/use-checkout-submit.ts` (thuộc W3-2) vẫn
 * import — xem integration-requests-w3.md, W3-2 gỡ lời gọi rồi hàm này bị xoá.
 */
export async function initiateMoMoPayment(
    orderId: string,
    /** Bị bỏ qua — server tự đọc tổng đơn. Giữ tham số cho call site cũ. */
    _amount?: number,
): Promise<PaymentInitiationResponse> {
    return paymentApi.initiateByMethodCode(orderId, 'momo');
}

/**
 * @deprecated D04 đã XOÁ ZaloPay khỏi hệ thống (không còn provider, không còn route webhook).
 * Giữ lại nguyên nhân y hệt hàm trên; gọi vào đây luôn thất bại một cách tường minh thay vì
 * gửi một request chắc chắn 400.
 */
export async function initiateZaloPayPayment(
    _orderId?: string,
    _amount?: number,
): Promise<PaymentInitiationResponse> {
    throw new Error('Phương thức ZaloPay đã ngừng hỗ trợ. Vui lòng chọn phương thức khác.');
}
