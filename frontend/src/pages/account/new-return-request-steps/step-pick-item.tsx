import { Package } from 'lucide-react';
import type { Order } from '../../../api/sales';
import { formatCurrency } from '../../../utils/format';

interface StepPickItemProps {
    orders: Order[];
    orderId: string;
    setOrderId: (id: string) => void;
    orderItemId: string;
    setOrderItemId: (id: string) => void;
}

export const StepPickItem = ({ orders, orderId, setOrderId, orderItemId, setOrderItemId }: StepPickItemProps) => {
    const selectedOrder = orders.find((o) => o.id === orderId) ?? null;
    return (
        <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Chọn đơn hàng</h2>
            <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm mb-5"
            >
                <option value="">— Chọn đơn hàng —</option>
                {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.orderNumber} · {formatCurrency(o.totalAmount)} · {new Date(o.orderDate).toLocaleDateString('vi-VN')}
                    </option>
                ))}
            </select>

            {selectedOrder && (
                <>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Chọn sản phẩm</h3>
                    <div className="space-y-2">
                        {selectedOrder.items.map((it) => (
                            <label
                                key={it.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    orderItemId === it.id ? 'border-accent bg-red-50/40' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="item"
                                    value={it.id}
                                    checked={orderItemId === it.id}
                                    onChange={(e) => setOrderItemId(e.target.value)}
                                    className="w-4 h-4 text-accent"
                                />
                                <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{it.productName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        SL: {it.quantity} · {formatCurrency(it.unitPrice)}
                                    </p>
                                </div>
                            </label>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default StepPickItem;
