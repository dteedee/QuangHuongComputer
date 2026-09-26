import { Button, Dialog, Textarea } from '../../../components/ui';

interface Props {
    open: boolean;
    reason: string;
    onReasonChange: (value: string) => void;
    pending: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/** Reason prompt for rejecting a booking — no native prompt(). */
export function BookingRejectDialog({ open, reason, onReasonChange, pending, onCancel, onConfirm }: Props) {
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()} title="Lý do từ chối" size="sm"
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel}>Huỷ</Button>
                    <Button variant="danger" loading={pending} disabled={!reason.trim()} onClick={onConfirm}>Xác nhận từ chối</Button>
                </div>
            }>
            <Textarea label="Lý do" rows={3} value={reason} onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Nhập lý do từ chối yêu cầu..." />
        </Dialog>
    );
}
