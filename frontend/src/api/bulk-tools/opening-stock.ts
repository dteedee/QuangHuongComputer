/**
 * Opening-stock import — `docs/api-contracts/inventory-bulk.md` §1-3. Permission
 * `Inventory.ImportOpening`. Only works for a (product, warehouse) pair with no stock/movement
 * yet — the wizard shell surfaces that precondition, the backend enforces it row-by-row.
 */
import client from '../client';
import type { OpeningBalanceImportResult, ImportMode } from './types';

export const openingStockApi = {
    downloadTemplate: async (): Promise<Blob> => {
        const res = await client.get<Blob>('/inventory/bulk/opening-balances/template', {
            responseType: 'blob',
        });
        return res.data;
    },

    import: async (file: File, mode: ImportMode): Promise<OpeningBalanceImportResult> => {
        const form = new FormData();
        form.append('file', file);
        const res = await client.post<OpeningBalanceImportResult>('/inventory/bulk/opening-balances', form, {
            params: { mode },
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    downloadErrorWorkbook: async (token: string): Promise<Blob> => {
        const res = await client.get<Blob>(`/inventory/bulk/opening-balances/errors/${token}`, {
            responseType: 'blob',
        });
        return res.data;
    },
};
