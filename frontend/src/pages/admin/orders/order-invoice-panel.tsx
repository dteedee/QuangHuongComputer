/**
 * D07 — invoice number, lookup code, e-invoice status on the order; admin
 * can correct the buyer's details until the invoice is issued/recorded.
 *
 * The admin-orders detail endpoint does not carry invoice fields
 * (`docs/api-contracts/sales-pos-returns-loyalty.md` §4 lists no `invoice`
 * key) — this panel looks the invoice up itself: `invoicesApi.list({search:
 * orderNumber})` (accounting.md §1) then `einvoiceApi.status` for the
 * e-invoice status + lookup code (accounting-einvoice.md). Filed as IR
 * w3#(see report) asking W2-10/W2-24 to fold this into the order detail
 * response directly instead of two extra round-trips per order.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FileText, Loader2, Pencil } from 'lucide-react';
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

export const OrderInvoicePanel = ({ orderNumber }: { orderNumber: string }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<InvoiceBuyer>({});
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
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ['order-invoice-lookup', orderNumber] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.error || 'Hoá đơn đã xuất, không thể sửa thông tin người mua'),
    });

    if (invoiceQuery.isLoading) return <Loader2 className="animate-spin text-gray-300" size={18} />;
    if (!invoiceQuery.data) return null; // chưa có hoá đơn cho đơn này — không hiện panel

    const { detail, eStatus } = invoiceQuery.data;
    const isLocked = eStatus ? LOCKED_STATUSES.has(eStatus.status) : detail.status !== 'Draft';
    const buyer = detail.buyer ?? {};

    return (
        <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 uppercase flex items-center gap-2">
                    <FileText size={14} className="text-accent" /> Hoá đơn
                </h3>
                <Can permission={PERMISSIONS.ACCOUNTING_EDIT_INVOICE}>
                    {!isLocked && !editing && (
                        <button onClick={() => { setForm(buyer); setEditing(true); }} className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                            <Pencil size={12} /> Sửa thông tin người mua
                        </button>
                    )}
                </Can>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-[10px] text-gray-400 uppercase">Số hoá đơn</p><p className="font-bold text-gray-900 dark:text-gray-100">{detail.invoiceNumber}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">Mã tra cứu</p><p className="font-bold text-gray-900 dark:text-gray-100">{eStatus?.lookupCode || '—'}</p></div>
                <div className="col-span-2"><p className="text-[10px] text-gray-400 uppercase">Trạng thái HĐĐT</p><p className="font-bold text-gray-900 dark:text-gray-100">{EINVOICE_STATUS_LABEL[eStatus?.status ?? ''] ?? 'Chưa xuất HĐĐT'}</p></div>
            </div>

            {editing ? (
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <input placeholder="Tên người mua" value={form.legalName ?? form.fullName ?? ''} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value, fullName: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-gray-900 rounded-lg text-sm" />
                    <input placeholder="Mã số thuế" value={form.taxCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, taxCode: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-gray-900 rounded-lg text-sm" />
                    <input placeholder="Địa chỉ" value={form.address ?? ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-gray-900 rounded-lg text-sm" />
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => setEditing(false)} className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg text-xs font-semibold">Hủy</button>
                        <button onClick={() => updateBuyerMutation.mutate(form)} disabled={updateBuyerMutation.isPending} className="flex-1 px-3 py-2 bg-accent text-white rounded-lg text-xs font-semibold disabled:opacity-50">Lưu</button>
                    </div>
                </div>
            ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {buyer.legalName || buyer.fullName || 'Khách hàng cá nhân'}{buyer.taxCode ? ` · MST ${buyer.taxCode}` : ''}
                </p>
            )}
            {isLocked && <p className="text-[10px] text-gray-400 italic">Hoá đơn đã phát hành — không thể sửa thông tin người mua.</p>}
        </div>
    );
};
