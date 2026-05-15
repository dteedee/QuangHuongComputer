import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salesApi, type Order } from '../api/sales';
import { paymentApi } from '../api/payment';
import { CreditCard, Lock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';

export const PaymentPage = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [step, setStep] = useState<'review' | 'gateway' | 'success' | 'error'>('review');
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

    useEffect(() => {
        if (orderId) {
            loadOrder(orderId);
        }
    }, [orderId]);

    const loadOrder = async (id: string) => {
        try {
            const data = await salesApi.orders.getById(id);
            if (data.status === 'Paid' || data.status === 'Cancelled') {
                toast('Order already processed');
                navigate('/profile');
                return;
            }
            setOrder(data);
            initiatePayment(data);
        } catch (error) {
            toast.error('Failed to load order');
            navigate('/profile');
        }
    };

    const initiatePayment = async (orderData: Order) => {
        try {
            const res = await paymentApi.initiate({
                orderId: orderData.id,
                amount: orderData.totalAmount,
                provider: 1 // VnPay
            });
            setPaymentId(res.paymentId);
            setPaymentUrl(res.paymentUrl || null);
        } catch (error) {
            console.error('Failed to initiate payment', error);
            setStep('error');
            toast.error('Gặp lỗi khi tạo giao dịch thanh toán trực tuyến.');
        }
    };

    // Auto-redirect when payment URL is generated successfully
    useEffect(() => {
        if (paymentUrl) {
            setStep('gateway');
            const timer = setTimeout(() => {
                window.location.href = paymentUrl;
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [paymentUrl]);

    const handlePayment = async () => {
        if (!paymentId) return;
        setIsProcessing(true);

        if (paymentUrl) {
            setStep('gateway');
            setTimeout(() => {
                window.location.href = paymentUrl;
            }, 1000);
            return;
        }

        // No payment gateway URL — online payment not configured
        toast.error('Thanh toán trực tuyến chưa được kích hoạt. Vui lòng liên hệ cửa hàng.');
        setIsProcessing(false);
    };

    if (!order) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <Loader2 size={36} className="animate-spin text-accent" />
                    <p className="text-sm font-medium">Đang tải thông tin đơn hàng...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-8 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="max-w-md mx-auto">
                    {/* Review step */}
                    {step === 'review' && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4">
                                    <CreditCard size={28} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Xác nhận thanh toán</h2>
                                <p className="text-gray-500 text-sm mt-1">Thanh toán an toàn qua VNPay</p>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Mã đơn hàng</span>
                                    <span className="text-gray-900 font-mono font-semibold">{order.orderNumber}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-3 flex justify-between">
                                    <span className="text-gray-700 font-medium">Tổng thanh toán</span>
                                    <span className="text-accent font-bold text-lg">{formatCurrency(order.totalAmount)}</span>
                                </div>
                            </div>

                            <button
                                disabled
                                className="w-full py-3 bg-gray-100 text-gray-400 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                                <Loader2 size={18} className="animate-spin" />
                                Đang khởi tạo thanh toán...
                            </button>
                        </div>
                    )}

                    {/* Error step */}
                    {step === 'error' && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 text-accent rounded-xl flex items-center justify-center mx-auto mb-5">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Lỗi khởi tạo</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Không thể kết nối đến cổng thanh toán VNPay hiện tại.
                            </p>
                            <button
                                onClick={() => navigate('/checkout')}
                                className="w-full py-3 bg-accent hover:bg-[#b00014] text-white font-semibold rounded-xl transition-all cursor-pointer"
                            >
                                Quay lại chọn phương thức khác
                            </button>
                        </div>
                    )}

                    {/* Gateway step */}
                    {step === 'gateway' && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                            <Loader2 size={48} className="animate-spin text-accent mx-auto mb-5" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Đang xử lý thanh toán...</h3>
                            <p className="text-gray-500 text-sm mb-1">Vui lòng không đóng cửa sổ này.</p>
                            <p className="text-gray-400 text-xs">Đang kết nối tới VNPay...</p>
                        </div>
                    )}

                    {/* Success step */}
                    {step === 'success' && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-xl flex items-center justify-center mx-auto mb-5">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h3>
                            <p className="text-gray-500 text-sm">Đang chuyển hướng đến đơn hàng của bạn...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
