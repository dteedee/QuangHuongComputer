import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, MapPin, Truck, Ban, AlertCircle } from 'lucide-react';
import { salesAccountOrdersApi, type GuestOrderTrackingResult } from '../../api/sales/account-orders';
import { formatCurrency } from '../../utils/format';

/**
 * Guest order lookup (`/tra-cuu-don-hang`, phase-56 Implementation Step 8). Uses W2-3's
 * `GET /api/sales/public/orders/track` (docs/api-contracts/sales-checkout-orders.md) — anonymous,
 * both `orderNumber` + `phone` required and must match the SAME order (anti-enumeration); a wrong
 * code and a wrong phone answer the same 404 message, surfaced verbatim below.
 */

const STATUS_LABEL: Record<string, string> = {
    Draft: 'Bản nháp', Pending: 'Chờ xử lý', Confirmed: 'Đã xác nhận', Paid: 'Đã thanh toán',
    Shipped: 'Đang giao', Delivered: 'Đã giao', Completed: 'Hoàn thành', Cancelled: 'Đã hủy',
};

export default function GuestOrderLookupPage() {
    const [orderNumber, setOrderNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<GuestOrderTrackingResult | null>(null);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderNumber.trim() || !phone.trim()) {
            setError('Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await salesAccountOrdersApi.trackGuestOrder(orderNumber.trim(), phone.trim());
            setResult(data);
        } catch (err: any) {
            setError(err?.response?.data?.Error || 'Không tìm thấy đơn hàng khớp thông tin đã nhập');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Tra cứu đơn hàng</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Nhập mã đơn hàng và số điện thoại đặt hàng để xem tình trạng đơn — không cần đăng nhập.
                    </p>
                </div>

                <form onSubmit={onSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1.5">Mã đơn hàng</label>
                        <input
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            placeholder="VD: DH0001234"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1.5">Số điện thoại đặt hàng</label>
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="VD: 0912345678"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent text-white rounded-xl py-3 font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Search size={16} />
                        {loading ? 'Đang tra cứu...' : 'Tra cứu'}
                    </button>
                </form>

                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-5"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-gray-900">#{result.orderNumber}</h2>
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent">
                                    {STATUS_LABEL[result.status] || result.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                <div>
                                    <p className="text-gray-400 text-xs mb-0.5">Ngày đặt</p>
                                    <p className="font-semibold text-gray-900">{new Date(result.orderDate).toLocaleDateString('vi-VN')}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs mb-0.5">Tổng tiền</p>
                                    <p className="font-bold text-accent">{formatCurrency(result.totalAmount)}</p>
                                </div>
                                {result.deliveryTrackingNumber && (
                                    <div className="col-span-2">
                                        <p className="text-gray-400 text-xs mb-0.5 flex items-center gap-1"><Truck size={12} /> Vận đơn</p>
                                        <p className="font-semibold text-gray-900">{result.deliveryCarrier} · {result.deliveryTrackingNumber}</p>
                                    </div>
                                )}
                                {result.shippingAddress && (
                                    <div className="col-span-2">
                                        <p className="text-gray-400 text-xs mb-0.5 flex items-center gap-1"><MapPin size={12} /> Địa chỉ giao</p>
                                        <p className="font-semibold text-gray-900">{result.shippingAddress}</p>
                                    </div>
                                )}
                                {result.status === 'Cancelled' && result.cancelledAt && (
                                    <div className="col-span-2 flex items-center gap-2 text-red-600">
                                        <Ban size={14} /> Đã hủy lúc {new Date(result.cancelledAt).toLocaleString('vi-VN')}
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-100 pt-4 space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                                    <Package size={14} /> Sản phẩm
                                </p>
                                {result.items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-800">{item.productName}{item.variantName ? ` (${item.variantName})` : ''} × {item.quantity}</span>
                                        <span className="font-semibold text-gray-900">{formatCurrency(item.lineTotal)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Đã có tài khoản? <Link to="/login" className="text-accent hover:underline font-semibold cursor-pointer">Đăng nhập</Link> để xem đầy đủ lịch sử đơn hàng.
                </p>
            </div>
        </div>
    );
}
