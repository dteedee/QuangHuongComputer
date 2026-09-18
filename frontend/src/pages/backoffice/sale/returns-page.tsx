/**
 * ĐỔI TRẢ — danh sách quản trị (`/api/sales/admin/returns`, contract §2).
 * Thay `ReturnsManagementPage.tsx` cũ: trang đó lọc/tìm/đếm thống kê ngay trong trình duyệt trên
 * một trang dữ liệu, nên số liệu sai khi có nhiều hơn một trang. Ở đây lọc + phân trang chạy ở
 * server, bộ lọc đồng bộ vào URL.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PackageX } from 'lucide-react';
import {
    Badge, Button, Card, DataTable, Money, PageHeader, Pagination, Select,
    type DataTableColumn,
} from '../../../components/ui';
import { salesReturnsAdminApi } from '../../../api/sales/returns-admin';
import type { ReceivedCondition, ReturnRequest } from '../../../api/sales/types';
import ReturnDetailDrawer from './return-detail-drawer';

const PAGE_SIZE = 20;

/** Backend trả thêm 3 trường kiểm hàng mà `api/sales/types.ts` (file của track khác) chưa khai. */
export interface AdminReturnRow extends ReturnRequest {
    inspectedAt?: string | null;
    receivedCondition?: ReceivedCondition | null;
    reasonCode?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
    Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối',
    Completed: 'Hoàn tất', Refunded: 'Đã hoàn tiền', Cancelled: 'Đã huỷ',
};
const STATUS_TONE: Record<string, 'warning' | 'info' | 'danger' | 'success' | 'neutral'> = {
    Pending: 'warning', Approved: 'info', Rejected: 'danger',
    Completed: 'success', Refunded: 'success', Cancelled: 'neutral',
};
const TYPE_LABELS: Record<string, string> = { Refund: 'Hoàn tiền', Exchange: 'Đổi hàng', Replace: 'Thay thế' };

const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function ReturnsPage() {
    const [params, setParams] = useSearchParams();
    const page = Number(params.get('page') ?? '1') || 1;
    const status = params.get('status') ?? '';
    const [selected, setSelected] = useState<AdminReturnRow | null>(null);

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        if (key !== 'page') next.set('page', '1');
        setParams(next, { replace: true });
    };

    const query = useQuery({
        queryKey: ['sales', 'admin-returns', page, status],
        queryFn: () => salesReturnsAdminApi.adminGetList(page, PAGE_SIZE, status || undefined),
        placeholderData: keepPreviousData,
    });

    const columns: DataTableColumn<AdminReturnRow>[] = [
        {
            id: 'id', header: 'Mã yêu cầu', locked: true,
            cell: (r) => <span className="num text-xs">{r.id.slice(0, 8).toUpperCase()}</span>,
        },
        { id: 'type', header: 'Loại', cell: (r) => TYPE_LABELS[r.type] ?? r.type },
        { id: 'reason', header: 'Lý do', cell: (r) => <span className="line-clamp-2">{r.reason}</span> },
        {
            id: 'status', header: 'Trạng thái',
            cell: (r) => <Badge variant={STATUS_TONE[r.status] ?? 'neutral'} dot>{STATUS_LABELS[r.status] ?? r.status}</Badge>,
        },
        { id: 'refundAmount', header: 'Tiền hoàn', align: 'right', cell: (r) => <Money value={r.refundAmount ?? null} /> },
        { id: 'requestedAt', header: 'Ngày gửi', cell: (r) => formatDate(r.requestedAt) },
        { id: 'inspectedAt', header: 'Đã kiểm hàng', defaultHidden: true, cell: (r) => formatDate(r.inspectedAt) },
        {
            id: 'actions', header: '', locked: true, width: '1%',
            cell: (r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}>Xử lý</Button>,
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader title="Đổi trả" description="Duyệt, kiểm hàng nhận về và hoàn tiền theo chính sách D08." />

            <Card padded className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Select
                        aria-label="Lọc theo trạng thái"
                        value={status}
                        onChange={(e) => setParam('status', e.target.value)}
                        options={[{ value: '', label: 'Tất cả trạng thái' },
                            ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
                    />
                    {status && <Button variant="ghost" size="sm" onClick={() => setParam('status', '')}>Xoá bộ lọc</Button>}
                </div>

                <DataTable
                    caption="Danh sách yêu cầu đổi trả"
                    columns={columns}
                    rows={query.data?.returns as AdminReturnRow[] | undefined}
                    rowKey={(r) => r.id}
                    loading={query.isPending}
                    error={query.error}
                    onRetry={() => query.refetch()}
                    enableColumnVisibility
                    empty={{
                        icon: PackageX,
                        title: 'Chưa có yêu cầu đổi trả nào',
                        description: status ? 'Không có yêu cầu nào ở trạng thái này.' : 'Khách gửi yêu cầu từ trang đơn hàng của họ.',
                    }}
                    pagination={
                        <Pagination
                            page={page}
                            pageSize={PAGE_SIZE}
                            total={query.data?.total ?? 0}
                            onPageChange={(p) => setParam('page', String(p))}
                        />
                    }
                />
            </Card>

            <ReturnDetailDrawer
                request={selected}
                onOpenChange={(open) => !open && setSelected(null)}
                onChanged={() => query.refetch()}
            />
        </div>
    );
}
