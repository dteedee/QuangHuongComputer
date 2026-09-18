import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { salesApi } from '../api/sales';
import OrderConfirmation from '../components/checkout/order-confirmation';
import { parseCheckoutSuccessParams } from '../components/checkout/checkout-success-url';

/**
 * `/checkout/success/:orderId` — trang xác nhận đơn hàng có URL RIÊNG (khác CheckoutPage)
 * nên RELOAD không mất xác nhận (trước đây step=4 chỉ tồn tại trong state của CheckoutPage,
 * F5 là mất, hoặc tệ hơn — effect "giỏ rỗng → /cart" còn đá thẳng ra khỏi trang).
 *
 * Nguồn dữ liệu, 2 lớp:
 * 1. Query string (`amount`, `number`, `method`, `qr`, `guestEmail`) do CheckoutPage gắn lúc
 *    điều hướng — LUÔN có sẵn ngay cả khi reload, kể cả với khách vãng lai.
 * 2. `GET /sales/orders/{id}` (salesApi.orders.getById) — dữ liệu MỚI hơn, nhưng backend
 *    endpoint này yêu cầu đăng nhập và chỉ trả đơn của đúng customer đó (xem
 *    `backend/Services/Sales/SalesEndpoints.cs` dòng ~969) → KHÔNG dùng được cho khách vãng
 *    lai. Khi có, ưu tiên số liệu từ đây (mới nhất); khi không (guest, hoặc lỗi mạng), fallback
 *    im lặng về dữ liệu từ query string — vẫn còn đủ để hiển thị, không trắng trang.
 *
 * Integration request: BE Sales cần 1 endpoint đọc đơn cho khách vãng lai (theo id + email,
 * hoặc theo orderNumber) để bỏ hẳn phụ thuộc vào query string — xem
 * reports/integration-requests-w0.md.
 */
export function CheckoutSuccessPage() {
    const { orderId } = useParams<{ orderId: string }>();
    const [searchParams] = useSearchParams();
    const { isAuthenticated } = useAuth();

    const fromUrl = parseCheckoutSuccessParams(searchParams);

    const { data: liveOrder, isLoading } = useQuery({
        queryKey: ['order-confirmation', orderId],
        queryFn: () => salesApi.orders.getById(orderId!),
        enabled: Boolean(orderId && isAuthenticated),
        retry: false,
        staleTime: 60_000,
    });

    if (!orderId) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center text-gray-500 text-sm">
                Thiếu mã đơn hàng.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    // liveOrder ưu tiên (mới nhất, có với khách đã đăng nhập); guest hoặc lỗi tải → dùng query string.
    const totalAmount = liveOrder?.totalAmount ?? fromUrl?.amount ?? 0;
    const orderNumber = liveOrder?.orderNumber ?? fromUrl?.number;
    const paymentMethod = fromUrl?.paymentMethod ?? 'cod';

    if (!liveOrder && !fromUrl) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center gap-3 px-4">
                <p className="text-gray-700 font-semibold">Không tải được chi tiết đơn hàng.</p>
                <p className="text-sm text-gray-500">
                    Mã đơn: <span className="font-mono font-bold">#{orderId.substring(0, 8).toUpperCase()}</span> — đơn vẫn đã được ghi nhận, vui lòng kiểm tra email xác nhận hoặc liên hệ hỗ trợ.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 font-sans">
            <div className="max-w-2xl mx-auto px-4 sm:px-6">
                <OrderConfirmation
                    orderId={orderId}
                    orderNumber={orderNumber}
                    totalAmount={totalAmount}
                    paymentMethod={paymentMethod}
                    guestEmail={fromUrl?.guestEmail}
                    qrPaymentUrl={fromUrl?.qrUrl}
                    isGuest={!isAuthenticated}
                />
            </div>
        </div>
    );
}

export default CheckoutSuccessPage;
