/**
 * Hoá đơn — danh sách (W3-13). There was no invoice screen at all before this:
 * the portal listed 20 rows read straight from `client.get()` with no filter,
 * no paging and no way to open one.
 *
 * Contract: `docs/api-contracts/accounting.md` §1. Search covers invoice number,
 * order number and buyer name/tax code; sorting and paging are server-side.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus, Search } from 'lucide-react';
import {
    Button, Card, DataTable, Input, Money, PageHeader, Pagination, Select, StatusBadge,
    type DataTableColumn, type SortState,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import {
    agingBucketLabel, formatVnDate, invoiceStatusLabel, invoiceTypeLabel,
    invoicesApi, type InvoiceListItem, type InvoiceStatus, type InvoiceType,
} from '../../../api/accounting';
import { InvoiceCreateDialog } from './invoice-create-dialog';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
    { value: '', label: 'Mọi trạng thái' },
    ...(Object.keys(invoiceStatusLabel) as InvoiceStatus[]).map((s) => ({
        value: s, label: invoiceStatusLabel[s].label,
    })),
];

const TYPE_OPTIONS = [
    { value: '', label: 'Cả bán ra và mua vào' },
    { value: 'Receivable', label: 'Bán ra (phải thu)' },
    { value: 'Payable', label: 'Mua vào (phải trả)' },
];

export const InvoicesPage = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [sort, setSort] = useState<SortState | null>({ id: 'issueDate', dir: 'desc' });
    const [createOpen, setCreateOpen] = useState(false);

    const params = {
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: (status || undefined) as InvoiceStatus | undefined,
        type: (type || undefined) as InvoiceType | undefined,
        sortBy: sort?.id as 'invoiceNumber' | 'issueDate' | 'dueDate' | 'totalAmount' | undefined,
        sortDir: sort?.dir,
    };

    const query = useQuery({
        queryKey: ['accounting', 'invoices', params],
        queryFn: () => invoicesApi.list(params),
    });

    const columns = useMemo<DataTableColumn<InvoiceListItem>[]>(() => [
        {
            id: 'invoiceNumber', header: 'Số hoá đơn', sortable: true, locked: true,
            cell: (r) => <span className="num font-medium text-fg">{r.invoiceNumber}</span>,
        },
        {
            id: 'type', header: 'Loại',
            cell: (r) => <span className="text-fg-muted">{r.type ? invoiceTypeLabel[r.type] : '—'}</span>,
        },
        {
            id: 'orderNumber', header: 'Đơn hàng', defaultHidden: true,
            cell: (r) => <span className="num text-fg-muted">{r.orderNumber ?? '—'}</span>,
        },
        { id: 'issueDate', header: 'Ngày lập', sortable: true, cell: (r) => <span className="num">{formatVnDate(r.issueDate)}</span> },
        { id: 'dueDate', header: 'Hạn thanh toán', sortable: true, cell: (r) => <span className="num">{formatVnDate(r.dueDate)}</span> },
        { id: 'totalAmount', header: 'Tổng tiền', align: 'right', sortable: true, cell: (r) => <Money value={r.totalAmount} /> },
        { id: 'paidAmount', header: 'Đã thu', align: 'right', cell: (r) => <Money value={r.paidAmount} /> },
        { id: 'outstandingAmount', header: 'Còn lại', align: 'right', cell: (r) => <Money value={r.outstandingAmount} /> },
        {
            id: 'agingBucket', header: 'Tuổi nợ', defaultHidden: true,
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
    ], []);

    const applySearch = () => { setSearch(searchInput.trim()); setPage(1); };

    return (
        <div className="space-y-5">
            <PageHeader
                title="Hoá đơn"
                description="Hoá đơn bán ra và mua vào, tách thuế GTGT theo từng dòng hàng."
                breadcrumbs={[{ label: 'Tài chính', to: '/backoffice/accounting' }, { label: 'Hoá đơn' }]}
                actions={
                    <Can permission={PERMISSIONS.ACCOUNTING_CREATE_INVOICE}>
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus size={16} aria-hidden /> Lập hoá đơn
                        </Button>
                    </Can>
                }
            />

            <Card className="p-4">
                <form
                    className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    onSubmit={(e) => { e.preventDefault(); applySearch(); }}
                >
                    <Input
                        label="Tìm kiếm"
                        placeholder="Số hoá đơn, mã đơn, tên hoặc MST người mua"
                        icon={Search}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="sm:flex-1"
                    />
                    <Select
                        label="Loại hoá đơn" options={TYPE_OPTIONS} value={type}
                        onChange={(e) => { setType(e.target.value); setPage(1); }}
                        className="sm:w-56"
                    />
                    <Select
                        label="Trạng thái" options={STATUS_OPTIONS} value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        className="sm:w-48"
                    />
                    <Button type="submit" variant="outline">Lọc</Button>
                </form>
            </Card>

            <DataTable
                caption="Danh sách hoá đơn"
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
                empty={{
                    icon: FileText,
                    title: 'Chưa có hoá đơn nào khớp bộ lọc',
                    description: 'Hoá đơn bán ra sinh tự động khi đơn hàng được giao hoặc thanh toán. Bạn cũng có thể lập hoá đơn tay.',
                    action: { label: 'Lập hoá đơn', onClick: () => setCreateOpen(true) },
                    secondaryAction: search || status || type
                        ? { label: 'Xoá bộ lọc', onClick: () => { setSearch(''); setSearchInput(''); setStatus(''); setType(''); setPage(1); } }
                        : undefined,
                }}
                pagination={
                    <Pagination
                        page={page} pageSize={PAGE_SIZE}
                        total={query.data?.total ?? 0} onPageChange={setPage}
                    />
                }
            />

            <InvoiceCreateDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={(id) => navigate(`/backoffice/accounting/invoices/${id}`)}
            />
        </div>
    );
};

export default InvoicesPage;
