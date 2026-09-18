/**
 * Hành động trên một hoá đơn: phát hành, huỷ, lập giấy báo có, xem bản in,
 * và ghi nhận hoá đơn điện tử (D07).
 *
 * Every guard here mirrors a documented server rule, it does not replace it:
 * cancel is refused once `paidAmount > 0` (a credit note is the correct
 * document), issue is refused twice, and the e-invoice actions are disabled in
 * `External`/`Off` mode because the server answers 400 there.
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ban, FileCheck2, Printer, ReceiptText } from 'lucide-react';
import { Button, Dialog, SafeHtml, Skeleton, StatusBadge, notify } from '../../../components/ui';
import { CrudFormDialog, MoneyField, SelectField, TextField } from '../../../components/form';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { creditNotesApi, einvoiceApi, invoicesApi, type InvoiceDetail } from '../../../api/accounting';
import {
    cancelInvoiceSchema, creditNoteSchema, recordExternalEInvoiceSchema,
    type CancelInvoiceFormData, type CreditNoteFormData, type RecordExternalEInvoiceFormData,
} from './accounting-schemas';

const REASON_OPTIONS = [
    { value: 'Return', label: 'Trả hàng' },
    { value: 'Refund', label: 'Hoàn tiền' },
    { value: 'OrderCancelled', label: 'Huỷ đơn hàng' },
    { value: 'PriceAdjustment', label: 'Điều chỉnh giá' },
    { value: 'Other', label: 'Khác' },
];

export interface InvoiceDetailActionsProps {
    invoice: InvoiceDetail;
    printOpen: boolean;
    onPrintOpenChange: (open: boolean) => void;
    onChanged: () => void;
}

export const InvoiceDetailActions = ({ invoice, printOpen, onPrintOpenChange, onChanged }: InvoiceDetailActionsProps) => {
    const [cancelOpen, setCancelOpen] = useState(false);
    const [creditOpen, setCreditOpen] = useState(false);
    const [recordOpen, setRecordOpen] = useState(false);

    const modeQuery = useQuery({ queryKey: ['accounting', 'einvoice', 'mode'], queryFn: einvoiceApi.mode });
    const printQuery = useQuery({
        queryKey: ['accounting', 'invoices', 'html', invoice.id],
        queryFn: () => invoicesApi.html(invoice.id),
        enabled: printOpen,
    });

    const issueMutation = useMutation({
        mutationFn: () => invoicesApi.issue(invoice.id),
        onSuccess: () => { notify.success('Đã phát hành hoá đơn'); onChanged(); },
        onError: (e: unknown) => notify.error('Không phát hành được hoá đơn', { description: describe(e) }),
    });

    const mode = modeQuery.data;
    const canIssueEInvoice = mode?.mode === 'Sandbox' || mode?.mode === 'Live';

    const issueEInvoice = useMutation({
        mutationFn: () => einvoiceApi.issue(invoice.id),
        onSuccess: (res) => {
            notify.success(res.isSandbox ? 'Đã phát hành HĐĐT mô phỏng' : 'Đã phát hành hoá đơn điện tử', {
                description: [res.series, res.number].filter(Boolean).join(' · ') || undefined,
            });
            onChanged();
        },
        onError: (e: unknown) => notify.error('Không phát hành được HĐĐT', { description: describe(e) }),
    });

    return (
        <div className="flex flex-wrap items-center gap-2">
            {mode && (
                <StatusBadge tone={mode.isSandbox ? 'danger' : mode.mode === 'Live' ? 'success' : 'info'}>
                    {mode.isSandbox ? 'HĐĐT: SANDBOX (mô phỏng)' : mode.mode === 'Live' ? 'HĐĐT: LIVE' : 'HĐĐT: ghi nhận ngoài'}
                </StatusBadge>
            )}

            <Button variant="outline" onClick={() => onPrintOpenChange(true)}>
                <Printer size={16} aria-hidden /> Bản in
            </Button>

            <Can permission={PERMISSIONS.ACCOUNTING_CREATE_INVOICE}>
                {invoice.status === 'Draft' && (
                    <Button loading={issueMutation.isPending} onClick={() => issueMutation.mutate()}>
                        <FileCheck2 size={16} aria-hidden /> Phát hành
                    </Button>
                )}
                {invoice.status !== 'Cancelled' && invoice.paidAmount === 0 && (
                    <Button variant="danger" onClick={() => setCancelOpen(true)}>
                        <Ban size={16} aria-hidden /> Huỷ hoá đơn
                    </Button>
                )}
                {invoice.status !== 'Draft' && invoice.status !== 'Cancelled' && (
                    <Button variant="outline" onClick={() => setCreditOpen(true)}>
                        <ReceiptText size={16} aria-hidden /> Lập giấy báo có
                    </Button>
                )}
            </Can>

            <Can permission={PERMISSIONS.ACCOUNTING_MANAGE_INVOICES}>
                {invoice.type === 'Receivable' && invoice.status !== 'Draft' && invoice.status !== 'Cancelled' && (
                    canIssueEInvoice ? (
                        <Button variant="outline" loading={issueEInvoice.isPending} onClick={() => issueEInvoice.mutate()}>
                            Phát hành HĐĐT{mode?.isSandbox ? ' (mô phỏng)' : ''}
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => setRecordOpen(true)}>
                            Ghi nhận HĐĐT đã xuất
                        </Button>
                    )
                )}
            </Can>

            <Dialog open={printOpen} onOpenChange={onPrintOpenChange} title={`Bản in hoá đơn ${invoice.invoiceNumber}`} size="lg">
                {printQuery.isPending && <Skeleton className="h-96 w-full" />}
                {printQuery.isError && (
                    <p className="text-sm text-danger">Không tải được bản in. Hãy thử lại hoặc kiểm tra quyền xem hoá đơn.</p>
                )}
                {printQuery.data && <SafeHtml html={printQuery.data} />}
            </Dialog>

            <CrudFormDialog<CancelInvoiceFormData>
                open={cancelOpen} onOpenChange={setCancelOpen}
                title="Huỷ hoá đơn"
                description="Chỉ huỷ được hoá đơn chưa thu tiền. Hoá đơn đã thu phải lập giấy báo có."
                schema={cancelInvoiceSchema} defaultValues={{ reason: '' }} submitLabel="Huỷ hoá đơn"
                onSubmit={async (data) => {
                    await invoicesApi.cancel(invoice.id, data.reason);
                    notify.success('Đã huỷ hoá đơn');
                    setCancelOpen(false);
                    onChanged();
                }}
            >
                {(form) => <TextField name="reason" control={form.control} label="Lý do huỷ" required />}
            </CrudFormDialog>

            <CrudFormDialog<CreditNoteFormData>
                open={creditOpen} onOpenChange={setCreditOpen}
                title="Lập giấy báo có"
                description={`Ghi giảm cho hoá đơn ${invoice.invoiceNumber}. Tổng ghi giảm không vượt quá giá trị hoá đơn gốc.`}
                schema={creditNoteSchema}
                defaultValues={{ amount: invoice.outstandingAmount || invoice.totalAmount, reasonCode: 'Return', reason: '' }}
                submitLabel="Lập giấy báo có"
                knownFields={['amount', 'reason', 'reasonCode']}
                onSubmit={async (data) => {
                    await creditNotesApi.create({ originalInvoiceId: invoice.id, ...data });
                    notify.success('Đã lập giấy báo có');
                    setCreditOpen(false);
                    onChanged();
                }}
            >
                {(form) => (
                    <>
                        <MoneyField name="amount" control={form.control} label="Số tiền ghi giảm" max={invoice.totalAmount} />
                        <SelectField name="reasonCode" control={form.control} label="Lý do" options={REASON_OPTIONS} />
                        <TextField name="reason" control={form.control} label="Diễn giải" required />
                    </>
                )}
            </CrudFormDialog>

            <CrudFormDialog<RecordExternalEInvoiceFormData>
                open={recordOpen} onOpenChange={setRecordOpen}
                title="Ghi nhận hoá đơn điện tử đã xuất"
                description="Nhập ký hiệu và số hoá đơn đã phát hành trên phần mềm của nhà cung cấp."
                schema={recordExternalEInvoiceSchema}
                defaultValues={{ series: '', number: '', lookupCode: '', issuedAt: '' }}
                submitLabel="Ghi nhận"
                knownFields={['series', 'number', 'lookupCode', 'issuedAt']}
                onSubmit={async (data) => {
                    await einvoiceApi.recordExternal(invoice.id, {
                        series: data.series, number: data.number,
                        lookupCode: data.lookupCode || undefined,
                        issuedAt: data.issuedAt || undefined,
                    });
                    notify.success('Đã ghi nhận hoá đơn điện tử');
                    setRecordOpen(false);
                    onChanged();
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

/** Pull the Vietnamese message the API already returned; never invent one. */
function describe(err: unknown): string | undefined {
    const e = err as { normalized?: { message?: string }; response?: { data?: { message?: string; error?: string } } };
    return e?.normalized?.message ?? e?.response?.data?.message ?? e?.response?.data?.error;
}
