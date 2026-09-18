/**
 * D07 — "Khách lấy hoá đơn công ty" ở quầy: thu thông tin người mua để kế toán phát hành HĐĐT.
 *
 * GIỚI HẠN ĐANG CÓ (đã ghi integration request W3-5#3): `POST /sales/pos/orders` chưa có trường
 * người mua, và `PUT /api/accounting/einvoice/{id}/buyer` đòi quyền `Accounting.EditInvoice` mà
 * thu ngân không có. Nên thông tin này đi kèm đơn qua `notes` — kế toán đọc được ngay trên đơn —
 * cho tới khi backend mở trường `invoiceBuyer`. Không bịa endpoint, không giả vờ đã xuất hoá đơn.
 */
import { useEffect, useState } from 'react';
import { Button, Dialog, Input } from '../../../components/ui';
import type { PosInvoiceBuyer } from './pos-invoice-buyer';

const EMPTY: PosInvoiceBuyer = { companyName: '', taxCode: '', address: '', email: '' };

interface PosInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: PosInvoiceBuyer | null;
    onSubmit: (buyer: PosInvoiceBuyer | null) => void;
}

export default function PosInvoiceDialog({ open, onOpenChange, value, onSubmit }: PosInvoiceDialogProps) {
    const [form, setForm] = useState<PosInvoiceBuyer>(value ?? EMPTY);
    useEffect(() => { if (open) setForm(value ?? EMPTY); }, [open, value]);

    const taxCodeValid = /^\d{10}(-\d{3})?$/.test(form.taxCode.trim());
    const valid = form.companyName.trim().length > 1 && taxCodeValid;

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            title="Hoá đơn công ty"
            description="Thông tin người mua đi kèm đơn để kế toán phát hành hoá đơn điện tử."
            size="md"
            footer={
                <div className="flex w-full justify-between">
                    <Button variant="ghost" onClick={() => { onSubmit(null); onOpenChange(false); }}>Bỏ xuất hoá đơn</Button>
                    <Button disabled={!valid} onClick={() => { onSubmit(form); onOpenChange(false); }}>Lưu vào đơn</Button>
                </div>
            }
        >
            <div className="space-y-3">
                <Input label="Tên công ty" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                <Input
                    label="Mã số thuế"
                    required
                    value={form.taxCode}
                    error={form.taxCode && !taxCodeValid ? 'MST gồm 10 số, chi nhánh thêm -3 số.' : undefined}
                    onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                />
                <Input label="Địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Input label="Email nhận hoá đơn" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
        </Dialog>
    );
}
