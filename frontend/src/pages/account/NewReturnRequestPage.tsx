import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, RotateCcw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { formatCurrency } from '../../utils/format';

interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
}

interface Order {
    id: string;
    orderNumber: string;
    items: OrderItem[];
}

export const NewReturnRequestPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedItem, setSelectedItem] = useState<string>('');
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (orderId) {
            loadOrder(orderId);
        } else {
            toast.error('Thiếu thông tin đơn hàng');
            navigate('/account/orders');
        }
    }, [orderId]);

    const loadOrder = async (id: string) => {
        try {
            setIsLoading(true);
            const response = await client.get(`/sales/orders/${id}`);
            setOrder(response.data);
        } catch (error) {
            toast.error('Không thể tải thông tin đơn hàng');
            navigate('/account/orders');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedItem) {
            toast.error('Vui lòng chọn sản phẩm cần đổi trả');
            return;
        }

        if (!reason.trim()) {
            toast.error('Vui lòng nhập lý do đổi trả');
            return;
        }

        try {
            setIsSubmitting(true);
            await client.post('/sales/returns', {
                orderId,
                orderItemId: selectedItem,
                reason: reason.trim(),
                description: description.trim() || undefined
            });

            toast.success('Yêu cầu đổi trả đã được gửi thành công!');
            navigate('/account/orders');
        } catch (error: any) {
            const errorMessage = error?.response?.data?.Error || 'Không thể gửi yêu cầu đổi trả';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
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

    const reasons = [
        'Sản phẩm bị lỗi/hỏng',
        'Sản phẩm không đúng mô tả',
        'Nhận sai sản phẩm',
        'Sản phẩm không hoạt động',
        'Đổi ý không muốn mua',
        'Khác'
    ];

    return (
        <div className="bg-gray-50 min-h-screen py-10 font-sans">
            <div className="max-w-2xl mx-auto px-4">
                {/* Header */}
                <Link
                    to={`/account/orders/${orderId}`}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-[#D70018] font-bold mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Quay lại chi tiết đơn hàng
                </Link>

                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                        <RotateCcw size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">
                            Yêu cầu đổi trả
                        </h2>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                            Đơn hàng {order.orderNumber}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Select Product */}
                    <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">
                            Chọn sản phẩm cần đổi trả
                        </h3>

                        <div className="space-y-3">
                            {order.items.map((item) => (
                                <label
                                    key={item.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        selectedItem === item.id
                                            ? 'border-[#D70018] bg-red-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="selectedItem"
                                        value={item.id}
                                        checked={selectedItem === item.id}
                                        onChange={(e) => setSelectedItem(e.target.value)}
                                        className="w-5 h-5 text-[#D70018] focus:ring-[#D70018]"
                                    />
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Package className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900">{item.productName}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatCurrency(item.unitPrice)} x {item.quantity}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">
                            Lý do đổi trả
                        </h3>

                        <div className="space-y-3">
                            {reasons.map((r) => (
                                <label
                                    key={r}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                        reason === r
                                            ? 'border-[#D70018] bg-red-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={r}
                                        checked={reason === r}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-4 h-4 text-[#D70018] focus:ring-[#D70018]"
                                    />
                                    <span className="font-medium text-gray-700">{r}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">
                            Mô tả chi tiết (tùy chọn)
                        </h3>

                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả thêm về vấn đề của sản phẩm..."
                            rows={4}
                            className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D70018] focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Notice */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-bold mb-1">Lưu ý:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Yêu cầu đổi trả sẽ được xử lý trong 1-3 ngày làm việc</li>
                                <li>Sản phẩm cần được giữ nguyên trạng thái và đầy đủ phụ kiện</li>
                                <li>Hoàn tiền sẽ được thực hiện sau khi kiểm tra sản phẩm</li>
                            </ul>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !selectedItem || !reason}
                        className="w-full px-6 py-4 bg-[#D70018] hover:bg-[#b50014] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                Đang gửi...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-5 h-5" />
                                Gửi yêu cầu đổi trả
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
