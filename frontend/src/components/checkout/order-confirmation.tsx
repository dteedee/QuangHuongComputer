import { motion } from 'framer-motion';
import { Check, Package, ShoppingBag, UserPlus, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';
import type { PaymentMethod } from './checkout-types';

interface OrderConfirmationProps {
    orderId: string;
    orderNumber?: string;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    /** Email đã điền — nếu là guest, dùng để nút "Tạo tài khoản". */
    guestEmail?: string;
    /** QR code URL nếu chọn SePay bank transfer. */
    qrPaymentUrl?: string | null;
    isGuest: boolean;
}

const paymentLabel = (m: PaymentMethod): string => {
    switch (m) {
        case 'cod': return 'Thanh toán khi nhận hàng (COD)';
        case 'bank_transfer': return 'Chuyển khoản QR (SePay)';
        case 'vnpay': return 'VNPay';
        case 'momo': return 'Ví MoMo';
        case 'zalopay': return 'ZaloPay';
        case 'installment': return 'Trả góp — chờ duyệt hồ sơ';
    }
};

export function OrderConfirmation({
    orderId, orderNumber, totalAmount, paymentMethod, guestEmail, qrPaymentUrl, isGuest,
}: OrderConfirmationProps) {
    const navigate = useNavigate();
    const eta = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const etaStr = eta.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mx-auto mb-6">
                <Check className="w-10 h-10" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Đặt hàng thành công!</h2>
            <p className="text-gray-500 mb-6">
                Cảm ơn bạn đã tin tưởng Quang Hưởng Computer.<br />
                Mã đơn: <span className="text-[var(--accent-primary,#dc2626)] font-bold bg-red-50 px-2 py-0.5 rounded-lg ml-1 font-mono">
                    #{orderNumber ?? orderId.substring(0, 8).toUpperCase()}
                </span>
            </p>

            <div className="bg-gray-50 rounded-xl p-5 text-left max-w-md mx-auto mb-6 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tổng tiền</span>
                    <span className="text-[var(--accent-primary,#dc2626)] font-bold text-lg">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Thanh toán</span>
                    <span className="text-sm text-gray-800 font-semibold">{paymentLabel(paymentMethod)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" />Giao dự kiến
                    </span>
                    <span className="text-sm text-gray-800 font-semibold">2-3 ngày · trước {etaStr}</span>
                </div>
            </div>

            {paymentMethod === 'bank_transfer' && qrPaymentUrl && (
                <div className="bg-white border-2 border-emerald-200 rounded-xl p-6 mb-6 max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-emerald-700 mb-1">Quét VietQR để hoàn tất</h3>
                    <p className="text-sm text-gray-500 mb-4">Đơn xác nhận tự động sau khi nhận tiền</p>
                    <div className="flex justify-center mb-4">
                        <img src={qrPaymentUrl} alt="QR" className="w-56 h-56 object-contain border-4 border-gray-100 rounded-xl" />
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl text-sm border border-gray-100">
                        <div className="flex justify-between mb-1"><span className="text-gray-500">Số tiền:</span><span className="font-bold text-[var(--accent-primary,#dc2626)]">{formatCurrency(totalAmount)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Nội dung:</span><span className="font-bold text-gray-900 bg-yellow-100 px-2 rounded">TT {orderId.substring(0, 8).toUpperCase()}</span></div>
                    </div>
                </div>
            )}

            {paymentMethod === 'installment' && (
                <div className="max-w-md mx-auto p-4 bg-amber-50 border border-amber-100 rounded-xl mb-6 text-sm text-amber-800">
                    Hồ sơ trả góp của bạn đang chờ duyệt. Bộ phận tài chính sẽ gọi lại trong vòng 24 giờ để xác nhận.
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <button onClick={() => navigate(`/account/orders/${orderId}`)}
                    className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 inline-flex items-center justify-center gap-2">
                    <Package className="w-5 h-5" />Theo dõi đơn hàng
                </button>
                <button onClick={() => navigate('/')}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2">
                    <ShoppingBag className="w-5 h-5" />Tiếp tục mua sắm
                </button>
            </div>

            {isGuest && guestEmail && (
                <button
                    onClick={() => navigate('/register', { state: { email: guestEmail } })}
                    className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--accent-primary,#dc2626)] font-semibold hover:underline">
                    <UserPlus className="w-4 h-4" />
                    Tạo tài khoản với email {guestEmail} để dễ tra cứu đơn sau này
                </button>
            )}
        </motion.div>
    );
}

export default OrderConfirmation;
