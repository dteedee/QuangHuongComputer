/**
 * Công nợ phải thu (W3-13) — contract §2. Rebuilt on the kit; the aging strip
 * now reads `GET /ar/aging-summary` inside a QueryBoundary instead of summing
 * the current page client-side (which silently reported 0 when the call failed).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HandCoins, Search, TrendingUp } from 'lucide-react';
import {
    Button, Card, DataTable, IconButton, Input, Money, PageHeader, Pagination, RowActions,
    Select, StatCard, StatusBadge, notify, type DataTableColumn, type SortState,
} from '../../../components/ui';
import { CrudFormDialog, MoneyField, TextField } from '../../../components/form';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import {
    agingBucketLabel, arApi, formatCurrency, formatVnDate, invoiceStatusLabel,
    type AgingBucket, type InvoiceListItem, type InvoiceStatus,
} from '../../../api/accounting';
import { applyPaymentSchema, type ApplyPaymentFormData } from './accounting-schemas';

const PAGE_SIZE = 20;

export const ARPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [aging, setAging] = useState('');
    const [sort, setSort] = useState<SortState | null>({ id: 'dueDate', dir: 'asc' });
    const [payTarget, setPayTarget] = useState<InvoiceListItem | null>(null);

    const params = {
        page, pageSize: PAGE_SIZE,
        search: search || undefined,
        status: (status || undefined) as InvoiceStatus | undefined,
        aging: (aging || undefined) as AgingBucket | undefined,
        sortBy: sort?.id, sortDir: sort?.dir,
    };

    const query = useQuery({ queryKey: ['accounting', 'ar', params], queryFn: () => arApi.list(params) });
    const agingQuery = useQuery({ queryKey: ['accounting', 'ar', 'aging'], queryFn: arApi.agingSummary });
    const a = agingQuery.data;
    const failed = agingQuery.isError;

    const columns = useMemo<DataTableColumn<InvoiceListItem>[]>(() => [
        { id: 'invoiceNumber', header: 'Số hoá đơn', sortable: true, locked: true, cell: (r) => <span className="num font-medium text-fg">{r.invoiceNumber}</span> },
        { id: 'issueDate', header: 'Ngày lập', sortable: true, cell: (r) => <span className="num">{formatVnDate(r.issueDate)}</span> },
        { id: 'dueDate', header: 'Hạn thu', sortable: true, cell: (r) => <span className="num">{formatVnDate(r.dueDate)}</span> },
        { id: 'totalAmount', header: 'Giá trị', align: 'right', sortable: true, cell: (r) => <Money value={r.totalAmount} /> },
        { id: 'paidAmount', header: 'Đã thu', align: 'right', cell: (r) => <Money value={r.paidAmount} /> },
        { id: 'outstandingAmount', header: 'Còn phải thu', align: 'right', cell: (r) => <Money value={r.outstandingAmount} /> },
        {
            id: 'agingBucket', header: 'Tuổi nợ',
            cell: (r) => <StatusBadge tone={agingBucketLabel[r.agingBucket]?.tone ?? 'neutral'}>
                {agingBucketLabel[r.agingBucket]?.label ?? '—'}
            </StatusBadge>,
        },
        {
            id: 'status', header: 'Trạng thái', locked: true,
            cell: (r) => <StatusBadge tone={invoiceStatusLabel[r.status]?.tone ?? 'neutral'}>
                {invoiceStatusLabel[r.status]?.label ?? r.status}
            </StatusBadge>,
        },
        {
            id: 'actions', header: '', locked: true, width: '1%',
            cell: (r) => (
                <RowActions>
                    <Can permission={PERMISSIONS.ACCOUNTING_CREATE_INVOICE}>
                        {r.outstandingAmount > 0 && r.status !== 'Cancelled' && (
                            <IconButton
                                aria-label={`Ghi nhận thu tiền cho ${r.invoiceNumber}`} variant="ghost"
                                onClick={(e) => { e.stopPropagation(); setPayTarget(r); }}
                            >
                                <HandCoins size={16} aria-hidden />
                            </IconButton>
                        )}
                    </Can>
                </RowActions>
            ),
        },
    ], []);

    return (
        <div className="space-y-5">
            <PageHeader
                title="Công nợ phải thu"
                description="Hoá đơn bán ra chưa thu đủ tiền, phân nhóm theo tuổi nợ."
                breadcrumbs={[{ label: 'Tài chính', to: '/backoffice/accounting' }, { label: 'Công nợ phải thu' }]}
            />

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Trong hạn" value={failed || !a ? null : formatCurrency(a.current)} />
                <StatCard label="1–30 ngày" value={failed || !a ? null : formatCurrency(a.days1To30)} />
                <StatCard label="31–60 ngày" value={failed || !a ? null : formatCurrency(a.days31To60)} />
                <StatCard label="61–90 ngày" value={failed || !a ? null : formatCurrency(a.days61To90)} />
                <StatCard label="Trên 90 ngày" value={failed || !a ? null : formatCurrency(a.over90Days)} />
                <StatCard label="Tổng phải thu" value={failed || !a ? null : formatCurrency(a.totalOutstanding)} icon={TrendingUp} />
            </div>
            {failed && (
                <p className="text-sm text-danger">
                    Không tải được bảng tuổi nợ ({String((agingQuery.error as Error)?.message ?? 'lỗi không xác định')}).
                    <Button variant="ghost" size="sm" onClick={() => agingQuery.refetch()}>Thử lại</Button>
                </p>
            )}

            <Card className="p-4">
                <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}>
                    <Input label="Tìm kiếm" placeholder="Số hoá đơn hoặc khách hàng" icon={Search}
                        value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="sm:flex-1" />
                    <Select
                        label="Tuổi nợ" className="sm:w-48" value={aging}
                        onChange={(e) => { setAging(e.target.value); setPage(1); }}
                        options={[
                            { value: '', label: 'Tất cả' },
                            ...(Object.keys(agingBucketLabel) as AgingBucket[]).map((b) => ({ value: b, label: agingBucketLabel[b].label })),
                        ]}
                    />
                    <Select
                        label="Trạng thái" className="sm:w-48" value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        options={[
                            { value: '', label: 'Tất cả' },
                            ...(Object.keys(invoiceStatusLabel) as InvoiceStatus[]).map((s) => ({ value: s, label: invoiceStatusLabel[s].label })),
                        ]}
                    />
                    <Button type="submit" variant="outline">Lọc</Button>
                </form>
            </Card>

            <DataTable
                caption="Danh sách công nợ phải thu"
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
                onRowClick={(r) => navigate(`/backoffice/accounting/invoices/${r.id}`)}
                empty={{ icon: TrendingUp, title: 'Không có công nợ phải thu', description: 'Mọi hoá đơn bán ra trong bộ lọc này đã được thu đủ.' }}
                pagination={<Pagination page={page} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPageChange={setPage} />}
            />

            <CrudFormDialog<ApplyPaymentFormData>
                open={payTarget !== null}
                onOpenChange={(o) => { if (!o) setPayTarget(null); }}
                title={`Ghi nhận thu tiền ${payTarget?.invoiceNumber ?? ''}`}
                description={payTarget ? `Còn phải thu ${new Intl.NumberFormat('vi-VN').format(payTarget.outstandingAmount)} ₫` : undefined}
                schema={applyPaymentSchema}
                defaultValues={{ amount: payTarget?.outstandingAmount ?? 0, notes: '' }}
                submitLabel="Ghi nhận"
                knownFields={['amount', 'notes']}
                onSubmit={async (data) => {
                    if (!payTarget) return;
                    const res = await arApi.applyPayment(payTarget.id, { amount: data.amount, notes: data.notes || undefined });
                    notify.success('Đã ghi nhận thu tiền', { description: res.message });
                    setPayTarget(null);
                    queryClient.invalidateQueries({ queryKey: ['accounting', 'ar'] });
                }}
            >
                {(form) => (
                    <>
                        <MoneyField name="amount" control={form.control} label="Số tiền thu" max={payTarget?.outstandingAmount} />
                        <TextField name="notes" control={form.control} label="Ghi chú" />
                    </>
                )}
            </CrudFormDialog>
        </div>
    );
};

export default ARPage;
