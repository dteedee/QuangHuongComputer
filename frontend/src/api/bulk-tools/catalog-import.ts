/**
 * Catalog import wizard — `docs/api-contracts/catalog-bulk.md` §1-4.
 * Base path `/catalog/bulk`. Permission `Catalog.Import` (Export for the round-trip export
 * button, which `frontend/src/api/catalog/admin.ts` already owns — not duplicated here).
 */
import client from '../client';
import type { ProductImportResult, ImportMode } from './types';

export const catalogImportApi = {
    /** `GET /catalog/bulk/products/template` — blank workbook + category/brand dropdown sheet. */
    downloadTemplate: async (): Promise<Blob> => {
        const res = await client.get<Blob>('/catalog/bulk/products/template', { responseType: 'blob' });
        return res.data;
    },

    /** `POST /catalog/bulk/products/import?mode=&onDuplicate=`. */
    import: async (
        file: File,
        mode: ImportMode,
        onDuplicate: 'skip' | 'update' = 'skip',
    ): Promise<ProductImportResult> => {
        const form = new FormData();
        form.append('file', file);
        const res = await client.post<ProductImportResult>('/catalog/bulk/products/import', form, {
            params: { mode, onDuplicate },
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    /** `GET /catalog/bulk/products/import/errors/{token}` — the error workbook (404 after 24h). */
    downloadErrorWorkbook: async (token: string): Promise<Blob> => {
        const res = await client.get<Blob>(`/catalog/bulk/products/import/errors/${token}`, {
            responseType: 'blob',
        });
        return res.data;
    },
};
