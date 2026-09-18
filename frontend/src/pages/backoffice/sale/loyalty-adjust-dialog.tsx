/** Điều chỉnh điểm tay: bắt buộc lý do, không cho trừ quá số dư (server chặn 409, UI cảnh báo trước). */
import { useEffect, useState } from 'react';
import { Button, Dialog, Input, Textarea, notify } from '../../../components/ui';
import { loyaltyAdminApi, type LoyaltyAccountRow } from './loyalty-admin-api';

interface LoyaltyAdjustDialogProps {
    account: LoyaltyAccountRow | null;
    onOpenChange: (open: boolean) => void;
    onDone: () => void;
}

export default function LoyaltyAdjustDialog({ account, onOpenChange, onDone }: LoyaltyAdjustDialogProps) {
    const [points, setPoints] = useState(0);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { setPoints(0); setReason(''); setError(null); }, [account?.id]);

    const overdraft = points < 0 && Math.abs(points) > (account?.availablePoints ?? 0);
    const valid = points !== 0 && reason.trim().length > 0 && !overdraft;

    const submit = async () => {
        if (!account) return;
        setSaving(true);
        setError(null);
        try {
            const res = await loyaltyAdminApi.adjust(account.userId, { points, reason: reason.trim() });
            notify.success('Đã điều chỉnh điểm', { description: `Số dư mới: ${res.newBalance}` });
            onDone();
            onOpenChange(false);
        } catch (err) {
            setError((err as { normalized?: { message?: string } })?.normalized?.message ?? 'Không điều chỉnh được điểm.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open={!!account}
            onOpenChange={onOpenChange}
            title="Điều chỉnh điểm thưởng"
            description={account ? `Số dư hiện tại: ${account.availablePoints} điểm` : undefined}
            size="sm"
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
                    <Button onClick={submit} loading={saving} disabled={!valid}>Lưu</Button>
                </div>
            }
        >
            <div className="space-y-3">
                <Input
                    label="Số điểm (âm để trừ)"
                    type="number"
                    value={points || ''}
                    onChange={(e) => setPoints(Number(e.target.value) || 0)}
                    error={overdraft ? 'Trừ quá số dư khả dụng.' : undefined}
                />
                <Textarea
                    label="Lý do"
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    hint="Bắt buộc — ghi vào sổ điểm, kế toán đối chiếu được."
                />
                {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            </div>
        </Dialog>
    );
}
