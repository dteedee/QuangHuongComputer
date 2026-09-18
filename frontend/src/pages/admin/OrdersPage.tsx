/**
 * Admin orders (W3-10 rewrite). Was 936 LOC moving orders any-to-any through
 * a raw status dropdown with no customer/payment data and a toy create-order
 * modal that attributed the order to the admin — see phase-58's Overview.
 * Now: server paging + filters, state-machine-driven actions via
 * `OrderDetailDrawer`, kanban restricted to legal moves, and order creation
 * routes to POS (the one real order-creation surface) instead of faking one.
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store } from 'lucide-react';
import { salesAdminOrdersApi } from '../../api/sales/admin-orders';
import type { Order } from '../../api/sales/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryBoundary } from '../../components/ui/query-boundary';
import { useConfirm, usePrompt } from '../../context/ConfirmContext';
import { OrdersFilterBar, type OrderFilters } from './orders/orders-filter-bar';
import { OrdersListTable } from './orders/orders-list-table';
import { OrdersKanbanBoard } from './orders/orders-kanban-board';
import { OrderDetailDrawer } from './orders/order-detail-drawer';
import toast from 'react-hot-toast';

const initialFilters: OrderFilters = { search: '', status: 'all', paymentStatus: 'all', channel: 'all', dateRange: { from: '', to: '' } };

export const AdminOrdersPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlOrderId = searchParams.get('orderId') || '';

    const [filters, setFilters] = useState<OrderFilters>({ ...initialFilters, search: searchParams.get('search') || '' });
    const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(urlOrderId || null);
    const [page, setPage] = useState(1);
    const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(urlOrderId || null);
    const highlightedRowRef = useRef<HTMLTableRowElement>(null);
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const { promptText } = usePrompt();

    useEffect(() => {
        if (urlOrderId) {
            const timer = setTimeout(() => { searchParams.delete('orderId'); setSearchParams(searchParams, { replace: true }); setHighlightedOrderId(null); }, 5000);
            return () => clearTimeout(timer);
        }
    }, [urlOrderId]);

    useEffect(() => {
        if (highlightedOrderId && highlightedRowRef.current) highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [highlightedOrderId]);

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(filters.search); setPage(1); }, 500);
        return () => clearTimeout(timer);
    }, [filters.search]);

    useEffect(() => { setPage(1); }, [filters.status, filters.paymentStatus, filters.channel, filters.dateRange]);

    const handleFilterChange = (key: keyof OrderFilters, value: any) => setFilters((prev) => ({ ...prev, [key]: value }));
    const resetFilters = () => setFilters(initialFilters);
    const hasActiveFilters = !!(filters.search || filters.status !== 'all' || filters.paymentStatus !== 'all' || filters.channel !== 'all' || filters.dateRange.from || filters.dateRange.to);

    const ordersQuery = useQuery({
        queryKey: ['admin-orders', page, debouncedSearch, filters.status, filters.paymentStatus, filters.channel, filters.dateRange.from, filters.dateRange.to],
        queryFn: () => salesAdminOrdersApi.admin.getOrders(page, 20, debouncedSearch || undefined, filters.status !== 'all' ? filters.status : undefined, {
            paymentStatus: filters.paymentStatus, channel: filters.channel, from: filters.dateRange.from || undefined, to: filters.dateRange.to || undefined,
        }),
    });

    const handleCancelOrder = async (order: Order) => {
        const reason = await promptText({ title: `Huỷ đơn #${order.orderNumber}`, message: 'Lý do huỷ đơn', required: true });
        if (!reason) return;
        const ok = await confirm({ title: 'Xác nhận huỷ đơn?', message: `Đơn #${order.orderNumber} sẽ chuyển sang trạng thái Đã hủy.`, variant: 'danger' });
        if (!ok) return;
        try {
            await salesAdminOrdersApi.cancel(order.id, reason);
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            toast.success('Đã hủy đơn hàng!');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Hủy đơn thất bại!');
        }
    };

    const orders = ordersQuery.data?.orders ?? [];
    const total = ordersQuery.data?.total ?? 0;

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-semibold text-gray-900 dark:text-gray-100 tracking-tighter leading-none mb-3">
                        Quản lý <span className="text-accent">Đơn hàng</span>
                    </h1>
                    <p className="text-gray-700 dark:text-gray-300 font-semibold uppercase text-xs">Hệ thống xử lý đơn hàng và vận chuyển toàn quốc</p>
                </div>
                {/* Toy create-order modal removed (phase spec step 3) — POS is the real order-creation surface. */}
                <Link to="/backoffice/pos" className="flex items-center gap-3 px-8 py-4 bg-accent hover:bg-accent-hover text-white text-xs font-semibold uppercase rounded-xl transition-all shadow-sm shadow-blue-500/15 active:scale-95">
                    <Store size={18} /> Tạo đơn tại POS
                </Link>
            </div>

            <OrdersFilterBar filters={filters} onChange={handleFilterChange} onReset={resetFilters} hasActiveFilters={hasActiveFilters} viewMode={viewMode} onViewModeChange={setViewMode} />

            <motion.div key={viewMode} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className={viewMode === 'list' ? 'premium-card overflow-hidden' : ''}>
                <QueryBoundary
                    query={ordersQuery}
                    isEmpty={() => orders.length === 0}
                    empty={{ title: 'Chưa có đơn hàng nào', description: 'Đơn hàng tạo từ website, POS hoặc báo giá sẽ xuất hiện ở đây.' }}
                    skeleton={<div className="p-8 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>}
                    errorTitle="Không tải được danh sách đơn hàng"
                >
                    {() => viewMode === 'list' ? (
                        <OrdersListTable orders={orders} highlightedOrderId={highlightedOrderId} highlightedRowRef={highlightedRowRef} onSelect={(o) => setSelectedOrderId(o.id)} onCancel={handleCancelOrder} />
                    ) : (
                        <OrdersKanbanBoard orders={orders} onSelect={(o) => setSelectedOrderId(o.id)} onChanged={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })} />
                    )}
                </QueryBoundary>
            </motion.div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-10">
                <span className="text-xs font-semibold text-gray-400">
                    Hiển thị <span className="text-gray-900 dark:text-gray-100">{orders.length}</span> / <span className="text-gray-900 dark:text-gray-100">{total}</span> đơn hàng
                </span>
                <div className="flex gap-3">
                    <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-6 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-semibold uppercase text-gray-400 hover:text-accent disabled:opacity-30 transition-all shadow-sm">Trang trước</button>
                    <button disabled={orders.length < 20} onClick={() => setPage((p) => p + 1)} className="px-6 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-semibold uppercase text-gray-400 hover:text-accent disabled:opacity-30 transition-all shadow-sm">Trang kế &gt;</button>
                </div>
            </div>

            <OrderDetailDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
        </div>
    );
};
