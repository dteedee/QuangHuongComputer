/**
 * Công nợ phải trả (W3-13) — contract §3.
 * Supplier prices are NET of VAT (the opposite of retail, D01): the create form
 * says so, and the total shown is the indicative net + tax, while the invoice
 * the server stores is the authority.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Search, Wallet } from 'lucide-react';
import {
    Button, Card, DataTable, IconButton, Input, Money, PageHeader, Pagination, RowActions,
    Select, StatCard, StatusBadge, notify, type DataTableColumn, type SortState,
} from '../../../components/ui';
import { CrudFormDialog, MoneyField, TextField } from '../../../components/form';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePrompt } from '../../../context/ConfirmContext';
import {
    agingBucketLabel, apApi, formatCurrency, formatVnDate, invoiceStatusLabel,
    type InvoiceListItem, type InvoiceStatus,
} from '../../../api/accounting';
import { applyPaymentSchema, type ApplyPaymentFormData } from './accounting-schemas';

const PAGE_SIZE = 20;

const PAYMENT_METHODS = [
    { value: 'BankTransfer', label: 'Chuyển khoản' },
    { value: 'Cash', label: 'Tiền mặt' },
    { value: 'Card', label: 'Thẻ' },
];

export const APPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState<SortState | null>({ id: 'dueDate', dir: 'asc' });
    const [payTarget, setPayTarget] = useState<InvoiceListItem | null>(null);
    const { promptSelect } = usePrompt();

    const params = {
        page, pageSize: PAGE_SIZE,
        search: search || undefined,
        status: (status || undefined) as InvoiceStatus | undefined,
        sortBy: sort?.id, sortDir: sort?.dir,
    };

    const query = useQuery({ queryKey: ['accounting', 'ap', params], queryFn: () => apApi.list(params) });
    const agingQuery = useQuery({ queryKey: ['accounting', 'ap', 'aging'], queryFn: apApi.agingSummary });
    const a = agingQuery.data;
    const failed = agingQuery.isError;

    const columns = useMemo<DataTableColumn<InvoiceListItem>[]>(() => [
        { id: 'invoiceNumber', header: 'Số hoá đơn', sortable: true, locked: true, cell: (r) => <span className="num font-medium text-fg">{r.invoiceNumber}</span> },
        { id: 'issueDate', header: 'Ngày lập', sortable: true, cell: (r) => <span className="num">{formatVnDate(r.issueDate)}</span> },
        { id: 'dueDate', header: 'Hạn trả', sortable: true, cell: (r) => <span className="num">{formatVnDate(r.dueDate)}</span> },
        { id: 'totalAmount', header: 'Giá trị', align: 'right', sortable: true, cell: (r) => <Money value={r.totalAmount} /> },
        { id: 'paidAmount', header: 'Đã trả', align: 'right', cell: (r) => <Money value={r.paidAmount} /> },
        { id: 'outstandingAmount', header: 'Còn phải trả', align: 'right', cell: (r) => <Money value={r.outstandingAmount} /> },
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
        {
            id: 'actions', header: '', locked: true, width: '1%',
            cell: (r) => (
                <RowActions>
                    <Can permission={PERMISSIONS.ACCOUNTING_CREATE_INVOICE}>
                        {r.outstandingAmount > 0 && r.status !== 'Cancelled' && (
                            <IconButton
                                aria-label={`Ghi nhận thanh toán ${r.invoiceNumber}`} variant="ghost"
                                onClick={(e) => { e.stopPropagation(); setPayTarget(r); }}
                            >
                                <Wallet size={16} aria-hidden />
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
                title="Công nợ phải trả"
                description="Hoá đơn mua vào từ nhà cung cấp. Giá nhà cung cấp là giá CHƯA thuế."
                breadcrumbs={[{ label: 'Tài chính', to: '/backoffice/accounting' }, { label: 'Công nợ phải trả' }]}
                actions={
                    <Can permission={PERMISSIONS.ACCOUNTING_CREATE_INVOICE}>
                        <Button onClick={() => navigate('/backoffice/inventory/purchase-orders')} variant="outline">
                            <Plus size={16} aria-hidden /> Từ đơn mua hàng
                        </Button>
                    </Can>
                }
            />

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Trong hạn" value={failed || !a ? null : formatCurrency(a.current)} />
                <StatCard label="1–30 ngày" value={failed || !a ? null : formatCurrency(a.days1To30)} />
                <StatCard label="31–60 ngày" value={failed || !a ? null : formatCurrency(a.days31To60)} />
                <StatCard label="61–90 ngày" value={failed || !a ? null : formatCurrency(a.days61To90)} />
                <StatCard label="Trên 90 ngày" value={failed || !a ? null : formatCurrency(a.over90Days)} />
                <StatCard label="Tổng phải trả" value={failed || !a ? null : formatCurrency(a.totalOutstanding)} icon={CreditCard} />
            </div>
            {failed && (
                <p className="text-sm text-danger">
                    Không tải được bảng tuổi nợ phải trả.
                    <Button variant="ghost" size="sm" onClick={() => agingQuery.refetch()}>Thử lại</Button>
                </p>
            )}

            <Card className="p-4">
                <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}>
                    <Input label="Tìm kiếm" placeholder="Số hoá đơn hoặc nhà cung cấp" icon={Search}
                        value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="sm:flex-1" />
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
                caption="Danh sách công nợ phải trả"
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
                    icon: CreditCard,
                    title: 'Không có công nợ phải trả',
                    description: 'Hoá đơn mua vào được tạo tự động khi nhập kho một đơn mua hàng.',
                }}
                pagination={<Pagination page={page} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPageChange={setPage} />}
            />

            <CrudFormDialog<ApplyPaymentFormData>
                open={payTarget !== null}
                onOpenChange={(o) => { if (!o) setPayTarget(null); }}
                title={`Thanh toán nhà cung cấp ${payTarget?.invoiceNumber ?? ''}`}
                description={payTarget ? `Còn phải trả ${new Intl.NumberFormat('vi-VN').format(payTarget.outstandingAmount)} ₫` : undefined}
                schema={applyPaymentSchema}
                defaultValues={{ amount: payTarget?.outstandingAmount ?? 0, notes: '' }}
                submitLabel="Ghi nhận thanh toán"
                knownFields={['amount', 'notes']}
                onSubmit={async (data) => {
                    if (!payTarget) return;
                    const method = await promptSelect({ title: 'Hình thức thanh toán', options: PAYMENT_METHODS });
                    if (method === null) return;
                    await apApi.applyPayment(payTarget.id, {
                        amount: data.amount, paymentMethod: method, reference: data.notes || undefined,
                    });
                    notify.success('Đã ghi nhận thanh toán');
                    setPayTarget(null);
                    queryClient.invalidateQueries({ queryKey: ['accounting', 'ap'] });
                }}
            >
                {(form) => (
                    <>
                        <MoneyField name="amount" control={form.control} label="Số tiền trả" max={payTarget?.outstandingAmount} />
                        <TextField name="notes" control={form.control} label="Chứng từ tham chiếu" />
                    </>
                )}
            </CrudFormDialog>
        </div>
    );
};

export default APPage;
