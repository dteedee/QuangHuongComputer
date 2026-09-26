/**
 * Work-order intake (priority, device type/brand/model, accessories) and
 * photos: intake photos on the work order, before/after photos as an
 * activity-log entry. Uploads reuse the media validator server-side
 * (JPG/PNG/GIF/WebP ≤ 5MB, ≤ 10 files per request, ≤ 20 intake photos).
 */
import client from '../client';
import type { WorkOrderPriority } from './types';

export type WorkOrderPhotoStage = 'Before' | 'After';

export interface UpdateIntakeInput {
    priority: WorkOrderPriority;
    deviceType?: string | null;
    deviceBrand?: string | null;
    deviceModel?: string | null;
    serialNumber?: string | null;
    accessoriesReceived: string[];
    serviceTypeId?: string | null;
}

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

const toForm = (files: File[], extra?: Record<string, string>) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    Object.entries(extra ?? {}).forEach(([k, v]) => form.append(k, v));
    return form;
};

export const repairIntakeApi = {
    update: async (workOrderId: string, input: UpdateIntakeInput) =>
        (await client.put(`/repair/tech/work-orders/${workOrderId}/intake`, input)).data,

    uploadIntakePhotos: async (workOrderId: string, files: File[]): Promise<{ intakePhotoUrls: string[] }> =>
        (await client.post(`/repair/tech/work-orders/${workOrderId}/intake-photos`, toForm(files), multipart)).data,

    removeIntakePhoto: async (workOrderId: string, url: string): Promise<{ intakePhotoUrls: string[] }> =>
        (await client.delete(`/repair/tech/work-orders/${workOrderId}/intake-photos`, { params: { url } })).data,

    uploadProgressPhotos: async (workOrderId: string, stage: WorkOrderPhotoStage, files: File[], note?: string) =>
        (await client.post(`/repair/tech/work-orders/${workOrderId}/progress-photos`,
            toForm(files, { stage, ...(note ? { note } : {}) }), multipart)).data,
};
