import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { salesAdminOrdersApi } from '../../api/sales/admin-orders';
import type { Order } from '../../api/sales/types';
import { formatCurrency, formatDate } from '../../api/crm';

/**
 * Customer 360 "Đơn hàng" card. Real data from Sales admin orders API
 * (`?customerId=`) — no CRM-side order table (crm.md §2).
 */
export function Customer360OrdersCard({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    salesAdminOrdersApi
      .getList({ customerId: userId, pageSize: 5 })
      .then((res) => { if (alive) setOrders(res.orders); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [userId]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-3">Đơn hàng gần đây</h3>
      {error ? (
        <p className="text-sm text-red-500">Không tải được đơn hàng. <button onClick={() => window.location.reload()} className="underline">Thử lại</button></p>
      ) : orders === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Khách hàng chưa có đơn hàng nào.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => navigate(`/backoffice/sales/orders?orderId=${o.id}`)}
              className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-lg px-2"
            >
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Package size={14} className="text-gray-400" />
                #{o.orderNumber || o.id.slice(0, 8)}
                <span className="text-xs text-gray-400">{formatDate(o.orderDate)}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(o.totalAmount)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
