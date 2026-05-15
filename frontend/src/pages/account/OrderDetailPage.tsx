import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { salesApi, type Order } from '../../api/sales';
import { ArrowLeft, Package, MapPin, CreditCard, FileText, Clock, CheckCircle, Truck, Ban, XCircle, RotateCcw, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/format';
import { useConfirm } from '../../context/ConfirmContext';
import client from '../../api/client';
import { motion } from 'framer-motion';

export const OrderDetailPage = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orderId) loadOrder(orderId);
    }, [orderId]);

    const loadOrder = async (id: string) => {
        try {
            setIsLoading(true);
            const data = await salesApi.getMyOrder(id);
            setOrder(data);
        } catch {
            toast.error('Không thể tải thông tin đơn hàng');
            navigate('/account/orders');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
            </div>
        );
    }

    if (!order) return null;

    const timelineSteps = [
        { status: 'Pending',   label: 'Đặt hàng',   icon: <Clock className="w-5 h-5" />,        date: order.orderDate,    completed: true },
        { status: 'Confirmed', label: 'Xác nhận',   icon: <CheckCircle className="w-5 h-5" />,   date: order.confirmedAt,  completed: order.confirmedAt != null },
        { status: 'Paid',      label: 'Thanh toán', icon: <CreditCard className="w-5 h-5" />,    date: order.confirmedAt,  completed: order.status === 'Paid' || order.status === 'Shipped' || order.status === 'Delivered' },
        { status: 'Shipped',   label: 'Giao hàng',  icon: <Truck className="w-5 h-5" />,         date: order.shippedAt,    completed: order.shippedAt != null || order.status === 'Delivered' },
        { status: 'Delivered', label: 'Hoàn thành', icon: <Package className="w-5 h-5" />,       date: order.deliveredAt,  completed: order.deliveredAt != null },
    ];

    const canCancel = order.status === 'Pending' || order.status === 'Confirmed';
    const canReturn = order.status === 'Delivered';

    const handleCancelOrder = async () => {
        if (!order) return;
        const ok = await confirm({ message: 'Bạn có chắc chắn muốn hủy đơn hàng này?', variant: 'warning' });
        if (!ok) return;
        try {
            await client.post(`/sales/orders/${order.id}/cancel`, { reason: 'Khách hàng yêu cầu hủy' });
            toast.success('Đã hủy đơn hàng thành công');
            if (orderId) loadOrder(orderId);
        } catch (error: any) {
            toast.error(error?.response?.data?.Error || 'Không thể hủy đơn hàng');
        }
    };

    const handleReturnRequest = () => {
        navigate(`/account/returns/new?orderId=${order.id}`);
    };

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Back link */}
                <Link
                    to="/account/orders"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-accent text-sm font-medium mb-5 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại danh sách đơn hàng
                </Link>

                {/* Page header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-red-50 rounded-xl text-accent">
                        <Package size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
                        <p className="text-gray-500 text-sm">
                            Đặt ngày {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-5">
                    {/* Left: Timeline + Items */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Timeline */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-base font-bold text-gray-900 mb-5">Trạng thái đơn hàng</h2>

                            {order.status === 'Cancelled' ? (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                                    <Ban className="w-5 h-5 text-red-600 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-red-800 text-sm">Đơn hàng đã bị hủy</p>
                                        {order.cancelledAt && (
                                            <p className="text-red-600 text-xs mt-0.5">
                                                Hủy lúc {new Date(order.cancelledAt).toLocaleString('vi-VN')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-0">
                                    {timelineSteps.map((step, index) => (
                                        <motion.div
                                            key={step.status}
                                            initial={{ opacity: 0, x: -16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.08 }}
                                            className="flex gap-4 pb-8 last:pb-0 relative"
                                        >
                                            {/* Connector line */}
                                            {index < timelineSteps.length - 1 && (
                                                <div className="absolute left-[19px] top-[40px] bottom-0 w-[2px] bg-gray-100">
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: step.completed ? '100%' : '0%' }}
                                                        transition={{ duration: 0.8, delay: 0.3 + index * 0.15 }}
                                                        className="w-full bg-emerald-400"
                                                    />
                                                </div>
                                            )}
                                            {/* Icon */}
                                            <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                                                step.completed
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-300'
                                            }`}>
                                                {step.icon}
                                            </div>
                                            {/* Content */}
                                            <div className="pt-1.5">
                                                <h4 className={`font-semibold text-sm ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                                                    {step.label}
                                                </h4>
                                                {step.date && (
                                                    <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(step.date).toLocaleString('vi-VN')}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Order Items */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-base font-bold text-gray-900 mb-5">Sản phẩm đã đặt</h2>
                            <div className="space-y-4">
                                {order.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                                    >
                                        <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Package className="w-7 h-7 text-gray-300" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-900 text-sm truncate">{item.productName}</h4>
                                            <p className="text-gray-500 text-xs mt-0.5">
                                                {formatCurrency(item.unitPrice)} × {item.quantity}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-bold text-accent">
                                                {formatCurrency(item.unitPrice * item.quantity)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Summary + Info + Actions */}
                    <div className="space-y-5">
                        {/* Order Summary */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-base font-bold text-gray-900 mb-4">Tổng quan</h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tạm tính</span>
                                    <span className="text-gray-900 font-semibold">{formatCurrency(order.subtotalAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Thuế VAT</span>
                                    <span className="text-gray-900 font-semibold">{formatCurrency(order.taxAmount)}</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-gray-100">
                                    <span className="font-bold text-gray-900">Tổng cộng</span>
                                    <span className="font-bold text-accent text-lg">{formatCurrency(order.totalAmount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Info */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <MapPin className="w-4 h-4 text-accent" />
                                <h2 className="text-sm font-bold text-gray-900">Địa chỉ giao hàng</h2>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">{order.shippingAddress}</p>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-accent" />
                                    <h2 className="text-sm font-bold text-gray-900">Ghi chú</h2>
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed">{order.notes}</p>
                            </div>
                        )}

                        {/* Actions */}
                        {(canCancel || canReturn) && (
                            <div className="space-y-3">
                                {canCancel && (
                                    <button
                                        onClick={handleCancelOrder}
                                        className="w-full border border-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 font-semibold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Hủy đơn hàng
                                    </button>
                                )}
                                {canReturn && (
                                    <>
                                        <button
                                            onClick={handleReturnRequest}
                                            className="w-full border border-amber-200 text-amber-700 px-6 py-3 rounded-xl hover:bg-amber-50 font-semibold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Yêu cầu đổi trả
                                        </button>
                                        <Link
                                            to={`/account/warranty/new?orderId=${order.id}`}
                                            className="w-full border border-blue-200 text-blue-700 px-6 py-3 rounded-xl hover:bg-blue-50 font-semibold transition-all text-sm flex items-center justify-center gap-2"
                                        >
                                            <Wrench className="w-4 h-4" />
                                            Yêu cầu bảo hành
                                        </Link>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
