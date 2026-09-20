/**
 * Ghi chú nội bộ của đơn — nhãn trên ô, nút lưu đủ bốn trạng thái (§9.4).
 * Tách khỏi `order-detail-drawer.tsx` để mỗi file dưới 200 dòng (CLAUDE.md).
 */
import { useEffect, useState } from 'react';
import { StickyNote } from 'lucide-react';
import { Input, SaveButton, type SaveStatus } from '../../../components/ui';
import { useOrderActions } from './use-order-actions';

interface OrderInternalNoteFormProps {
    orderId: string;
    /** Ghi chú đã lưu trên đơn, hiện phía trên ô nhập. */
    internalNotes?: string | null;
}

export const OrderInternalNoteForm = ({ orderId, internalNotes }: OrderInternalNoteFormProps) => {
    const [draft, setDraft] = useState('');
    const [status, setStatus] = useState<SaveStatus>('idle');
    const { addNoteMutation } = useOrderActions(orderId);

    /* Mutation do hook sở hữu; trạng thái nút bám theo vòng đời của nó (§9.4). */
    useEffect(() => {
        if (addNoteMutation.isPending) setStatus('saving');
        else if (addNoteMutation.isError) setStatus('error');
    }, [addNoteMutation.isPending, addNoteMutation.isError]);

    const submit = () => {
        const note = draft.trim();
        if (!note) return;
        setStatus('saving');
        addNoteMutation.mutate(note, {
            onSuccess: () => { setDraft(''); setStatus('saved'); },
            onError: () => setStatus('error'),
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-13 font-semibold uppercase tracking-wider text-fg-subtle">
                <StickyNote size={14} aria-hidden /> Ghi chú nội bộ
            </h3>
            {internalNotes && <p className="text-13 text-fg-muted">{internalNotes}</p>}
            <Input
                label="Thêm ghi chú"
                inputSize="sm"
                placeholder="Ví dụ: khách hẹn giao sau 18h"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            />
            <div className="flex justify-end">
                <SaveButton
                    size="sm"
                    label="Lưu ghi chú"
                    status={status}
                    disabled={!draft.trim()}
                    errorMessage="Không lưu được ghi chú, thử lại."
                    onClick={submit}
                    onDone={() => setStatus('idle')}
                />
            </div>
        </div>
    );
};
