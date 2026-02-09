import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salesApi, type Order } from '../api/sales';
import { paymentApi } from '../api/payment';
import { CreditCard, Lock, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';

export const PaymentPage = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [step, setStep] = useState<'review' | 'gateway' | 'success'>('review');

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

    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

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
            toast.error('Failed to initialize payment system');
        }
    };

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

        setStep('gateway');
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            await paymentApi.mockWebhook({
                paymentId,
                success: true
            });

            setStep('success');
            setTimeout(() => {
                navigate('/profile');
                toast.success('Payment Successful! Order Paid.');
            }, 2000);
        } catch (error) {
            toast.error('Payment failed');
            setIsProcessing(false);
            setStep('review');
        }
    };

    if (!order) return <div className="p-12 text-center text-white">Loading order...</div>;

    return (
        <div className="container mx-auto px-4 py-12 min-h-[60vh] flex items-center justify-center">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl w-full max-w-md relative overflow-hidden">

                {step === 'review' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                                <CreditCard size={32} />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-center text-white mb-2">Confirm Payment</h2>
                        <p className="text-center text-gray-400 mb-8">Secure Checkout via MockGateway</p>

                        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">Order Ref</span>
                                <span className="text-white font-mono">{order.orderNumber}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold">
                                <span className="text-gray-300">Total</span>
                                <span className="text-green-400">{formatCurrency(order.totalAmount)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handlePayment}
                            disabled={!paymentId || isProcessing}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Lock size={18} />
                            Pay Now
                        </button>
                    </>
                )}

                {step === 'gateway' && (
                    <div className="text-center py-8">
                        <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Processing Payment...</h3>
                        <p className="text-gray-400">Please do not close this window.</p>
                        <p className="text-xs text-gray-600 mt-4">Connecting to VnPay Mock...</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-green-500/30 animate-bounce">
                            <CheckCircle size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Payment Succeeded!</h3>
                        <p className="text-gray-400">Redirecting to your orders...</p>
                    </div>
                )}

            </div>
        </div>
    );
};
