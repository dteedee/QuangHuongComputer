/**
 * "Nhận hàng" — the destination counts what actually arrived. Defaults to everything shipped;
 * a shortfall needs a note (server rule, StockTransfer.Receive). For serial lines the receiver
 * ticks the serials in hand — the count follows the ticks. Missing serials stay "Đang chuyển kho"
 * on the server so they can still be traced.
 */
import { useEffect, useState } from 'react';
import type { ReceiveTransferRequest, TransferLine } from '../../../../api/inventory-transfers';
import { Button, Checkbox, Dialog, Input, Textarea } from '../../../../components/ui';

interface TransferReceiveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lines: TransferLine[];
    submitting: boolean;
    onSubmit: (body: ReceiveTransferRequest) => void;
}

type Draft = Record<string, { qty: number; serials: string[] }>;

const fullDraft = (lines: TransferLine[]): Draft =>
    Object.fromEntries(lines.map((l) => [l.id, { qty: l.quantity, serials: [...l.serialNumbers] }]));

export function TransferReceiveDialog({ open, onOpenChange, lines, submitting, onSubmit }: TransferReceiveDialogProps) {
    const [draft, setDraft] = useState<Draft>(() => fullDraft(lines));
    const [note, setNote] = useState('');
    useEffect(() => { if (open) { setDraft(fullDraft(lines)); setNote(''); } }, [open, lines]);

    const short = lines.some((l) => (draft[l.id]?.qty ?? l.quantity) < l.quantity);
    const invalid = lines.some((l) => {
        const q = draft[l.id]?.qty ?? l.quantity;
        return !Number.isInteger(q) || q < 0 || q > l.quantity;
    });
    const noteMissing = short && note.trim().length === 0;

    const setQty = (id: string, qty: number) => setDraft((d) => ({ ...d, [id]: { ...d[id], qty } }));
    const toggleSerial = (id: string, serial: string, on: boolean) => setDraft((d) => {
        const serials = on ? [...d[id].serials, serial] : d[id].serials.filter((s) => s !== serial);
        return { ...d, [id]: { qty: serials.length, serials } };
    });

    const submit = () => onSubmit({
        note: note.trim() || undefined,
        lines: lines.map((l) => ({
            itemId: l.id,
            receivedQuantity: draft[l.id].qty,
            receivedSerials: l.serialNumbers.length > 0 ? draft[l.id].serials : undefined,
        })),
    });

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            title="Nhận hàng chuyển kho"
            description="Nhập số thực nhận. Nhận thiếu thì ghi rõ lý do để đối chiếu."
            size="lg"
            footer={(
                <>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Đóng</Button>
                    <Button onClick={submit} loading={submitting} disabled={invalid || noteMissing}>
                        {short ? 'Xác nhận nhận thiếu' : 'Xác nhận nhận đủ'}
                    </Button>
                </>
            )}
        >
            <div className="space-y-4">
                {lines.map((l) => (
                    <div key={l.id} className="rounded-lg border border-line p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-13 font-medium text-fg">{l.productName ?? l.productSku}</span>
                            <span className="num text-2xs text-fg-muted">Đã xuất {l.quantity}</span>
                        </div>
                        {l.serialNumbers.length > 0 ? (
                            <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                                {l.serialNumbers.map((s) => (
                                    <li key={s}>
                                        <Checkbox
                                            label={<span className="num text-13">{s}</span>}
                                            checked={draft[l.id]?.serials.includes(s) ?? true}
                                            onChange={(e) => toggleSerial(l.id, s, e.target.checked)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <Input
                                label="Số thực nhận"
                                type="number"
                                min={0}
                                max={l.quantity}
                                value={String(draft[l.id]?.qty ?? l.quantity)}
                                onChange={(e) => setQty(l.id, e.target.value === '' ? 0 : Number(e.target.value))}
                                className="mt-2 w-32"
                            />
                        )}
                    </div>
                ))}
                <Textarea
                    label={short ? 'Lý do chênh lệch (bắt buộc)' : 'Ghi chú'}
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    error={noteMissing ? 'Nhận thiếu thì phải ghi lý do.' : undefined}
                />
            </div>
        </Dialog>
    );
}
