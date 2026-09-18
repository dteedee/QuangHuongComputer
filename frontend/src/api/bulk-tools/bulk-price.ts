/**
 * Bulk price screen — `docs/api-contracts/catalog-bulk.md` §5. Permission `Catalog.BulkPrice`
 * on both preview and apply. At most 5.000 matched products per run (400 above that).
 */
import client from '../client';
import type { BulkPriceFilter, BulkPriceResult } from './types';

export const bulkPriceApi = {
    preview: async (filter: BulkPriceFilter): Promise<BulkPriceResult> => {
        const res = await client.post<BulkPriceResult>('/catalog/bulk/price/preview', filter);
        return res.data;
    },
    apply: async (filter: BulkPriceFilter): Promise<BulkPriceResult> => {
        const res = await client.post<BulkPriceResult>('/catalog/bulk/price/apply', filter);
        return res.data;
    },
};
