/**
 * TRUNG TÂM KINH DOANH — trang mở đầu của nhóm bán hàng.
 * Dựng lại trên UI kit (W1-12) + `QueryBoundary`: bản cũ tự vẽ nút/thẻ bằng bảng màu cứng
 * (`bg-blue-50`, `text-gray-700`…), tải bằng spinner trên nền trắng và `data ?? []` che lỗi 500.
 * Tăng trưởng lấy từ `/sales/admin/stats` — **không bịa 100%** khi kỳ gốc bằng 0 (contract §5).
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CreditCard, Package, RefreshCw, Star, TrendingUp } from 'lucide-react';
import {
    Badge, Button, Card, CardBody, CardHeader, CardTitle, Money, PageHeader, QueryBoundary,
    Skeleton, StatCard, Table, TBody, Td, THead, Th, Tr,
} from '../../../components/ui';
import { salesAdminOrdersApi } from '../../../api/sales/admin-orders';
import type { Order } from '../../../api/sales/types';
import { paths } from '../../../routes';

/** Backend trả object tăng trưởng; type dùng chung (`api/sales/admin-orders.ts`) vẫn khai `number` — IR w3#10. */
interface GrowthBlock { percent: number | null; noBaseline: boolean; current: number; previous: number }

const ORDER_STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
    Pending: { label: 'Chờ xác nhận', tone: 'warning' },
    Draft: { label: 'Nháp', tone: 'neutral' },
    Paid: { label: 'Đã thanh toán', tone: 'success' },
    Confirmed: { label: 'Đã xác nhận', tone: 'info' },
    Processing: { label: 'Đang xử lý', tone: 'info' },
    Shipped: { label: 'Đang giao', tone: 'info' },
    Delivered: { label: 'Đã giao', tone: 'success' },
    Completed: { label: 'Hoàn tất', tone: 'success' },
    Cancelled: { label: 'Đã huỷ', tone: 'danger' },
};

const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export const SalePortal = () => {
    const statsQuery = useQuery({ queryKey: ['sales', 'admin-stats'], queryFn: () => salesAdminOrdersApi.admin.getStats() });
    const ordersQuery = useQuery({
        queryKey: ['sales', 'admin-orders', 'recent'],
        queryFn: () => salesAdminOrdersApi.admin.getOrders(1, 8),
    });

    const stats = statsQuery.data as (typeof statsQuery.data & { orderGrowth?: GrowthBlock; revenueGrowth?: GrowthBlock; netRevenue?: number }) | undefined;
    const growth = (g?: GrowthBlock) =>
        g && !g.noBaseline && g.percent !== null ? { value: g.percent, label: 'so với kỳ trước' } : null;

    return (
        <div className="space-y-4">
            <PageHeader
                title="Trung tâm kinh doanh"
                description="Đơn hàng, doanh thu và các việc cần làm hôm nay."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => { statsQuery.refetch(); ordersQuery.refetch(); }} variant="ghost">
                            <RefreshCw size={16} /> Làm mới
                        </Button>
                        <Link to={paths.backoffice.pos()}><Button><CreditCard size={16} /> Bán tại quầy</Button></Link>
                    </div>
                }
            />

            <QueryBoundary query={statsQuery} skeleton={<Skeleton className="h-24 w-full" />} inline>
                {() => (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Đơn hôm nay" value={stats?.todayOrders ?? null} icon={Package} delta={growth(stats?.orderGrowth)} animate />
                        <StatCard label="Doanh thu hôm nay" value={stats?.todayRevenue != null ? stats.todayRevenue.toLocaleString('vi-VN') + 'đ' : null} icon={TrendingUp} />
                        <StatCard label="Doanh thu thuần tháng" value={stats?.netRevenue != null ? stats.netRevenue.toLocaleString('vi-VN') + 'đ' : null} hint="Đã trừ tiền hoàn" />
                        <StatCard label="Đơn chờ xử lý" value={stats?.pendingOrders ?? null} />
                    </div>
                )}
            </QueryBoundary>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Đơn hàng gần đây</CardTitle>
                        <Link to={paths.backoffice.orders?.() ?? '/backoffice/orders'} className="text-sm font-semibold text-brand-text hover:underline">Xem tất cả</Link>
                    </CardHeader>
                    <CardBody>
                        <QueryBoundary
                            query={ordersQuery}
                            isEmpty={(d) => (d.orders?.length ?? 0) === 0}
                            skeleton={<Skeleton className="h-48 w-full" />}
                            empty={{ title: 'Chưa có đơn hàng nào', description: 'Đơn tạo ở quầy hoặc trên website sẽ hiện tại đây.' }}
                        >
                            {(data) => (
                                <Table>
                                    <caption className="sr-only">Tám đơn hàng gần nhất</caption>
                                    <THead>
                                        <Tr>
                                            <Th>Mã đơn</Th><Th>Khách</Th><Th>Trạng thái</Th>
                                            <Th className="text-right">Tổng tiền</Th><Th>Thời gian</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {data.orders.map((o: Order) => (
                                            <Tr key={o.id}>
                                                <Td className="num">{o.orderNumber}</Td>
                                                <Td>{o.customerName ?? 'Khách vãng lai'}</Td>
                                                <Td>
                                                    <Badge variant={ORDER_STATUS[o.status]?.tone ?? 'neutral'} dot>
                                                        {ORDER_STATUS[o.status]?.label ?? o.status}
                                                    </Badge>
                                                </Td>
                                                <Td className="text-right"><Money value={o.totalAmount} /></Td>
                                                <Td>{formatDate(o.orderDate)}</Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            )}
                        </QueryBoundary>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Lối tắt</CardTitle></CardHeader>
                    <CardBody className="space-y-2">
                        {[
                            { to: paths.backoffice.pos(), label: 'Bán hàng tại quầy', icon: CreditCard },
                            { to: paths.backoffice.orders?.() ?? '/backoffice/orders', label: 'Quản lý đơn hàng', icon: Package },
                            { to: paths.backoffice.returns(), label: 'Đổi trả', icon: RefreshCw },
                            { to: paths.backoffice.loyaltyAdmin(), label: 'Điểm thưởng', icon: Star },
                        ].map(({ to, label, icon: Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-sm font-medium hover:border-line-strong"
                            >
                                <span className="flex items-center gap-2"><Icon size={16} /> {label}</span>
                                <span aria-hidden>→</span>
                            </Link>
                        ))}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

export default SalePortal;
