import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Dialog, Radio, RadioGroup, Textarea, notify } from '../../../../components/ui';
import { normalizeApiError } from '../../../../lib/api-error';
import { repairIntakeApi, type WorkOrderPhotoStage } from '../../../../api/repair/intake';
import { PHOTO_ACCEPT, photoFilesProblem } from './repair-photo-rules';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workOrderId: string;
    onUploaded: () => void;
}

/** Before/after repair photos — saved as one activity-log entry with the photos attached. */
export function WorkOrderProgressPhotosDialog({ open, onOpenChange, workOrderId, onUploaded }: Props) {
    const [stage, setStage] = useState<WorkOrderPhotoStage>('Before');
    const [files, setFiles] = useState<File[]>([]);
    const [note, setNote] = useState('');
    const problem = files.length > 0 ? photoFilesProblem(files) : null;

    const upload = useMutation({
        mutationFn: () => repairIntakeApi.uploadProgressPhotos(workOrderId, stage, files, note.trim() || undefined),
        onSuccess: () => {
            notify.success(stage === 'Before' ? 'Đã lưu ảnh trước khi sửa' : 'Đã lưu ảnh sau khi sửa');
            setFiles([]); setNote(''); onOpenChange(false); onUploaded();
        },
        onError: (e) => notify.error('Không tải được ảnh', { description: normalizeApiError(e).message }),
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange} title="Thêm ảnh sửa chữa" size="sm"
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
                    <Button loading={upload.isPending} disabled={files.length === 0 || !!problem} onClick={() => upload.mutate()}>Tải lên</Button>
                </div>
            }>
            <div className="space-y-4">
                <RadioGroup legend="Giai đoạn">
                    <Radio name="photo-stage" label="Trước khi sửa" checked={stage === 'Before'} onChange={() => setStage('Before')} />
                    <Radio name="photo-stage" label="Sau khi sửa" checked={stage === 'After'} onChange={() => setStage('After')} />
                </RadioGroup>
                <div>
                    <label htmlFor="progress-photo-files" className="mb-1 block text-13 font-medium text-fg">Ảnh (tối đa 10, mỗi ảnh ≤ 5MB)</label>
                    <input id="progress-photo-files" type="file" multiple accept={PHOTO_ACCEPT}
                        className="block w-full text-13 text-fg-muted"
                        onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                    {problem && <p className="mt-1 text-xs text-danger">{problem}</p>}
                </div>
                <Textarea label="Ghi chú" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            </div>
        </Dialog>
    );
}
