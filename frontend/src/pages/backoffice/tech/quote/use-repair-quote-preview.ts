/**
 * Live totals for the quote editor, computed by the SERVER
 * (`POST /repair/work-orders/{id}/quote/preview`). Debounced; only fires once
 * the draft passes the client schema, and keeps the previous result on screen
 * while the next one loads so the totals panel does not flicker.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../../../hooks/useDebounce';
import { queryKeys } from '../../../../lib/query-keys';
import { repairAdminApi } from '../../../../api/repair/admin';
import { repairQuoteFormSchema, toUpsertInput } from './repair-quote-form-schema';

export function useRepairQuotePreview(workOrderId: string, draft: unknown, enabled: boolean) {
    const parsed = repairQuoteFormSchema.safeParse(draft);
    const input = parsed.success ? toUpsertInput(parsed.data) : null;
    const debounced = useDebounce(input ? JSON.stringify(input) : null, 400);

    const query = useQuery({
        queryKey: [...queryKeys.repair.all, 'quote-preview', workOrderId, debounced],
        queryFn: () => repairAdminApi.technician.previewQuote(workOrderId, JSON.parse(debounced!)),
        enabled: enabled && debounced !== null,
        placeholderData: keepPreviousData,
        retry: false,
        staleTime: 30_000,
    });

    return { preview: query.data, isFetching: query.isFetching, error: query.error, isDraftValid: parsed.success };
}
