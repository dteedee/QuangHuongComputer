/**
 * Label print data — `docs/api-contracts/inventory-bulk.md` §7,
 * `GET /inventory/bulk/label-data?skus=...` or `?grnId=...`. Permission `Inventory.ViewStock`.
 * Barcode/QR *images* are fetched separately (see `components/print/barcode-image.tsx`) —
 * this endpoint only returns the print payload.
 */
import client from '../client';
import type { LabelDataItem } from './types';

export const labelDataApi = {
    bySkus: async (skus: string[]): Promise<LabelDataItem[]> => {
        const res = await client.get<{ items: LabelDataItem[] }>('/inventory/bulk/label-data', {
            params: { skus: skus.join(',') },
        });
        return res.data.items;
    },
    byGrn: async (grnId: string): Promise<LabelDataItem[]> => {
        const res = await client.get<{ items: LabelDataItem[] }>('/inventory/bulk/label-data', {
            params: { grnId },
        });
        return res.data.items;
    },
    /** Authenticated SVG fetch — the barcode/qrcode endpoints require the bearer token, so a
     *  plain `<img src>` cannot reach them. Returns an object URL the caller must revoke. */
    fetchBarcodeSvgUrl: async (sku: string): Promise<string> => {
        const res = await client.get(`/inventory/barcode/${encodeURIComponent(sku)}`, { responseType: 'blob' });
        return URL.createObjectURL(res.data as Blob);
    },
    fetchQrCodeSvgUrl: async (serial: string): Promise<string> => {
        const res = await client.get(`/inventory/qrcode/${encodeURIComponent(serial)}`, { responseType: 'blob' });
        return URL.createObjectURL(res.data as Blob);
    },
};
