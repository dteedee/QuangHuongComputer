import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, RefreshCw, ArrowRight, ShoppingBag, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi, type Order } from '../api/sales';
import { paymentApi } from '../api/payment';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/format';

/**
 * Trang hợp nhất 3 chức năng:
 *  - /payment/:orderId          → retry (khởi tạo lại giao dịch cho đơn cụ thể)
 *  - /payment/callback (+*-return) → parse callback, chuyển thành success/failed
 *  - /payment/success | /payment/failed → hiển thị kết quả cuối cùng
 */

type Mode = 'retry' | 'callback' | 'success' | 'failed';

function detectMode(pathname: string, orderIdParam?: string): Mode {
    if (pathname.includes('/success')) return 'success';
    if (pathname.includes('/failed')) return 'failed';
    if (pathname.includes('/callback') || pathname.includes('-return')) return 'callback';
    if (orderIdParam) return 'retry';
    return 'callback';
}

export const PaymentResultPage = () => {
    const { orderId: orderIdParam } = useParams<{ orderId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { clearCart } = useCart();
    const [mode, setMode] = useState<Mode>(() => detectMode(window.location.pathname, orderIdParam));
    const [order, setOrder] = useState<Order | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [expired, setExpired] = useState(false);
    const [processing, setProcessing] = useState(false);
    const orderIdFromQuery = searchParams.get('orderId');
    const finalOrderId = orderIdParam ?? orderIdFromQuery ?? '';

    // Callback flow: parse VNPay-style params, chuyển tiếp tới success/failed
    useEffect(() => {
        if (mode !== 'callback') return;
        const result = paymentApi.parseVNPayCallback(searchParams);
        if (result.success) {
            clearCart();
            toast.success('Thanh toán thành công!');
            navigate(`/account/orders/${result.orderId}`, { replace: true });
        } else {
            const code = searchParams.get('vnp_ResponseCode') ?? 'unknown';
            setMode('failed');
            setErrorMsg(`Mã lỗi ${code}: ${result.message}`);
            toast.error(result.message);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // Retry flow: nạp lại đơn, kích hoạt lại thanh toán
    useEffect(() => {
        if (mode !== 'retry' || !finalOrderId) return;
        setProcessing(true);
        salesApi.orders.getById(finalOrderId).then(data => {
            if (data.status === 'Paid' || data.status === 'Completed') {
                toast('Đơn hàng đã thanh toán');
                navigate(`/account/orders/${data.id}`, { replace: true });
                return;
            }
            if (data.status === 'Cancelled') {
                setMode('failed');
                setErrorMsg('Đơn đã bị huỷ hoặc quá hạn thanh toán (24 giờ).');
                setExpired(true);
                return;
            }
            setOrder(data);
        }).catch(() => {
            setMode('failed');
            setErrorMsg('Không tìm thấy đơn hàng');
        }).finally(() => setProcessing(false));
    }, [mode, finalOrderId, navigate]);

    const retryPayment = async () => {
        if (!order) return;
        setProcessing(true);
        try {
            const p = await paymentApi.initiate({ orderId: order.id, amount: order.totalAmount, provider: 1 });
            if (p.paymentUrl) window.location.href = p.paymentUrl;
            else toast.error('Cổng thanh toán không phản hồi, vui lòng thử lại sau.');
        } catch {
            toast.error('Không khởi tạo được giao dịch, hãy thử phương thức khác.');
        } finally {
            setProcessing(false);
        }
    };

    // Success flow: chỉ hiển thị
    return (
        <div className="bg-gray-50 min-h-screen py-8 font-sans">
            <div className="max-w-md mx-auto px-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                    {mode === 'callback' && (
                        <>
                            <div className="w-20 h-20 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Đang xử lý phản hồi thanh toán...</h2>
                            <p className="text-gray-500 text-sm">Vui lòng không đóng cửa sổ</p>
                        </>
                    )}

                    {mode === 'success' && (
                        <>
                            <div className="w-20 h-20 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Thanh toán thành công!</h2>
                            <p className="text-gray-500 text-sm mb-6">
                                {finalOrderId ? <>Đơn hàng <span className="font-mono font-semibold text-gray-900">#{finalOrderId.substring(0, 8).toUpperCase()}</span> đã được ghi nhận.</> : 'Đơn hàng đã được ghi nhận.'}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Link to={finalOrderId ? `/account/orders/${finalOrderId}` : '/account/orders'}
                                    className="py-3 bg-[var(--accent-primary,#dc2626)] text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2">
                                    Xem chi tiết đơn <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link to="/" className="py-3 text-gray-500 hover:text-gray-800 font-medium inline-flex items-center justify-center gap-2">
                                    <ShoppingBag className="w-4 h-4" /> Tiếp tục mua sắm
                                </Link>
                            </div>
                        </>
                    )}

                    {mode === 'failed' && (
                        <>
                            <div className={`w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-6 ${
                                expired ? 'bg-amber-50' : 'bg-red-50'
                            }`}>
                                {expired ? <Clock className="w-10 h-10 text-amber-500" /> : <XCircle className="w-10 h-10 text-[var(--accent-primary,#dc2626)]" />}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                {expired ? 'Đơn đã hết hạn thanh toán' : 'Thanh toán thất bại'}
                            </h2>
                            <p className="text-gray-500 text-sm mb-6">
                                {errorMsg ?? 'Không thể xử lý thanh toán của bạn. Vui lòng thử lại hoặc chọn phương thức khác.'}
                            </p>
                            <div className="flex flex-col gap-3">
                                {!expired && finalOrderId && (
                                    <Link to={`/payment/${finalOrderId}`}
                                        className="py-3 bg-[var(--accent-primary,#dc2626)] text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4" /> Thanh toán lại
                                    </Link>
                                )}
                                <Link to="/cart" className="py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl">
                                    Về giỏ hàng
                                </Link>
                            </div>
                        </>
                    )}

                    {mode === 'retry' && order && (
                        <>
                            <div className="w-20 h-20 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                                <RefreshCw className={`w-10 h-10 text-blue-500 ${processing ? 'animate-spin' : ''}`} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Thanh toán lại đơn hàng</h2>
                            <p className="text-gray-500 text-sm mb-6">
                                Mã đơn <span className="font-mono font-semibold text-gray-900">#{order.orderNumber}</span>
                            </p>
                            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Tổng thanh toán</span>
                                    <span className="text-[var(--accent-primary,#dc2626)] font-bold text-lg">{formatCurrency(order.totalAmount)}</span>
                                </div>
                            </div>
                            <button onClick={retryPayment} disabled={processing}
                                className="w-full py-3 bg-[var(--accent-primary,#dc2626)] text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-70">
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Tiến hành thanh toán
                            </button>
                        </>
                    )}

                    {mode === 'retry' && !order && processing && (
                        <>
                            <Loader2 className="w-10 h-10 animate-spin text-[var(--accent-primary,#dc2626)] mx-auto mb-4" />
                            <p className="text-sm text-gray-500">Đang tải đơn hàng...</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentResultPage;
