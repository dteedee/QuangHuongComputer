/**
 * `GET /api/payments/methods` — NGUỒN SỰ THẬT DUY NHẤT về phương thức thanh toán.
 *
 * D04 R1 (binding): checkout, footer, trang sản phẩm, trang chính sách và POS đều render từ đây.
 * Cấm hardcode danh sách hay logo. Gọi lỗi/404 ⇒ CHỈ còn COD (không bao giờ về danh sách cứng,
 * không bao giờ hiện ô "sắp ra mắt").
 *
 * Hợp đồng: `docs/api-contracts/payments.md` §1. Public, `Cache-Control: public, max-age=60`.
 * Trên dữ liệu ra mắt kết quả đúng là đúng một phần tử `cod`.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import client from '../client';

export interface PaymentMethodDto {
    /** `cod` · `bank_transfer` · `vnpay` · `momo` · `installment` (server quyết định). */
    code: string;
    name: string;
    description: string;
    /** true ⇒ phải chuyển hướng sang cổng (dùng `paymentUrl` của `/initiate`). */
    requiresRedirect: boolean;
    /** false ⇒ KHÔNG gọi `/initiate`, dẫn khách sang luồng hồ sơ (trả góp — D10). */
    direct: boolean;
    sortOrder: number;
}

export interface PaymentMethodsResult {
    methods: PaymentMethodDto[];
    /** true khi danh sách là bản dự phòng vì gọi API thất bại (D04 R1). */
    degraded: boolean;
}

/**
 * Dự phòng khi `/methods` không gọi được. COD luôn bật (D04 mục 2, tầng 0) nên đây là
 * trạng thái an toàn duy nhất: khách vẫn đặt được hàng, hệ thống không hứa điều không làm được.
 */
export const COD_FALLBACK: PaymentMethodDto = {
    code: 'cod',
    name: 'Thanh toán khi nhận hàng',
    description: 'Trả tiền mặt cho nhân viên giao hàng khi nhận máy.',
    requiresRedirect: false,
    direct: true,
    sortOrder: 10,
};

/**
 * Mã phương thức → giá trị enum `PaymentProvider` của backend.
 * GIÁ TRỊ SỐ LÀ HỢP ĐỒNG DỮ LIỆU (`backend/Services/Payments/Domain/PaymentEnums.cs`):
 * 0 Stripe (đã xoá) · 1 VnPay · 2 Momo · 3 COD · 4 SePay = chuyển khoản VietQR · 5 ZaloPay
 * (đã xoá) · 6 Installment. Không bao giờ chèn giá trị vào giữa.
 */
export const PROVIDER_ENUM: Record<string, number> = {
    vnpay: 1,
    momo: 2,
    cod: 3,
    bank_transfer: 4,
    installment: 6,
};

export function providerEnumFor(code: string): number | null {
    return PROVIDER_ENUM[code] ?? null;
}

export const paymentMethodsQueryKey = ['payments', 'methods'] as const;

/** Gọi API; mọi lỗi (mạng, 404, 500) đều hạ xuống COD thay vì ném lên UI (D04 R1). */
export async function fetchPaymentMethods(): Promise<PaymentMethodsResult> {
    try {
        const { data } = await client.get<PaymentMethodDto[]>('/payments/methods');
        if (!Array.isArray(data) || data.length === 0) {
            return { methods: [COD_FALLBACK], degraded: true };
        }
        const methods = [...data].sort((a, b) => a.sortOrder - b.sortOrder);
        return { methods, degraded: false };
    } catch {
        return { methods: [COD_FALLBACK], degraded: true };
    }
}

/** Cache 60s đúng bằng `max-age` của server; prefetch được ở nơi mount checkout. */
export function usePaymentMethods(): UseQueryResult<PaymentMethodsResult> {
    return useQuery({
        queryKey: paymentMethodsQueryKey,
        queryFn: fetchPaymentMethods,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: false,
    });
}
