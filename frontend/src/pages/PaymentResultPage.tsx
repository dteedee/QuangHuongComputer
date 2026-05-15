import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

export const PaymentResultPage = () => {
    const [searchParams] = useSearchParams();

    const success = window.location.pathname.includes('success');
    const orderId = searchParams.get('orderId');
    const errorCode = searchParams.get('error');

    useEffect(() => {
        if (success) {
            toast.success('Thanh toán thành công!');
        } else {
            toast.error(`Thanh toán thất bại. Mã lỗi: ${errorCode || 'Không xác định'}`);
        }
    }, [success, errorCode]);

    return (
        <div className="bg-gray-50 min-h-screen py-8 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="max-w-md mx-auto">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                        {success ? (
                            <>
                                {/* Success */}
                                <div className="w-20 h-20 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={40} className="text-green-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">Thanh toán thành công!</h2>
                                <p className="text-gray-500 text-sm mb-8">
                                    Đơn hàng{' '}
                                    <span className="text-gray-900 font-mono font-semibold">#{orderId?.substring(0, 8)}</span>
                                    {' '}đã được thanh toán và đang được xử lý.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <Link
                                        to="/profile"
                                        className="flex items-center justify-center gap-2 py-3 bg-accent hover:bg-[#b00014] text-white font-semibold rounded-xl transition-all cursor-pointer"
                                    >
                                        Xem chi tiết đơn hàng
                                        <ArrowRight size={18} />
                                    </Link>
                                    <Link
                                        to="/"
                                        className="flex items-center justify-center gap-2 py-3 text-gray-500 hover:text-gray-800 font-medium transition-colors cursor-pointer"
                                    >
                                        <ShoppingBag size={18} />
                                        Tiếp tục mua sắm
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Failure */}
                                <div className="w-20 h-20 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                                    <XCircle size={40} className="text-accent" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">Thanh toán thất bại</h2>
                                <p className="text-gray-500 text-sm mb-8">
                                    Không thể xử lý thanh toán của bạn. Vui lòng thử lại hoặc chọn phương thức khác.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <Link
                                        to={orderId ? `/payment/${orderId}` : '/cart'}
                                        className="flex items-center justify-center gap-2 py-3 bg-accent hover:bg-[#b00014] text-white font-semibold rounded-xl transition-all cursor-pointer"
                                    >
                                        Thử lại
                                        <ArrowRight size={18} />
                                    </Link>
                                    <Link
                                        to="/"
                                        className="flex items-center justify-center gap-2 py-3 text-gray-500 hover:text-gray-800 font-medium transition-colors cursor-pointer"
                                    >
                                        <ShoppingBag size={18} />
                                        Về trang chủ
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
