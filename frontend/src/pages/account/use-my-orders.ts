import { useEffect, useMemo, useState } from 'react';
import { salesAccountOrdersApi } from '../../api/sales/account-orders';
import type { Order, OrderStatus } from '../../api/sales/types';

/**
 * ONE query for both the overview page's stats and the orders list (phase-56 Implementation
 * Step 2 — the old `AccountPage` fetched `/sales/my-stats` for its overview card and
 * `getMyOrders()` for its list separately, so the two disagreed ("Chưa có đơn hàng nào" next to
 * "2 đơn hàng"). Every screen that shows order counts/totals now derives them from this one list.
 *
 * `/api/sales/orders` has no server paging today (verified against
 * `backend/Services/Sales/Endpoints/Orders/CustomerOrderEndpoints.cs` — it returns the full,
 * unpaged list). Filter/search/paginate client-side here until that lands; flagged as an
 * integration request (see report).
 */
export function useMyOrders() {
    const [orders, setOrders] = useState<Order[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const load = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await salesAccountOrdersApi.getMyOrders();
            setOrders(data);
        } catch {
            setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stats = useMemo(() => {
        const list = orders ?? [];
        const completed = list.filter((o) => o.status === 'Completed' || o.status === 'Delivered');
        const pending = list.filter((o) => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Draft');
        const cancelled = list.filter((o) => o.status === 'Cancelled');
        const totalSpent = completed.reduce((sum, o) => sum + o.totalAmount, 0);
        return {
            totalOrders: list.length,
            completedOrders: completed.length,
            pendingOrders: pending.length,
            cancelledOrders: cancelled.length,
            totalSpent,
        };
    }, [orders]);

    const filter = (status: OrderStatus | 'all', search: string) => {
        const list = orders ?? [];
        return list.filter((o) => {
            const matchesStatus = status === 'all' || o.status === status;
            const matchesSearch = !search || o.orderNumber.toLowerCase().includes(search.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    };

    return { orders: orders ?? [], stats, isLoading, error, reload: load, filter };
}
