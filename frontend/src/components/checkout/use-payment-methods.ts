import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import type { PaymentMethod } from './checkout-types';

/**
 * D04 (quyết định ràng buộc, xem plans/.../decisions/D04-thanh-toan-luc-ra-mat.md, mục R1):
 * `GET /api/payments/methods` là MỘT nguồn sự thật duy nhất cho danh sách phương thức thanh
 * toán đang bật — checkout/footer/PDP/trang chính sách đều phải render từ đây, cấm hardcode.
 * Lỗi mạng hoặc 404 (backend W0-10 chưa triển khai / provider chưa cấu hình khoá) → chỉ còn COD.
 *
 * Hợp đồng response CHƯA được xác nhận với track backend sở hữu endpoint này (W0-10) tại thời
 * điểm viết — parse phòng thủ cả 2 dạng hợp lý: mảng string mã phương thức, hoặc mảng object có
 * field method/code/id. Xem integration-requests-w0.md để chốt hợp đồng chính thức.
 */

const KNOWN_METHODS: PaymentMethod[] = ['cod', 'bank_transfer', 'vnpay', 'momo'];
const FALLBACK: PaymentMethod[] = ['cod'];

function normalize(raw: unknown): PaymentMethod[] {
    if (!Array.isArray(raw)) return FALLBACK;
    const codes = raw
        .map((item): string | null => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
                const obj = item as Record<string, unknown>;
                const v = obj.method ?? obj.code ?? obj.id;
                return typeof v === 'string' ? v : null;
            }
            return null;
        })
        .filter((v): v is string => Boolean(v))
        .map(v => v.toLowerCase());

    const enabled = KNOWN_METHODS.filter(m => codes.includes(m));
    // COD luôn bật theo D04 mục 2 — nếu response quên liệt kê, vẫn không chặn khách đặt hàng.
    if (!enabled.includes('cod')) enabled.unshift('cod');
    return enabled.length > 0 ? enabled : FALLBACK;
}

export function usePaymentMethods(): PaymentMethod[] {
    const query = useQuery({
        queryKey: ['payment-methods'],
        queryFn: async () => {
            const { data } = await client.get('/payments/methods');
            return normalize(data);
        },
        staleTime: 60_000, // R1: cache 60s
        retry: false,
        // Hiện COD ngay trong lúc chờ / khi lỗi — không để danh sách trống một nhịp (D04: on error/404 chỉ hiện COD).
        placeholderData: FALLBACK,
    });

    return query.data ?? FALLBACK;
}
