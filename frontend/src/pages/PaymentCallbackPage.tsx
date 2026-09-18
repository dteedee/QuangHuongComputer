import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PaymentResultPage } from './PaymentResultPage';

/**
 * Điểm tiếp đất của mọi đường quay về từ cổng thanh toán
 * (`/payment/callback`, `/payment/vnpay-return`, `/payment/momo-return`, ...).
 *
 * Trang này KHÔNG kết luận gì từ tham số URL — `vnp_ResponseCode=00` không phải bằng chứng đã trả
 * tiền (D04 mục 4: chỉ IPN mới ghi được trạng thái). Việc duy nhất nó làm là rút mã giao dịch ra
 * khỏi URL rồi để `PaymentResultPage` poll `GET /payments/{id}`.
 *
 * `vnp_TxnRef` = 32 ký tự đầu là intent id dạng Guid "N" + 12 ký tự ngày
 * (`VnPayPaymentUrlBuilder`), nên cắt 32 ký tự đầu là ra mã giao dịch.
 */

const GUID_N = /^[0-9a-f]{32}$/i;

function extractPaymentId(params: URLSearchParams): string | null {
    const direct = params.get('paymentId');
    if (direct) return direct;

    const txnRef = params.get('vnp_TxnRef') ?? params.get('orderId') ?? params.get('requestId');
    if (txnRef && txnRef.length >= 32) {
        const head = txnRef.slice(0, 32);
        if (GUID_N.test(head)) return head;
    }
    return null;
}

export const PaymentCallbackPage = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const paymentId = extractPaymentId(params);
    const alreadyNormalised = params.get('paymentId') !== null;

    // Chuẩn hoá URL về `?paymentId=…` một lần để người dùng tải lại trang vẫn tra được đúng giao dịch.
    useEffect(() => {
        if (!paymentId || alreadyNormalised) return;
        const next = new URLSearchParams();
        next.set('paymentId', paymentId);
        const err = params.get('error');
        if (err) next.set('error', err);
        navigate(`${location.pathname}?${next.toString()}`, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentId, alreadyNormalised]);

    // Trước khi URL được chuẩn hoá, `PaymentResultPage` chưa thấy `paymentId` và sẽ loé lên một
    // khung "Không tra cứu được giao dịch" — giữ màn chờ cho tới khi effect trên chạy xong.
    if (paymentId && !alreadyNormalised) {
        return (
            <div className="min-h-[60vh] bg-bg py-10" role="status" aria-live="polite" aria-busy>
                <span className="sr-only">Đang kiểm tra trạng thái thanh toán…</span>
            </div>
        );
    }

    return <PaymentResultPage />;
};

export default PaymentCallbackPage;
