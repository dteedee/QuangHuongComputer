/**
 * `api/repair.ts` — BARREL. Real code now lives in `api/repair/` split by
 * audience (W1-9, step 7c): `public.ts` (booking/workOrders/quotes read +
 * customer decision), `admin.ts` (technician + admin), `types.ts`.
 *
 * This file exists only so every pre-existing `import { repairApi, WorkOrder }
 * from '../api/repair'` keeps compiling unchanged — no importer was touched.
 * New wave-3 code should import directly from `api/repair/<file>` instead.
 */
export * from './repair/types';
export * from './repair/public';
export * from './repair/admin';
export * from './repair/quote-types';
export * from './repair/service-types';
export * from './repair/intake';
export * from './repair/work-order-priority';

import { repairPublicApi } from './repair/public';
import { repairAdminApi } from './repair/admin';

/** @deprecated import `repairPublicApi` / `repairAdminApi` from `api/repair/*` instead. */
export const repairApi = {
    booking: repairPublicApi.booking,
    workOrders: repairPublicApi.workOrders,
    quotes: {
        get: repairPublicApi.quotes.get,
        approve: repairPublicApi.quotes.approve,
        reject: repairPublicApi.quotes.reject,
        update: repairAdminApi.quotes.update,
        markAwaitingApproval: repairAdminApi.quotes.markAwaitingApproval,
    },
    technician: repairAdminApi.technician,
    admin: repairAdminApi.admin,
};
