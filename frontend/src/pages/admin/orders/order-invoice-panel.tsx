/**
 * D07 — số hoá đơn, mã tra cứu, trạng thái HĐĐT của đơn; quản trị viên sửa
 * được thông tin người mua cho tới khi hoá đơn được phát hành/ghi nhận.
 *
 * Endpoint chi tiết admin-orders không mang trường hoá đơn
 * (`docs/api-contracts/sales-pos-returns-loyalty.md` §4 không có khoá
 * `invoice`) — panel này tự tra: `invoicesApi.list({search: orderNumber})`
 * (accounting.md §1) rồi `einvoiceApi.status` để lấy trạng thái + mã tra cứu
 * (accounting-einvoice.md). Đã mở IR w3#(xem báo cáo) đề nghị W2-10/W2-24 gộp
 * thẳng vào response chi tiết đơn thay vì hai vòng gọi thêm cho mỗi đơn.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FileText, Pencil } from 'lucide-react';
import { Button, Card, Input, SaveButton, Skeleton, type SaveStatus } from '../../../components/ui';
import { invoicesApi } from '../../../api/accounting/invoices';
import { einvoiceApi } from '../../../api/accounting/einvoice';
import type { InvoiceBuyer } from '../../../api/accounting/types';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';

const EINVOICE_STATUS_LABEL: Record<string, string> = {
    NotIssued: 'Chưa xuất HĐĐT',
    Issued: 'Đã xuất HĐĐT',
    ExternalRecorded: 'Đã ghi nhận (xuất ngoài)',
    Adjusted: 'Đã điều chỉnh',
    Replaced: 'Đã thay thế',
};

const LOCKED_STATUSES = new Set(['Issued', 'ExternalRecorded', 'Adjusted', 'Replaced']);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
        <p className="text-2xs text-fg-subtle">{label}</p>
        <p className="text-13 font-medium text-fg">{value}</p>
    </div>
);

export const OrderInvoicePanel = ({ orderNumber }: { orderNumber: string }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<InvoiceBuyer>({});
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [saveError, setSaveError] = useState('');
    const queryClient = useQueryClient();

    const invoiceQuery = useQuery({
        queryKey: ['order-invoice-lookup', orderNumber],
        queryFn: async () => {
            const list = await invoicesApi.list({ search: orderNumber, pageSize: 1 });
            const invoice = list.items?.[0];
            if (!invoice) return null;
            const [detail, eStatus] = await Promise.all([
                invoicesApi.get(invoice.id),
                einvoiceApi.status(invoice.id).catch(() => null),
            ]);
            return { detail, eStatus };
        },
    });

    const updateBuyerMutation = useMutation({
        mutationFn: (buyer: InvoiceBuyer) => einvoiceApi.updateBuyer(invoiceQuery.data!.detail.id, buyer),
        onSuccess: () => {
            toast.success('Đã cập nhật thông tin người mua!');
            /* §9.4: "Đã lưu" là dòng chữ, tự hết — form đóng ở `onDone`. */
            setSaveStatus('saved');
            queryClient.invalidateQueries({ queryKey: ['order-invoice-lookup', orderNumber] });
        },
        onError: (err: any) => {
            setSaveStatus('error');
            setSaveError(err?.response?.data?.error || 'Hoá đơn đã xuất, không thể sửa thông tin người mua');
        },
    });

    if (invoiceQuery.isLoading) return <Skeleton className="h-28 w-full" />;
    if (!invoiceQuery.data) return null; // chưa có hoá đơn cho đơn này — không hiện panel

    const { detail, eStatus } = invoiceQuery.data;
    const isLocked = eStatus ? LOCKED_STATUSES.has(eStatus.status) : detail.status !== 'Draft';
    const buyer = detail.buyer ?? {};

    return (
        <Card padded radius="xl" variant="flat" className="bg-sunken">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-13 font-semibold uppercase tracking-wider text-fg-subtle">
                        <FileText size={14} aria-hidden /> Hoá đơn
                    </h3>
                    <Can permission={PERMISSIONS.ACCOUNTING_EDIT_INVOICE}>
                        {!isLocked && !editing && (
                            <Button
                                size="sm"
                                variant="ghost"
                                icon={Pencil}
                                onClick={() => { setForm(buyer); setEditing(true); setSaveStatus('idle'); }}
                            >
                                Sửa thông tin người mua
                            </Button>
                        )}
                    </Can>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Số hoá đơn" value={<span className="num">{detail.invoiceNumber}</span>} />
                    <Field label="Mã tra cứu" value={<span className="num">{eStatus?.lookupCode || '—'}</span>} />
                    <div className="sm:col-span-2">
                        <Field
                            label="Trạng thái HĐĐT"
                            value={EINVOICE_STATUS_LABEL[eStatus?.status ?? ''] ?? 'Chưa xuất HĐĐT'}
                        />
                    </div>
                </div>

                {editing ? (
                    <div className="flex flex-col gap-3 border-t border-line pt-3">
                        <Input
                            label="Tên người mua"
                            inputSize="sm"
                            value={form.legalName ?? form.fullName ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value, fullName: e.target.value }))}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                                label="Mã số thuế"
                                inputSize="sm"
                                value={form.taxCode ?? ''}
                                onChange={(e) => setForm((f) => ({ ...f, taxCode: e.target.value }))}
                            />
                            <Input
                                label="Địa chỉ"
                                inputSize="sm"
                                value={form.address ?? ''}
                                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setSaveStatus('idle'); }}>
                                Huỷ
                            </Button>
                            <SaveButton
                                size="sm"
                                status={saveStatus}
                                errorMessage={saveError}
                                onClick={() => { setSaveStatus('saving'); updateBuyerMutation.mutate(form); }}
                                onDone={() => { setEditing(false); setSaveStatus('idle'); }}
                            />
                        </div>
                    </div>
                ) : (
                    <p className="text-13 text-fg-muted">
                        {buyer.legalName || buyer.fullName || 'Khách hàng cá nhân'}
                        {buyer.taxCode ? ` · MST ${buyer.taxCode}` : ''}
                    </p>
                )}

                {isLocked && (
                    <p className="text-2xs text-fg-subtle">
                        Hoá đơn đã phát hành — không thể sửa thông tin người mua.
                    </p>
                )}
            </div>
        </Card>
    );
};
