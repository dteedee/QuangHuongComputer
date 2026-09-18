/**
 * Chi phí (W3-13) — contract §7. Rebuilt on the UI kit + form kit.
 *
 * What changed: the wave-0 page could only create and approve; there was no way
 * to correct a wrong amount. `PUT /expenses/{id}` exists, so editing is wired
 * here and offered while the row is still Draft/Pending (an approved or paid
 * expense is an accounting document, not a draft). There is NO delete endpoint
 * on the server — the page does not pretend otherwise (integration request #3).
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Receipt, Search, Wallet, X } from 'lucide-react';
import {
    Button, Card, DataTable, IconButton, Input, Money, PageHeader, Pagination, RowActions,
    Select, StatCard, StatusBadge, notify, type DataTableColumn, type SortState,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePrompt } from '../../../context/ConfirmContext';
import {
    expenseCategoriesApi, expenseStatusLabel, expensesApi, formatCurrency, formatVnDate,
    type Expense, type ExpenseStatus,
} from '../../../api/accounting';
import { ExpenseFormDialog } from './expense-form-dialog';

const PAGE_SIZE = 20;
const EDITABLE: ExpenseStatus[] = ['Draft', 'Pending'];

export const ExpensesPage = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState<SortState | null>({ id: 'expenseDate', dir: 'desc' });
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Expense | null>(null);
    const { promptText, promptSelect } = usePrompt();

    const params = {
        page, pageSize: PAGE_SIZE,
        search: search || undefined,
        status: (status || undefined) as ExpenseStatus | undefined,
        sortBy: sort?.id as 'expenseNumber' | 'expenseDate' | 'totalAmount' | undefined,
        sortDir: sort?.dir,
    };

    const query = useQuery({ queryKey: ['accounting', 'expenses', params], queryFn: () => expensesApi.list(params) });
    const summaryQuery = useQuery({ queryKey: ['accounting', 'expenses', 'summary'], queryFn: () => expensesApi.summary() });
    const categoriesQuery = useQuery({ queryKey: ['accounting', 'expense-categories'], queryFn: () => expenseCategoriesApi.list() });

    const categoryOptions = (categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }));
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['accounting', 'expenses'] });

    const approve = async (row: Expense) => {
        try {
            await expensesApi.approve(row.id);
            notify.success('Đã duyệt khoản chi', { description: row.expenseNumber });
            refresh();
        } catch { notify.error('Không duyệt được khoản chi'); }
    };

    const reject = async (row: Expense) => {
        const reason = await promptText({ title: 'Từ chối khoản chi', message: 'Nhập lý do từ chối', required: true });
        if (reason === null) return;
        try {
            await expensesApi.reject(row.id, reason);
            notify.success('Đã từ chối khoản chi');
            refresh();
        } catch { notify.error('Không từ chối được khoản chi'); }
    };

    const pay = async (row: Expense) => {
        const method = await promptSelect({
            title: 'Chi trả khoản chi',
            message: 'Chọn hình thức chi. Chi bằng tiền mặt sẽ tự sinh phiếu chi vào sổ quỹ.',
            options: [
                { value: 'Cash', label: 'Tiền mặt' },
                { value: 'BankTransfer', label: 'Chuyển khoản' },
                { value: 'Card', label: 'Thẻ' },
            ],
        });
        if (method === null) return;
        try {
            await expensesApi.pay(row.id, { paymentMethod: method });
            notify.success('Đã ghi nhận chi trả');
            refresh();
            queryClient.invalidateQueries({ queryKey: ['accounting', 'cash-book'] });
        } catch { notify.error('Không ghi nhận được chi trả'); }
    };

    const columns = useMemo<DataTableColumn<Expense>[]>(() => [
        { id: 'expenseNumber', header: 'Số chứng từ', sortable: true, locked: true, cell: (r) => <span className="num font-medium text-fg">{r.expenseNumber}</span> },
        { id: 'expenseDate', header: 'Ngày chi', sortable: true, cell: (r) => <span className="num">{formatVnDate(r.expenseDate)}</span> },
        { id: 'categoryName', header: 'Nhóm', cell: (r) => r.categoryName ?? '—' },
        { id: 'description', header: 'Diễn giải', nowrap: false, cell: (r) => <span className="text-fg-muted">{r.description}</span> },
        { id: 'amount', header: 'Chưa thuế', align: 'right', defaultHidden: true, cell: (r) => <Money value={r.amount} /> },
        { id: 'vatAmount', header: 'Thuế GTGT', align: 'right', defaultHidden: true, cell: (r) => <Money value={r.vatAmount} /> },
        { id: 'totalAmount', header: 'Tổng tiền', align: 'right', sortable: true, cell: (r) => <Money value={r.totalAmount} /> },
        {
            id: 'status', header: 'Trạng thái', locked: true,
            cell: (r) => <StatusBadge tone={expenseStatusLabel[r.status]?.tone ?? 'neutral'}>
                {expenseStatusLabel[r.status]?.label ?? r.status}
            </StatusBadge>,
        },
        {
            id: 'actions', header: '', locked: true, width: '1%',
            cell: (r) => (
                <RowActions>
                    {EDITABLE.includes(r.status) && (
                        <IconButton
                            aria-label={`Sửa khoản chi ${r.expenseNumber}`} variant="ghost"
                            onClick={() => { setEditing(r); setFormOpen(true); }}
                        >
                            <Pencil size={16} aria-hidden />
                        </IconButton>
                    )}
                    <Can permission={PERMISSIONS.ACCOUNTING_MANAGE_EXPENSE}>
                        {(r.status === 'Draft' || r.status === 'Pending') && (
                            <>
                                <IconButton aria-label={`Duyệt ${r.expenseNumber}`} variant="ghost" onClick={() => approve(r)}>
                                    <Check size={16} aria-hidden />
                                </IconButton>
                                <IconButton aria-label={`Từ chối ${r.expenseNumber}`} variant="ghost" onClick={() => reject(r)}>
                                    <X size={16} aria-hidden />
                                </IconButton>
                            </>
                        )}
                        {r.status === 'Approved' && (
                            <IconButton aria-label={`Chi trả ${r.expenseNumber}`} variant="ghost" onClick={() => pay(r)}>
                                <Wallet size={16} aria-hidden />
                            </IconButton>
                        )}
                    </Can>
                </RowActions>
            ),
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], []);

    return (
        <div className="space-y-5">
            <PageHeader
                title="Chi phí"
                description="Ghi nhận, duyệt và chi trả các khoản chi của cửa hàng."
                breadcrumbs={[{ label: 'Tài chính', to: '/backoffice/accounting' }, { label: 'Chi phí' }]}
                actions={
                    <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                        <Plus size={16} aria-hidden /> Thêm khoản chi
                    </Button>
                }
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Tổng chi (toàn kỳ)" value={summaryQuery.isError || summaryQuery.data === undefined ? null : formatCurrency(summaryQuery.data.totalAmount)} />
                <StatCard label="Số chứng từ" value={summaryQuery.isError ? null : summaryQuery.data?.totalCount ?? null} />
                <StatCard label="Nhóm chi phí" value={categoriesQuery.isError ? null : categoriesQuery.data?.length ?? null} />
            </div>

            {summaryQuery.isError && (
                <p className="text-sm text-danger">
                    Không đọc được tổng hợp chi phí — hai ô trên hiện dấu "—" thay vì 0.
                    <Button variant="ghost" size="sm" onClick={() => summaryQuery.refetch()}>Thử lại</Button>
                </p>
            )}
            {!categoriesQuery.isPending && !categoriesQuery.isError && (categoriesQuery.data?.length ?? 0) === 0 && (
                <p className="text-sm text-warning">
                    Chưa có nhóm chi phí nào trong hệ thống nên không thể tạo khoản chi.
                    Cần seed danh mục chi phí ở phía máy chủ (integration request W3-13 #39).
                </p>
            )}

            <Card className="p-4">
                <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}>
                    <Input
                        label="Tìm kiếm" placeholder="Số chứng từ hoặc diễn giải" icon={Search}
                        value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="sm:flex-1"
                    />
                    <Select
                        label="Trạng thái" className="sm:w-48" value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        options={[
                            { value: '', label: 'Tất cả' },
                            ...(Object.keys(expenseStatusLabel) as ExpenseStatus[]).map((s) => ({ value: s, label: expenseStatusLabel[s].label })),
                        ]}
                    />
                    <Button type="submit" variant="outline">Lọc</Button>
                </form>
            </Card>

            <DataTable
                caption="Danh sách khoản chi"
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
                empty={{
                    icon: Receipt,
                    title: 'Chưa có khoản chi nào',
                    description: 'Ghi nhận chi phí thuê mặt bằng, điện nước, vận chuyển… để báo cáo thuế TNDN đủ chi phí được trừ.',
                    action: { label: 'Thêm khoản chi', onClick: () => { setEditing(null); setFormOpen(true); } },
                }}
                pagination={<Pagination page={page} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPageChange={setPage} />}
            />

            <ExpenseFormDialog
                open={formOpen}
                onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
                editing={editing}
                categoryOptions={categoryOptions}
                onSaved={() => { setFormOpen(false); setEditing(null); refresh(); }}
            />
        </div>
    );
};

export default ExpensesPage;
