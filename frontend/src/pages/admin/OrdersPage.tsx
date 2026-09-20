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
import { buttonVariants, Card, PageHeader, Pagination } from '../../components/ui';
import { paths } from '../../routes';
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
        /* §9.2: khoảng cách gap-4, không `space-y-10 pb-20` kiểu landing page. */
        <div className="space-y-4">
            <PageHeader
                title="Đơn hàng"
                description="Xử lý đơn từ website, POS và báo giá — lọc, đổi trạng thái, xem chi tiết."
                actions={
                    /* Tạo đơn là hành động chính DUY NHẤT của màn hình (§9.1).
                       Modal tạo đơn đồ chơi đã gỡ ở phase-58 — POS là nơi tạo đơn thật. */
                    <Link to={paths.backoffice.pos()} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                        <Store size={16} aria-hidden /> Tạo đơn tại POS
                    </Link>
                }
            />

            <OrdersFilterBar filters={filters} onChange={handleFilterChange} onReset={resetFilters} hasActiveFilters={hasActiveFilters} viewMode={viewMode} onViewModeChange={setViewMode} />

            <motion.div key={viewMode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card padded={false} radius="xl" className="overflow-hidden">
                    <QueryBoundary
                        query={ordersQuery}
                        isEmpty={() => orders.length === 0}
                        empty={{ title: 'Chưa có đơn hàng nào', description: 'Đơn hàng tạo từ website, POS hoặc báo giá sẽ xuất hiện ở đây.' }}
                        skeleton={<div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-sunken" />)}</div>}
                        errorTitle="Không tải được danh sách đơn hàng"
                    >
                        {() => viewMode === 'list' ? (
                            <OrdersListTable orders={orders} highlightedOrderId={highlightedOrderId} highlightedRowRef={highlightedRowRef} onSelect={(o) => setSelectedOrderId(o.id)} onCancel={handleCancelOrder} />
                        ) : (
                            <div className="p-4">
                                <OrdersKanbanBoard orders={orders} onSelect={(o) => setSelectedOrderId(o.id)} onChanged={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })} />
                            </div>
                        )}
                    </QueryBoundary>

                    {/* §9.3: phân trang dùng `Pagination` của bộ UI kit — hiện đúng dải
                        "1–20 / 137" thay vì hai nút "Trang trước / Trang kế" không số. */}
                    <div className="border-t border-line px-3 py-2">
                        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
                    </div>
                </Card>
            </motion.div>

            <OrderDetailDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
        </div>
    );
};
