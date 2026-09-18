/**
 * Thu tiền tại quầy: tiền mặt (có tiền thối), máy quẹt thẻ, chuyển khoản VietQR — chia nhiều lần
 * thu trên cùng một đơn. Danh sách hình thức KHÔNG hardcode: chuyển khoản chỉ hiện khi
 * `/api/payments/methods` có `bank_transfer` (D04). Thu thiếu tổng đơn = đặt cọc (D10 quy tắc 9),
 * cần quyền `Sales.TakeDeposit` và in phiếu thu, không phải hoá đơn.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote, CreditCard, QrCode } from 'lucide-react';
import { Badge, Button, Dialog, IconButton, Input, Money, Select } from '../../../components/ui';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';
import client from '../../../api/client';
import type { PosTender, PosTenderMethod } from '../../../api/sales/pos';

interface PaymentMethodRow { code: string; name: string }

interface PosTenderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    total: number;
    submitting: boolean;
    onConfirm: (tenders: PosTender[]) => void;
}

interface TenderDraft extends PosTender { key: string }

const METHOD_LABELS: Record<PosTenderMethod, string> = {
    Cash: 'Tiền mặt',
    Card: 'Máy quẹt thẻ',
    Transfer: 'Chuyển khoản VietQR',
    SePay: 'SePay',
};

const newDraft = (method: PosTenderMethod, amount: number): TenderDraft => ({
    key: `${method}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    method, amount, tenderedAmount: method === 'Cash' ? amount : 0, reference: '',
});

export default function PosTenderModal({ open, onOpenChange, total, submitting, onConfirm }: PosTenderModalProps) {
    const { hasPermission } = usePermissions();
    const [drafts, setDrafts] = useState<TenderDraft[]>([]);

    const methodsQuery = useQuery({
        queryKey: ['payments', 'methods'],
        queryFn: async () => (await client.get<PaymentMethodRow[]>('/payments/methods')).data,
        staleTime: 5 * 60 * 1000,
    });

    const available = useMemo<PosTenderMethod[]>(() => {
        const codes = new Set((methodsQuery.data ?? []).map((m) => m.code));
        const list: PosTenderMethod[] = ['Cash', 'Card'];
        if (codes.has('bank_transfer')) list.push('Transfer');
        return list;
    }, [methodsQuery.data]);

    const rows = drafts.length > 0 ? drafts : [newDraft('Cash', total)];
    const collected = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const due = total - collected;
    const cashTendered = rows.filter((r) => r.method === 'Cash').reduce((s, r) => s + (Number(r.tenderedAmount) || 0), 0);
    const cashAmount = rows.filter((r) => r.method === 'Cash').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const changeDue = Math.max(0, cashTendered - cashAmount);

    const isDeposit = due > 0;
    const mayDeposit = hasPermission(PERMISSIONS.SALES_TAKE_DEPOSIT);
    const missingReference = rows.some((r) => r.method !== 'Cash' && !r.reference?.trim());
    const blocked = collected <= 0 || due < 0 || missingReference || (isDeposit && !mayDeposit);

    const update = (key: string, patch: Partial<TenderDraft>) =>
        setDrafts(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

    const confirm = () => onConfirm(rows.map((t) => ({
        method: t.method,
        amount: Number(t.amount) || 0,
        tenderedAmount: t.method === 'Cash' ? Number(t.tenderedAmount) || 0 : 0,
        reference: t.reference?.trim() || null,
    })));

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            title="Thu tiền"
            description={`Tổng đơn ${total.toLocaleString('vi-VN')}đ`}
            size="md"
            footer={
                <div className="flex w-full items-center justify-between gap-3">
                    <div className="text-sm">
                        {changeDue > 0 && <span className="font-semibold text-success">Tiền thối <Money value={changeDue} /></span>}
                        {isDeposit && <span className="font-semibold text-warning">Còn thiếu <Money value={due} /></span>}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
                        <Button onClick={confirm} loading={submitting} disabled={blocked}>
                            {isDeposit ? 'Nhận đặt cọc' : 'Hoàn tất'}
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {available.map((m) => (
                        <Button key={m} size="sm" variant="outline" onClick={() => setDrafts([...rows, newDraft(m, Math.max(0, due))])}>
                            {m === 'Cash' ? <Banknote size={16} /> : m === 'Card' ? <CreditCard size={16} /> : <QrCode size={16} />}
                            Thêm {METHOD_LABELS[m]}
                        </Button>
                    ))}
                </div>

                <ul className="space-y-3">
                    {rows.map((r) => (
                        <li key={r.key} className="rounded-lg border border-line p-3">
                            <div className="flex items-center justify-between gap-2">
                                <Select
                                    aria-label="Hình thức thanh toán"
                                    value={r.method}
                                    onChange={(e) => update(r.key, { method: e.target.value as PosTenderMethod })}
                                    options={available.map((m) => ({ value: m, label: METHOD_LABELS[m] }))}
                                />
                                {rows.length > 1 && (
                                    <IconButton
                                        aria-label="Bỏ dòng thu tiền này"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDrafts(rows.filter((x) => x.key !== r.key))}
                                    >
                                        ×
                                    </IconButton>
                                )}
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                <Input
                                    label="Ghi nhận vào đơn (đ)"
                                    type="number"
                                    min={0}
                                    value={r.amount || ''}
                                    onChange={(e) => update(r.key, { amount: Number(e.target.value) || 0 })}
                                />
                                {r.method === 'Cash' ? (
                                    <Input
                                        label="Khách đưa (đ)"
                                        type="number"
                                        min={0}
                                        value={r.tenderedAmount || ''}
                                        onChange={(e) => update(r.key, { tenderedAmount: Number(e.target.value) || 0 })}
                                    />
                                ) : (
                                    <Input
                                        label="Mã đối soát"
                                        required
                                        value={r.reference ?? ''}
                                        error={!r.reference?.trim() ? 'Bắt buộc với thẻ / chuyển khoản' : undefined}
                                        onChange={(e) => update(r.key, { reference: e.target.value })}
                                    />
                                )}
                            </div>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center justify-between rounded-lg bg-sunken p-3 text-sm">
                    <span className="text-fg-muted">Đã thu</span>
                    <Money value={collected} className="font-semibold" />
                </div>

                {due < 0 && <Badge variant="danger">Thu dư tổng đơn — server sẽ từ chối. Giảm số tiền ghi nhận.</Badge>}
                {isDeposit && !mayDeposit && (
                    <Badge variant="danger">Thu thiếu là đặt cọc — tài khoản này không có quyền Sales.TakeDeposit.</Badge>
                )}
                {isDeposit && mayDeposit && (
                    <Badge variant="warning">Đặt cọc: in phiếu thu, chưa xuất hoá đơn và chưa giao hàng.</Badge>
                )}
            </div>
        </Dialog>
    );
}
