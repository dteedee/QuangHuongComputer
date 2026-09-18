/**
 * Sổ ca thu ngân (W3-13) — `docs/api-contracts/accounting.md` §6.
 *
 * Oversight view: every shift, its expected vs counted cash, its variance and
 * whether the variance has been approved. Opening/closing a till needs
 * `Sales.Pos` (cashier tier), so those buttons only appear for a user who has
 * it; an accountant without `Sales.Pos` still sees the whole book and can
 * approve a variance (`Accounting.ManageDebt`).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, PlayCircle } from 'lucide-react';
import {
    Button, Card, DataTable, Money, PageHeader, Pagination, Select, StatCard, StatusBadge,
    notify, type DataTableColumn, type SortState,
} from '../../../components/ui';
import { CrudFormDialog, MoneyField, TextField } from '../../../components/form';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { formatCurrency, formatVnDateTime, shiftsApi, type ShiftSession } from '../../../api/accounting';
import { openShiftSchema, type OpenShiftFormData } from './accounting-schemas';

const PAGE_SIZE = 20;

export const ShiftsPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState<SortState | null>({ id: 'openedAt', dir: 'desc' });
    const [openDialog, setOpenDialog] = useState(false);

    const params = {
        page, pageSize: PAGE_SIZE,
        status: (status || undefined) as 'Open' | 'Closed' | undefined,
        sortBy: sort?.id as 'openedAt' | 'closedAt' | 'variance' | undefined,
        sortDir: sort?.dir,
    };

    const query = useQuery({
        queryKey: ['accounting', 'shifts', params],
        queryFn: () => shiftsApi.list(params),
    });

    const rows = query.data?.items ?? [];
    const openCount = rows.filter((s) => s.status === 'Open').length;
    const shortfall = rows.filter((s) => s.status === 'Closed' && s.variance < 0)
        .reduce((sum, s) => sum + Math.abs(s.variance), 0);
    const unapproved = rows.filter((s) => s.status === 'Closed' && s.variance !== 0 && !s.varianceApprovedAt).length;

    const columns = useMemo<DataTableColumn<ShiftSession>[]>(() => [
        {
            id: 'openedAt', header: 'Mở ca', sortable: true, locked: true,
            cell: (r) => <span className="num">{formatVnDateTime(r.openedAt)}</span>,
        },
        { id: 'closedAt', header: 'Chốt ca', sortable: true, cell: (r) => <span className="num">{r.closedAt ? formatVnDateTime(r.closedAt) : '—'}</span> },
        { id: 'openingBalance', header: 'Đầu ca', align: 'right', cell: (r) => <Money value={r.openingBalance} /> },
        { id: 'cashIn', header: 'Thu', align: 'right', cell: (r) => <Money value={r.cashIn} /> },
        { id: 'cashOut', header: 'Chi', align: 'right', cell: (r) => <Money value={r.cashOut} /> },
        { id: 'expectedCash', header: 'Phải có', align: 'right', cell: (r) => <Money value={r.expectedCash} /> },
        { id: 'closingBalance', header: 'Đếm được', align: 'right', cell: (r) => <Money value={r.closingBalance ?? null} /> },
        {
            id: 'variance', header: 'Chênh lệch', align: 'right', sortable: true,
            cell: (r) => (
                <span className={r.variance < 0 ? 'text-danger' : r.variance > 0 ? 'text-warning' : 'text-fg-muted'}>
                    <Money value={r.status === 'Open' ? null : r.variance} />
                </span>
            ),
        },
        {
            id: 'status', header: 'Trạng thái', locked: true,
            cell: (r) => r.status === 'Open'
                ? <StatusBadge tone="info">Đang mở</StatusBadge>
                : r.variance !== 0 && !r.varianceApprovedAt
                    ? <StatusBadge tone="warning">Chờ duyệt lệch</StatusBadge>
                    : <StatusBadge tone="success">Đã chốt</StatusBadge>,
        },
    ], []);

    return (
        <div className="space-y-5">
            <PageHeader
                title="Ca thu ngân"
                description="Đối soát quỹ tiền mặt từng ca: tiền phải có, tiền đếm được và lý do chênh lệch."
                breadcrumbs={[{ label: 'Tài chính', to: '/backoffice/accounting' }, { label: 'Ca thu ngân' }]}
                actions={
                    <Can permission={PERMISSIONS.SALES_POS}>
                        <Button onClick={() => setOpenDialog(true)}>
                            <PlayCircle size={16} aria-hidden /> Mở ca mới
                        </Button>
                    </Can>
                }
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Ca đang mở (trang này)" value={query.isError ? null : openCount} icon={Clock} />
                <StatCard label="Thiếu quỹ (trang này)" value={query.isError ? null : formatCurrency(shortfall)} hint="Tổng chênh lệch âm" />
                <StatCard label="Lệch chưa duyệt" value={query.isError ? null : unapproved} />
            </div>

            <Card className="p-4">
                <Select
                    label="Trạng thái" className="sm:w-56"
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    options={[
                        { value: '', label: 'Tất cả' },
                        { value: 'Open', label: 'Đang mở' },
                        { value: 'Closed', label: 'Đã chốt' },
                    ]}
                />
            </Card>

            <DataTable
                caption="Danh sách ca thu ngân"
                columns={columns}
                rows={query.data?.items}
                rowKey={(r) => r.id}
                loading={query.isPending}
                error={query.error}
                onRetry={query.refetch}
                sort={sort}
                onSortChange={setSort}
                enableColumnVisibility
                skeletonRows={8}
                onRowClick={(r) => navigate(`/backoffice/accounting/shifts/${r.id}`)}
                empty={{
                    icon: Clock,
                    title: 'Chưa có ca nào',
                    description: 'Ca được tạo khi thu ngân mở quỹ đầu ngày tại màn hình bán hàng.',
                }}
                pagination={
                    <Pagination page={page} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPageChange={setPage} />
                }
            />

            <CrudFormDialog<OpenShiftFormData>
                open={openDialog} onOpenChange={setOpenDialog}
                title="Mở ca thu ngân"
                description="Nhập số tiền mặt có trong két lúc bắt đầu ca."
                schema={openShiftSchema}
                defaultValues={{ warehouseId: '', openingBalance: 0 }}
                submitLabel="Mở ca"
                knownFields={['warehouseId', 'openingBalance']}
                onSubmit={async (data) => {
                    const shift = await shiftsApi.open(data);
                    await queryClient.invalidateQueries({ queryKey: ['accounting', 'shifts'] });
                    notify.success('Đã mở ca');
                    setOpenDialog(false);
                    navigate(`/backoffice/accounting/shifts/${shift.id}`);
                }}
            >
                {(form) => (
                    <>
                        <TextField name="warehouseId" control={form.control} label="Mã kho / cửa hàng" required />
                        <MoneyField name="openingBalance" control={form.control} label="Tiền mặt đầu ca" />
                    </>
                )}
            </CrudFormDialog>
        </div>
    );
};

export default ShiftsPage;
