/**
 * Hoá đơn điện tử (D07) — `docs/api-contracts/accounting-einvoice.md`.
 *
 * Ba việc màn hình này phải làm đúng:
 *  1. Badge chế độ: SANDBOX hiện ĐỎ kèm chữ "mô phỏng", External/Live hiện đúng
 *     tên chế độ. Không bao giờ giấu việc dữ liệu là mô phỏng.
 *  2. Hàng đợi chờ xuất, cũ nhất trước, cảnh báo khi quá hạn `queueWarningDays`.
 *  3. Ghi nhận hoá đơn đã xuất ngoài (ký hiệu, số, mã tra cứu, ngày) và xuất
 *     Excel hàng đợi — cả hai đều là endpoint thật của máy chủ.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, FileSpreadsheet } from 'lucide-react';
import {
    Button, Card, CardBody, DataTable, Money, PageHeader, Pagination, StatCard, StatusBadge,
    Switch, notify, type DataTableColumn,
} from '../../../components/ui';
import { CrudFormDialog, TextField } from '../../../components/form';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { einvoiceApi, formatVnDate, type EInvoiceQueueItem } from '../../../api/accounting';
import { downloadBlob } from '../../../api/tax-reports';
import { recordExternalEInvoiceSchema, type RecordExternalEInvoiceFormData } from './accounting-schemas';

const PAGE_SIZE = 20;

export const EInvoicePage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [onlyLate, setOnlyLate] = useState(false);
    const [recordTarget, setRecordTarget] = useState<EInvoiceQueueItem | null>(null);
    const [exporting, setExporting] = useState(false);

    const modeQuery = useQuery({ queryKey: ['accounting', 'einvoice', 'mode'], queryFn: einvoiceApi.mode });
    const queueQuery = useQuery({
        queryKey: ['accounting', 'einvoice', 'queue', page, onlyLate],
        queryFn: () => einvoiceApi.queue({ page, pageSize: PAGE_SIZE, onlyLate }),
    });

    const mode = modeQuery.data;
    const lateCount = (queueQuery.data?.items ?? []).filter((i) => i.isLate).length;

    const exportQueue = async () => {
        setExporting(true);
        try {
            const blob = await einvoiceApi.exportQueue(onlyLate);
            const stamp = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()).replace(/-/g, '');
            downloadBlob(blob, `cho-xuat-hddt-${stamp}.xlsx`);
            notify.success('Đã tải tệp hàng đợi HĐĐT');
        } catch {
            notify.error('Không xuất được tệp', { description: 'Cần quyền xuất dữ liệu kế toán.' });
        } finally {
            setExporting(false);
        }
    };

    const columns = useMemo<DataTableColumn<EInvoiceQueueItem>[]>(() => [
        { id: 'invoiceNumber', header: 'Hoá đơn nội bộ', locked: true, cell: (r) => <span className="num font-medium text-fg">{r.invoiceNumber}</span> },
        { id: 'orderNumber', header: 'Đơn hàng', cell: (r) => <span className="num text-fg-muted">{r.orderNumber ?? '—'}</span> },
        { id: 'issueDate', header: 'Ngày lập', cell: (r) => <span className="num">{formatVnDate(r.issueDate)}</span> },
        {
            id: 'buyerName', header: 'Người mua', nowrap: false,
            cell: (r) => (
                <span>
                    {r.buyerName}
                    {r.buyerTaxCode && <span className="num block text-xs text-fg-subtle">MST {r.buyerTaxCode}</span>}
                    {r.isConsumer && <span className="block text-xs text-fg-subtle">Bán cho người tiêu dùng</span>}
                </span>
            ),
        },
        { id: 'totalNet', header: 'Chưa thuế', align: 'right', defaultHidden: true, cell: (r) => <Money value={r.totalNet} /> },
        { id: 'totalVat', header: 'Thuế GTGT', align: 'right', defaultHidden: true, cell: (r) => <Money value={r.totalVat} /> },
        { id: 'totalAmount', header: 'Tổng tiền', align: 'right', cell: (r) => <Money value={r.totalAmount} /> },
        {
            id: 'ageDays', header: 'Số ngày chờ', align: 'right',
            cell: (r) => (
                <span className={r.isLate ? 'text-danger' : 'text-fg-muted'}>
                    <span className="num">{r.ageDays}</span>
                    {r.isLate && <AlertTriangle size={14} className="ml-1 inline" aria-label="Quá hạn xuất hoá đơn" />}
                </span>
            ),
        },
        {
            id: 'eInvoiceStatus', header: 'Trạng thái HĐĐT', locked: true,
            cell: (r) => (
                <StatusBadge tone={r.eInvoiceStatus === 'Failed' ? 'danger' : r.eInvoiceStatus === 'Pending' ? 'warning' : 'neutral'}>
                    {r.eInvoiceStatus === 'NotIssued' ? 'Chưa xuất'
                        : r.eInvoiceStatus === 'Pending' ? 'Đang xử lý'
                        : r.eInvoiceStatus === 'Failed' ? 'Xuất lỗi' : r.eInvoiceStatus}
                </StatusBadge>
            ),
        },
        {
            id: 'actions', header: '', locked: true, width: '1%',
            cell: (r) => (
                <Can permission={PERMISSIONS.ACCOUNTING_MANAGE_INVOICES}>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setRecordTarget(r); }}>
                        Ghi nhận
                    </Button>
                </Can>
            ),
        },
    ], []);

    return (
        <div className="space-y-5">
            <PageHeader
                title="Hoá đơn điện tử"
                description="Hàng đợi hoá đơn nội bộ chờ xuất hoá đơn điện tử."
                breadcrumbs={[{ label: 'Tài chính', to: '/backoffice/accounting' }, { label: 'Hoá đơn điện tử' }]}
                actions={
                    <Can permission={PERMISSIONS.ACCOUNTING_EXPORT}>
                        <Button variant="outline" loading={exporting} onClick={exportQueue}>
                            <FileSpreadsheet size={16} aria-hidden /> Xuất Excel hàng đợi
                        </Button>
                    </Can>
                }
            />

            {mode && (
                <Card>
                    <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <StatusBadge tone={mode.isSandbox ? 'danger' : mode.mode === 'Live' ? 'success' : 'info'}>
                                {mode.isSandbox ? 'SANDBOX — MÔ PHỎNG' : mode.mode === 'Live' ? 'LIVE' : 'EXTERNAL'}
                            </StatusBadge>
                            <p className="text-sm text-fg-muted">{mode.notice}</p>
                        </div>
                        <p className="shrink-0 text-xs text-fg-subtle">
                            Cảnh báo khi chờ quá <span className="num">{mode.queueWarningDays}</span> ngày
                        </p>
                    </CardBody>
                </Card>
            )}
            {modeQuery.isError && (
                <p className="text-sm text-danger">
                    Không đọc được chế độ hoá đơn điện tử — chưa thể khẳng định dữ liệu là thật hay mô phỏng.
                </p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Hoá đơn chờ xuất" value={queueQuery.isError ? null : queueQuery.data?.total ?? null} />
                <StatCard label="Quá hạn (trang này)" value={queueQuery.isError ? null : lateCount} icon={AlertTriangle} />
                <StatCard label="Chế độ" value={queueQuery.isError ? null : mode?.provider ?? null} />
            </div>

            <Card className="p-4">
                <Switch checked={onlyLate} onCheckedChange={(v) => { setOnlyLate(v); setPage(1); }} label="Chỉ hiện hoá đơn quá hạn" />
            </Card>

            <DataTable
                caption="Hàng đợi chờ xuất hoá đơn điện tử"
                columns={columns}
                rows={queueQuery.data?.items}
                rowKey={(r) => r.invoiceId}
                loading={queueQuery.isPending}
                error={queueQuery.error}
                onRetry={queueQuery.refetch}
                skeletonRows={8}
                enableColumnVisibility
                onRowClick={(r) => navigate(`/backoffice/accounting/invoices/${r.invoiceId}`)}
                empty={{
                    icon: Download,
                    title: 'Không còn hoá đơn nào chờ xuất',
                    description: 'Mọi hoá đơn bán ra đã phát hành đều đã có hoá đơn điện tử hoặc đã được ghi nhận.',
                }}
                pagination={<Pagination page={page} pageSize={PAGE_SIZE} total={queueQuery.data?.total ?? 0} onPageChange={setPage} />}
            />

            <CrudFormDialog<RecordExternalEInvoiceFormData>
                open={recordTarget !== null}
                onOpenChange={(o) => { if (!o) setRecordTarget(null); }}
                title={`Ghi nhận HĐĐT cho ${recordTarget?.invoiceNumber ?? ''}`}
                description="Nhập ký hiệu và số hoá đơn đã phát hành trên phần mềm của nhà cung cấp."
                schema={recordExternalEInvoiceSchema}
                defaultValues={{ series: '', number: '', lookupCode: '', issuedAt: '' }}
                submitLabel="Ghi nhận"
                knownFields={['series', 'number', 'lookupCode', 'issuedAt']}
                onSubmit={async (data) => {
                    if (!recordTarget) return;
                    await einvoiceApi.recordExternal(recordTarget.invoiceId, {
                        series: data.series, number: data.number,
                        lookupCode: data.lookupCode || undefined,
                        issuedAt: data.issuedAt || undefined,
                    });
                    notify.success('Đã ghi nhận hoá đơn điện tử');
                    setRecordTarget(null);
                    queryClient.invalidateQueries({ queryKey: ['accounting', 'einvoice'] });
                }}
            >
                {(form) => (
                    <>
                        <TextField name="series" control={form.control} label="Ký hiệu" required placeholder="1C26TQH" />
                        <TextField name="number" control={form.control} label="Số hoá đơn" required placeholder="00000123" />
                        <TextField name="lookupCode" control={form.control} label="Mã tra cứu" />
                        <TextField name="issuedAt" control={form.control} label="Ngày xuất" type="datetime-local" />
                    </>
                )}
            </CrudFormDialog>
        </div>
    );
};

export default EInvoicePage;
