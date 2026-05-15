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

const RETURN_REASONS = [
    'Sản phẩm bị lỗi/hỏng',
    'Sản phẩm không đúng mô tả',
    'Nhận sai sản phẩm',
    'Sản phẩm không hoạt động',
    'Đổi ý không muốn mua',
    'Khác',
];

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
        } catch {
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
                description: description.trim() || undefined,
            });
            toast.success('Yêu cầu đổi trả đã được gửi thành công!');
            navigate('/account/orders');
        } catch (error: any) {
            toast.error(error?.response?.data?.Error || 'Không thể gửi yêu cầu đổi trả');
        } finally {
            setIsSubmitting(false);
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

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="max-w-2xl mx-auto px-4 sm:px-6">
                {/* Back link */}
                <Link
                    to={`/account/orders/${orderId}`}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-accent text-sm font-medium mb-5 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại chi tiết đơn hàng
                </Link>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                        <RotateCcw size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu đổi trả</h1>
                        <p className="text-gray-500 text-sm">Đơn hàng {order.orderNumber}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Select Product */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-base font-bold text-gray-900 mb-4">Chọn sản phẩm cần đổi trả</h2>
                        <div className="space-y-3">
                            {order.items.map((item) => (
                                <label
                                    key={item.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        selectedItem === item.id
                                            ? 'border-accent bg-red-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="selectedItem"
                                        value={item.id}
                                        checked={selectedItem === item.id}
                                        onChange={(e) => setSelectedItem(e.target.value)}
                                        className="w-4 h-4 text-accent focus:ring-accent"
                                    />
                                    <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{item.productName}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {formatCurrency(item.unitPrice)} x {item.quantity}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-base font-bold text-gray-900 mb-4">Lý do đổi trả</h2>
                        <div className="space-y-2">
                            {RETURN_REASONS.map((r) => (
                                <label
                                    key={r}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                        reason === r
                                            ? 'border-accent bg-red-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={r}
                                        checked={reason === r}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-4 h-4 text-accent focus:ring-accent"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{r}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-base font-bold text-gray-900 mb-4">
                            Mô tả chi tiết <span className="text-gray-400 font-normal text-sm">(tùy chọn)</span>
                        </h2>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả thêm về vấn đề của sản phẩm..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none text-sm"
                        />
                    </div>

                    {/* Notice */}
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold mb-1">Lưu ý:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
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
                        className="w-full bg-accent hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Đang gửi...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-4 h-4" />
                                Gửi yêu cầu đổi trả
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
