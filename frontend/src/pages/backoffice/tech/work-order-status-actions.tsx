import { useState } from 'react';
import { CheckCircle, Pause, Play, Wrench } from 'lucide-react';
import { Button, Dialog, Textarea } from '../../../components/ui';
import type { WorkOrderStatus } from '../../../api/repair/types';

interface Prompt { status: WorkOrderStatus; title: string; label: string; required: boolean }

interface Props {
    status: WorkOrderStatus;
    pending: boolean;
    onChange: (status: WorkOrderStatus, notes?: string) => void;
}

/** Technician status buttons (diagnose / start / pause / resume / complete) with a note dialog — no native prompt(). */
export function WorkOrderStatusActions({ status, pending, onChange }: Props) {
    const [prompt, setPrompt] = useState<Prompt | null>(null);
    const [note, setNote] = useState('');
    const ask = (p: Prompt) => { setNote(''); setPrompt(p); };

    return (
        <>
            {status === 'Assigned' && (
                <Button size="sm" icon={Wrench} onClick={() => ask({ status: 'Diagnosed', title: 'Hoàn tất chẩn đoán', label: 'Kết quả chẩn đoán', required: true })}>Hoàn tất chẩn đoán</Button>
            )}
            {status === 'Approved' && <Button size="sm" icon={Play} loading={pending} onClick={() => onChange('InProgress')}>Bắt đầu sửa</Button>}
            {status === 'InProgress' && (
                <>
                    <Button variant="outline" size="sm" icon={Pause} onClick={() => ask({ status: 'OnHold', title: 'Tạm dừng sửa chữa', label: 'Lý do tạm dừng', required: true })}>Tạm dừng</Button>
                    <Button size="sm" icon={CheckCircle} onClick={() => ask({ status: 'Completed', title: 'Hoàn thành sửa chữa', label: 'Ghi chú hoàn thành (tuỳ chọn)', required: false })}>Hoàn thành</Button>
                </>
            )}
            {status === 'OnHold' && <Button size="sm" icon={Play} loading={pending} onClick={() => onChange('InProgress')}>Tiếp tục</Button>}

            <Dialog open={!!prompt} onOpenChange={(o) => !o && setPrompt(null)} title={prompt?.title ?? ''} size="sm"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPrompt(null)}>Huỷ</Button>
                        <Button disabled={!!prompt?.required && !note.trim()}
                            onClick={() => { if (prompt) onChange(prompt.status, note.trim() || undefined); setPrompt(null); }}>Xác nhận</Button>
                    </div>
                }>
                <Textarea label={prompt?.label} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
            </Dialog>
        </>
    );
}
