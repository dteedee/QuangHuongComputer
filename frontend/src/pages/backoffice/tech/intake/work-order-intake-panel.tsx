import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Pencil, Smartphone } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, StatusBadge, notify } from '../../../../components/ui';
import { normalizeApiError } from '../../../../lib/api-error';
import { repairIntakeApi } from '../../../../api/repair/intake';
import {
    WORK_ORDER_PRIORITY_LABELS, WORK_ORDER_PRIORITY_TONE, type WorkOrderPriority,
} from '../../../../api/repair/work-order-priority';
import { RepairPhotoGrid } from './repair-photo-grid';
import { PHOTO_ACCEPT, photoFilesProblem } from './repair-photo-rules';
import { WorkOrderIntakeDialog } from './work-order-intake-dialog';
import { intakeDefaults, toIntakeInput } from './work-order-intake-schema';

export interface IntakeWorkOrder {
    id: string;
    priority?: WorkOrderPriority;
    deviceType?: string | null;
    deviceBrand?: string | null;
    deviceModel: string;
    serialNumber?: string;
    description: string;
    technicalNotes?: string | null;
    accessoriesReceived?: string[];
    intakePhotoUrls?: string[];
    serviceTypeId?: string | null;
    serviceTypeName?: string | null;
}

/** Device + intake details, accessories and intake photos (upload / remove). */
export function WorkOrderIntakePanel({ workOrder, onChanged, editable }: { workOrder: IntakeWorkOrder; onChanged: () => void; editable: boolean }) {
    const [editOpen, setEditOpen] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const priority = workOrder.priority ?? 'Normal';
    const onError = (title: string) => (e: unknown) => notify.error(title, { description: normalizeApiError(e).message });

    const upload = useMutation({
        mutationFn: (files: File[]) => repairIntakeApi.uploadIntakePhotos(workOrder.id, files),
        onSuccess: () => { notify.success('Đã tải ảnh tiếp nhận'); onChanged(); },
        onError: onError('Không tải được ảnh'),
    });
    const remove = useMutation({
        mutationFn: (url: string) => repairIntakeApi.removeIntakePhoto(workOrder.id, url),
        onSuccess: () => { notify.success('Đã xoá ảnh'); onChanged(); },
        onError: onError('Không xoá được ảnh'),
    });

    const pickFiles = (files: File[]) => {
        const problem = photoFilesProblem(files);
        if (problem) { notify.error(problem); return; }
        upload.mutate(files);
    };

    const field = (label: string, value?: string | null) => (
        <div><dt className="text-2xs text-fg-subtle">{label}</dt><dd className="text-13 text-fg">{value || '—'}</dd></div>
    );

    return (
        <Card padded>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                    <Smartphone size={18} aria-hidden /> Thiết bị & tiếp nhận
                    <StatusBadge tone={WORK_ORDER_PRIORITY_TONE[priority]}>Ưu tiên: {WORK_ORDER_PRIORITY_LABELS[priority]}</StatusBadge>
                </CardTitle>
                {editable && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" icon={ImagePlus} loading={upload.isPending} onClick={() => fileInput.current?.click()}>Ảnh tiếp nhận</Button>
                        <Button variant="outline" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>Sửa</Button>
                    </div>
                )}
                <input ref={fileInput} type="file" multiple accept={PHOTO_ACCEPT} className="hidden" aria-hidden tabIndex={-1}
                    onChange={(e) => { pickFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
            </CardHeader>
            <CardBody className="space-y-4">
                <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {field('Loại', workOrder.deviceType)}
                    {field('Hãng', workOrder.deviceBrand)}
                    {field('Model', workOrder.deviceModel)}
                    {field('Số serial', workOrder.serialNumber)}
                    {field('Dịch vụ', workOrder.serviceTypeName)}
                </dl>
                <div>
                    <p className="text-2xs text-fg-subtle">Mô tả lỗi</p>
                    <p className="whitespace-pre-line text-13 text-fg">{workOrder.description}</p>
                </div>
                {workOrder.technicalNotes && (
                    <div>
                        <p className="text-2xs text-fg-subtle">Ghi chú kỹ thuật</p>
                        <p className="whitespace-pre-line text-13 text-fg">{workOrder.technicalNotes}</p>
                    </div>
                )}
                <div>
                    <p className="mb-1 text-2xs text-fg-subtle">Phụ kiện nhận kèm</p>
                    {(workOrder.accessoriesReceived ?? []).length === 0
                        ? <p className="text-13 text-fg-muted">Không có</p>
                        : <div className="flex flex-wrap gap-1">{workOrder.accessoriesReceived!.map((a) => <Badge key={a}>{a}</Badge>)}</div>}
                </div>
                <RepairPhotoGrid urls={workOrder.intakePhotoUrls ?? []} alt="Ảnh tiếp nhận"
                    onRemove={editable ? (url) => remove.mutate(url) : undefined} disabled={remove.isPending} />
            </CardBody>
            <WorkOrderIntakeDialog open={editOpen} onOpenChange={setEditOpen} defaults={intakeDefaults(workOrder)}
                onSubmit={async (values) => {
                    await repairIntakeApi.update(workOrder.id, toIntakeInput(values));
                    notify.success('Đã lưu thông tin tiếp nhận');
                    onChanged();
                }} />
        </Card>
    );
}
