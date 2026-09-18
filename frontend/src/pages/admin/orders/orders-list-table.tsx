/**
 * Orders table — customer name/phone, payment method+status, channel badge
 * (phase spec step 1). Loading/empty/error handled by `QueryBoundary` in the
 * parent; this only renders the success state's rows.
 */
import { Eye, Package, XCircle } from 'lucide-react';
import type { Order } from '../../../api/sales/types';
import { formatCurrency } from '../../../utils/format';
import { getOrderStatusInfo, getPaymentStatusLabel, getChannelLabel, NON_CANCELLABLE_STATUSES } from './order-status-badges';

interface OrdersListTableProps {
    orders: Order[];
    highlightedOrderId: string | null;
    highlightedRowRef: React.RefObject<HTMLTableRowElement>;
    onSelect: (order: Order) => void;
    onCancel: (order: Order) => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

export const OrdersListTable = ({ orders, highlightedOrderId, highlightedRowRef, onSelect, onCancel }: OrdersListTableProps) => {
    if (orders.length === 0) {
        return (
            <div className="px-8 py-20 text-center">
                <Package className="mx-auto text-gray-100 dark:text-gray-800 mb-4" size={60} />
                <p className="text-[11px] text-gray-300 font-semibold">Chưa có đơn hàng phù hợp bộ lọc.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-900 text-white text-xs font-semibold uppercase">
                    <tr>
                        <th className="px-6 py-6">Đơn hàng</th>
                        <th className="px-6 py-6">Khách hàng</th>
                        <th className="px-6 py-6">Kênh</th>
                        <th className="px-6 py-6">Giá trị</th>
                        <th className="px-6 py-6">Trạng thái</th>
                        <th className="px-6 py-6">Thanh toán</th>
                        <th className="px-6 py-6 text-right">Chi tiết</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {orders.map((order) => {
                        const status = getOrderStatusInfo(order.status);
                        const isHighlighted = order.id === highlightedOrderId;
                        return (
                            <tr key={order.id} ref={isHighlighted ? highlightedRowRef : undefined}
                                onClick={() => onSelect(order)}
                                className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all group cursor-pointer ${isHighlighted ? 'ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-500/10' : ''}`}>
                                <td className="px-6 py-6">
                                    <span className="text-base font-semibold text-gray-950 dark:text-gray-100 group-hover:text-accent transition-colors tracking-tight">#{order.orderNumber}</span>
                                    <p className="text-[11px] text-gray-400 uppercase mt-0.5">{formatDate(order.orderDate)}</p>
                                </td>
                                <td className="px-6 py-6">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{order.customerName || 'Khách vãng lai'}</p>
                                    <p className="text-xs text-gray-400">{order.customerPhone || '—'}</p>
                                </td>
                                <td className="px-6 py-6">
                                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">
                                        {getChannelLabel(order.channel)}
                                    </span>
                                </td>
                                <td className="px-6 py-6">
                                    <span className="text-base font-semibold text-gray-950 dark:text-gray-100 tracking-tighter italic">{formatCurrency(order.totalAmount)}</span>
                                </td>
                                <td className="px-6 py-6">
                                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                                        {status.icon} {status.label}
                                    </span>
                                </td>
                                <td className="px-6 py-6 text-xs font-semibold text-gray-500 dark:text-gray-400">{getPaymentStatusLabel(order.paymentStatus)}</td>
                                <td className="px-6 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        {!NON_CANCELLABLE_STATUSES.includes(order.status) && (
                                            <button onClick={(e) => { e.stopPropagation(); onCancel(order); }}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm border border-gray-100 dark:border-gray-700" title="Hủy đơn">
                                                <XCircle size={18} />
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); onSelect(order); }}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-300 hover:text-accent hover:bg-blue-50 transition-all shadow-sm border border-gray-100 dark:border-gray-700">
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
