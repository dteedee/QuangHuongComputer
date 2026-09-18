/**
 * QUẢN TRỊ ĐIỂM THƯỞNG — danh sách thành viên, thống kê, điều chỉnh tay có lý do.
 * Bộ lọc đồng bộ vào URL để dán link cho đồng nghiệp là ra đúng màn hình đang xem.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Gift, Users } from 'lucide-react';
import {
    Badge, Button, Card, DataTable, PageHeader, Pagination, QueryBoundary, Select, Skeleton, StatCard,
    type DataTableColumn,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import LoyaltyAdjustDialog from './loyalty-adjust-dialog';
import { TIER_LABELS, loyaltyAdminApi, type LoyaltyAccountRow, type LoyaltyTier } from './loyalty-admin-api';

const PAGE_SIZE = 20;
const TIER_TONE: Record<LoyaltyTier, 'neutral' | 'brand' | 'success' | 'info' | 'violet'> = {
    Bronze: 'neutral', Silver: 'info', Gold: 'brand', Platinum: 'success', Diamond: 'violet',
};

export default function LoyaltyAdminPage() {
    const [params, setParams] = useSearchParams();
    const page = Number(params.get('page') ?? '1') || 1;
    const tier = params.get('tier') ?? '';
    const [adjusting, setAdjusting] = useState<LoyaltyAccountRow | null>(null);

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        if (key !== 'page') next.set('page', '1');
        setParams(next, { replace: true });
    };

    const statsQuery = useQuery({ queryKey: ['loyalty-admin', 'stats'], queryFn: loyaltyAdminApi.stats });
    const listQuery = useQuery({
        queryKey: ['loyalty-admin', 'list', page, tier],
        queryFn: () => loyaltyAdminApi.list({ page, pageSize: PAGE_SIZE, tier: tier || undefined }),
        placeholderData: keepPreviousData,
    });

    const columns: DataTableColumn<LoyaltyAccountRow>[] = [
        {
            id: 'userId', header: 'Thành viên', locked: true,
            cell: (r) => <span className="num text-xs">{r.userId.slice(0, 8)}…</span>,
        },
        { id: 'tier', header: 'Hạng', cell: (r) => <Badge variant={TIER_TONE[r.tier]}>{TIER_LABELS[r.tier] ?? r.tier}</Badge> },
        { id: 'availablePoints', header: 'Khả dụng', align: 'right', cell: (r) => <span className="num">{r.availablePoints.toLocaleString('vi-VN')}</span> },
        { id: 'totalPoints', header: 'Tổng tích', align: 'right', cell: (r) => <span className="num">{r.totalPoints.toLocaleString('vi-VN')}</span> },
        { id: 'lifetimePoints', header: 'Trọn đời', align: 'right', defaultHidden: true, cell: (r) => <span className="num">{r.lifetimePoints.toLocaleString('vi-VN')}</span> },
        {
            id: 'lastActivityAt', header: 'Hoạt động gần nhất',
            cell: (r) => (r.lastActivityAt
                ? new Date(r.lastActivityAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
                : '—'),
        },
        {
            id: 'actions', header: '', locked: true, width: '1%',
            cell: (r) => (
                <Can permission={PERMISSIONS.SALES_MANAGE_ALL}>
                    <Button size="sm" variant="outline" onClick={() => setAdjusting(r)}>Điều chỉnh</Button>
                </Can>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader title="Điểm thưởng khách hàng" description="Thành viên, hạng và điều chỉnh điểm tay có lý do." />

            <QueryBoundary query={statsQuery} skeleton={<Skeleton className="h-24 w-full" />} inline>
                {(stats) => (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <StatCard label="Thành viên" value={stats.totalAccounts} icon={Users} animate />
                        <StatCard label="Điểm đã phát" value={stats.totalPointsIssued} icon={Gift} animate />
                        <StatCard label="Điểm còn khả dụng" value={stats.totalPointsAvailable} animate />
                    </div>
                )}
            </QueryBoundary>

            <Card padded className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Select
                        aria-label="Lọc theo hạng"
                        value={tier}
                        onChange={(e) => setParam('tier', e.target.value)}
                        options={[{ value: '', label: 'Tất cả hạng' },
                            ...Object.entries(TIER_LABELS).map(([value, label]) => ({ value, label }))]}
                    />
                </div>

                <DataTable
                    caption="Danh sách thành viên điểm thưởng"
                    columns={columns}
                    rows={listQuery.data?.accounts}
                    rowKey={(r) => r.id}
                    loading={listQuery.isPending}
                    error={listQuery.error}
                    onRetry={() => listQuery.refetch()}
                    enableColumnVisibility
                    empty={{ title: 'Chưa có thành viên nào', description: 'Điểm được tích khi đơn hàng hoàn tất.' }}
                    pagination={
                        <Pagination
                            page={page}
                            pageSize={PAGE_SIZE}
                            total={listQuery.data?.total ?? 0}
                            onPageChange={(p) => setParam('page', String(p))}
                        />
                    }
                />
            </Card>

            <LoyaltyAdjustDialog
                account={adjusting}
                onOpenChange={(open) => !open && setAdjusting(null)}
                onDone={() => { listQuery.refetch(); statsQuery.refetch(); }}
            />
        </div>
    );
}
