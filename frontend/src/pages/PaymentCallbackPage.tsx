import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { paymentApi } from '../api/payment';
import toast from 'react-hot-toast';

export const PaymentCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
    const [message, setMessage] = useState('Đang xử lý kết quả thanh toán...');

    useEffect(() => {
        processCallback();
    }, []);

    const processCallback = async () => {
        try {
            // Parse VNPay callback params
            const result = paymentApi.parseVNPayCallback(searchParams);

            if (result.success) {
                setStatus('success');
                setMessage('Thanh toán thành công!');
                toast.success('Thanh toán thành công!');

                // Redirect to success page
                setTimeout(() => {
                    navigate(`/payment/success?orderId=${result.orderId}`);
                }, 2000);
            } else {
                setStatus('failed');
                setMessage(result.message || 'Thanh toán thất bại');
                toast.error(result.message || 'Thanh toán thất bại');

                // Redirect to failed page
                setTimeout(() => {
                    const errorCode = searchParams.get('vnp_ResponseCode') || 'unknown';
                    navigate(`/payment/failed?orderId=${result.orderId}&error=${errorCode}`);
                }, 2000);
            }
        } catch (error) {
            console.error('Error processing callback:', error);
            setStatus('failed');
            setMessage('Có lỗi xảy ra khi xử lý thanh toán');
            toast.error('Có lỗi xảy ra');

            setTimeout(() => {
                navigate('/');
            }, 3000);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fbff] flex items-center justify-center">
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-12 text-center max-w-md w-full mx-4">
                {status === 'processing' && (
                    <>
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Đang xử lý...</h2>
                        <p className="text-slate-500">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-black text-green-600 mb-2">Thành công!</h2>
                        <p className="text-slate-500">{message}</p>
                        <p className="text-sm text-slate-400 mt-4">Đang chuyển hướng...</p>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-red-600 mb-2">Thất bại!</h2>
                        <p className="text-slate-500">{message}</p>
                        <p className="text-sm text-slate-400 mt-4">Đang chuyển hướng...</p>
                    </>
                )}
            </div>
        </div>
    );
};
