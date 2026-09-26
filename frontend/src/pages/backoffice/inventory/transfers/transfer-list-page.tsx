/**
 * "Chuyển kho" — route `inventory/transfers`. Paged list from `GET /inventory/transfers` with a
 * status filter (tabs), a warehouse filter and a search on the transfer number.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import {
    Badge, Button, DataTable, Input, PageHeader, Pagination, Select, StatusBadge, Tab, TabList, Tabs,
} from '../../../../components/ui';
import type { DataTableColumn } from '../../../../components/ui';
import { Can } from '../../../../components/Can';
import { PERMISSIONS } from '../../../../constants/permissions';
import { inventoryApi } from '../../../../api/inventory';
import {
    inventoryTransfersApi, TRANSFER_STATUSES, transferStatusLabels,
    type TransferListRow, type TransferStatus,
} from '../../../../api/inventory-transfers';
import { formatPrintDate } from '../../../../components/print/print-date';
import { transferStatusBadge } from './transfer-status-meta';
import { paths } from '../../../../routes';

const PAGE_SIZE = 20;

const columns: DataTableColumn<TransferListRow>[] = [
    {
        id: 'transferNumber', header: 'Số phiếu', locked: true, nowrap: true,
        cell: (r) => (
            <Link to={paths.backoffice.inventoryTransferDetail(r.id)} className="num font-semibold text-fg hover:text-brand-text">
                {r.transferNumber}
            </Link>
        ),
    },
    { id: 'route', header: 'Từ kho → Đến kho', cell: (r) => `${r.fromWarehouse ?? '—'} → ${r.toWarehouse ?? '—'}` },
    {
        id: 'quantity', header: 'Số lượng', align: 'right',
        cell: (r) => <span className="num">{r.totalQuantity} <span className="text-fg-subtle">({r.itemCount} dòng)</span></span>,
    },
    {
        id: 'status', header: 'Trạng thái', nowrap: true,
        cell: (r) => (
            <span className="inline-flex items-center gap-1.5">
                <StatusBadge {...transferStatusBadge(r.status)} />
                {r.hasDiscrepancy && <Badge variant="danger">Nhận thiếu</Badge>}
            </span>
        ),
    },
    { id: 'requestedAt', header: 'Ngày lập', nowrap: true, cell: (r) => <span className="num">{formatPrintDate(r.requestedAt, true)}</span> },
    { id: 'notes', header: 'Ghi chú', defaultHidden: true, cell: (r) => r.notes ?? '' },
];

export default function TransferListPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<TransferStatus | ''>('');
    const [warehouseId, setWarehouseId] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const warehousesQuery = useQuery({
        queryKey: ['inventory', 'warehouses', 'dropdown'],
        queryFn: inventoryApi.warehouses.getDropdown,
    });
    const listQuery = useQuery({
        queryKey: ['inventory', 'transfers', 'list', { status, warehouseId, search, page }],
        queryFn: () => inventoryTransfersApi.list({
            page, pageSize: PAGE_SIZE,
            status: status || undefined, warehouseId: warehouseId || undefined, search: search.trim() || undefined,
        }),
        placeholderData: (prev) => prev,
    });

    const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

    return (
        <div className="space-y-4 px-4 py-4 lg:px-6">
            <PageHeader
                title="Chuyển kho"
                description="Phiếu chuyển hàng giữa các kho: duyệt, xuất, nhận và đối chiếu chênh lệch."
                actions={(
                    <Can permission={PERMISSIONS.INVENTORY_MANAGE_STOCK}>
                        <Button onClick={() => navigate(paths.backoffice.inventoryTransferNew())}>
                            <Plus className="h-4 w-4" aria-hidden /> Tạo phiếu chuyển
                        </Button>
                    </Can>
                )}
            >
                <Tabs value={status || 'all'} onValueChange={(v) => resetPage(setStatus)(v === 'all' ? '' : v as TransferStatus)}>
                    <TabList aria-label="Lọc theo trạng thái">
                        <Tab value="all">Tất cả</Tab>
                        {TRANSFER_STATUSES.map((s) => <Tab key={s} value={s}>{transferStatusLabels[s]}</Tab>)}
                    </TabList>
                </Tabs>
            </PageHeader>

            <div className="flex flex-wrap gap-3">
                <Input
                    aria-label="Tìm số phiếu"
                    placeholder="Tìm số phiếu"
                    value={search}
                    onChange={(e) => resetPage(setSearch)(e.target.value)}
                    className="w-64"
                />
                <Select
                    value={warehouseId}
                    onChange={(e) => resetPage(setWarehouseId)(e.target.value)}
                    options={[{ value: '', label: 'Mọi kho' }, ...(warehousesQuery.data ?? []).map((w) => ({ value: w.id, label: w.name }))]}
                    className="w-56"
                />
            </div>

            <DataTable
                caption="Danh sách phiếu chuyển kho"
                columns={columns}
                rows={listQuery.data?.items}
                rowKey={(r) => r.id}
                loading={listQuery.isPending}
                error={listQuery.error}
                onRetry={() => { void listQuery.refetch(); }}
                enableColumnVisibility
                empty={{ title: 'Chưa có phiếu chuyển kho nào', description: 'Phiếu mới sẽ hiện ở đây sau khi được lập.' }}
                pagination={<Pagination page={page} pageSize={PAGE_SIZE} total={listQuery.data?.total ?? 0} onPageChange={setPage} />}
            />
        </div>
    );
}
