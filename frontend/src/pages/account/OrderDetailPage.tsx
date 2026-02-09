import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { salesApi, type Order } from '../../api/sales';
import { ArrowLeft, Package, MapPin, CreditCard, FileText, Clock, CheckCircle, Truck, Ban, XCircle, RotateCcw, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/format';

export const OrderDetailPage = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            loadOrder(orderId);
        }
    }, [orderId]);

    const loadOrder = async (id: string) => {
        try {
            setIsLoading(true);
            const data = await salesApi.getMyOrder(id);
            setOrder(data);
        } catch (error) {
            toast.error('Không thể tải thông tin đơn hàng');
            navigate('/account/orders');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D70018]"></div>
            </div>
        );
    }

    if (!order) return null;

    const timelineSteps = [
        {
            status: 'Pending',
            label: 'Đặt hàng',
            icon: <Clock className="w-5 h-5" />,
            date: order.orderDate,
            completed: true
        },
        {
            status: 'Confirmed',
            label: 'Xác nhận',
            icon: <CheckCircle className="w-5 h-5" />,
            date: order.confirmedAt,
            completed: order.confirmedAt != null
        },
        {
            status: 'Paid',
            label: 'Thanh toán',
            icon: <CreditCard className="w-5 h-5" />,
            date: order.confirmedAt, // Using confirmedAt as placeholder since paidAt may not exist
            completed: order.status === 'Paid' || order.status === 'Shipped' || order.status === 'Delivered'
        },
        {
            status: 'Shipped',
            label: 'Giao hàng',
            icon: <Truck className="w-5 h-5" />,
            date: order.shippedAt,
            completed: order.shippedAt != null || order.status === 'Delivered'
        },
        {
            status: 'Delivered',
            label: 'Hoàn thành',
            icon: <Package className="w-5 h-5" />,
            date: order.deliveredAt,
            completed: order.deliveredAt != null
        }
    ];

    const canCancel = order.status === 'Pending' || order.status === 'Confirmed';
    const canReturn = order.status === 'Delivered';

    return (
        <div className="bg-gray-50 min-h-screen py-10 font-sans">
            <div className="max-w-[1400px] mx-auto px-4">
                {/* Header */}
                <Link
                    to="/account/orders"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-[#D70018] font-bold mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Quay lại danh sách đơn hàng
                </Link>

                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-red-100 rounded-2xl text-[#D70018]">
                        <Package size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">
                            {order.orderNumber}
                        </h2>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                            Đặt ngày {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Timeline */}
                        <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-xl font-black text-gray-900 mb-6 uppercase italic tracking-tighter">
                                Trạng thái đơn hàng
                            </h3>

                            {order.status === 'Cancelled' ? (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <Ban className="w-6 h-6 text-red-600" />
                                    <div>
                                        <p className="font-black text-red-900 uppercase text-sm">Đơn hàng đã bị hủy</p>
                                        {order.cancelledAt && (
                                            <p className="text-red-600 text-xs mt-1">
                                                Hủy lúc {new Date(order.cancelledAt).toLocaleString('vi-VN')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    {timelineSteps.map((step, index) => (
                                        <div key={step.status} className="flex gap-4 pb-8 last:pb-0">
                                            {/* Timeline Line */}
                                            {index < timelineSteps.length - 1 && (
                                                <div className="absolute left-[18px] top-[40px] bottom-0 w-0.5 bg-gray-200">
                                                    <div
                                                        className={`w-full transition-all duration-500 ${step.completed ? 'bg-emerald-500 h-full' : 'bg-gray-200 h-0'
                                                            }`}
                                                    />
                                                </div>
                                            )}

                                            {/* Icon */}
                                            <div
                                                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step.completed
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-gray-100 text-gray-400'
                                                    }`}
                                            >
                                                {step.icon}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 pt-1">
                                                <h4
                                                    className={`font-black uppercase text-sm tracking-wide ${step.completed ? 'text-gray-900' : 'text-gray-400'
                                                        }`}
                                                >
                                                    {step.label}
                                                </h4>
                                                {step.date && (
                                                    <p className="text-gray-500 text-xs mt-1">
                                                        {new Date(step.date).toLocaleString('vi-VN')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Order Items */}
                        <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-xl font-black text-gray-900 mb-6 uppercase italic tracking-tighter">
                                Sản phẩm đã đặt
                            </h3>

                            <div className="space-y-4">
                                {order.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0"
                                    >
                                        <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                                            <Package className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 mb-1">{item.productName}</h4>
                                            <p className="text-gray-500 text-sm">
                                                {formatCurrency(item.unitPrice)} × {item.quantity}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-[#D70018] text-lg">
                                                {formatCurrency(item.unitPrice * item.quantity)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Summary & Info */}
                    <div className="space-y-6">
                        {/* Order Summary */}
                        <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-xl font-black text-gray-900 mb-6 uppercase italic tracking-tighter">
                                Tổng quan
                            </h3>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 font-bold uppercase">Tạm tính</span>
                                    <span className="text-gray-900 font-bold">
                                        {formatCurrency(order.subtotalAmount)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 font-bold uppercase">Thuế VAT</span>
                                    <span className="text-gray-900 font-bold">{formatCurrency(order.taxAmount)}</span>
                                </div>
                                <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
                                    <span className="font-black uppercase">Tổng cộng</span>
                                    <span className="font-black text-[#D70018] text-xl">
                                        {formatCurrency(order.totalAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Info */}
                        <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <MapPin className="w-5 h-5 text-[#D70018]" />
                                <h3 className="font-black uppercase text-sm tracking-wide">Địa chỉ giao hàng</h3>
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed">{order.shippingAddress}</p>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                            <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="w-5 h-5 text-[#D70018]" />
                                    <h3 className="font-black uppercase text-sm tracking-wide">Ghi chú</h3>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed">{order.notes}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            {canCancel && (
                                <button
                                    onClick={() => toast('Chức năng đang phát triển')}
                                    className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Hủy đơn hàng
                                </button>
                            )}

                            {canReturn && (
                                <>
                                    <button
                                        onClick={() => toast('Chức năng đang phát triển')}
                                        className="w-full px-6 py-3 bg-amber-100 hover:bg-amber-200 text-amber-700 font-black rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Yêu cầu đổi trả
                                    </button>
                                    <button
                                        onClick={() => toast('Chức năng đang phát triển')}
                                        className="w-full px-6 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 font-black rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <Wrench className="w-4 h-4" />
                                        Yêu cầu bảo hành
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
