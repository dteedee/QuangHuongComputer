/**
 * `api/warranty.ts` — BARREL. Real code now lives in `api/warranty/` split
 * by audience (W1-9, step 7c): `public.ts`, `admin.ts` (+ its three
 * sub-files), `types.ts`. This file exists only so every pre-existing
 * `import { warrantyApi, WarrantyClaim } from '../api/warranty'` keeps
 * compiling unchanged. New wave-3 code should import from `api/warranty/<file>`.
 */
export * from './warranty/types';
export * from './warranty/public';
export * from './warranty/admin';

import { warrantyPublicApi } from './warranty/public';
import { warrantyAdminApi, warrantyLoanerApi, warrantyPoliciesApi, warrantyRmaApi, warrantySlaPoliciesApi } from './warranty/admin';

/** @deprecated import `warrantyPublicApi` / `warrantyAdminApi` / `warrantyRmaApi` / `warrantyLoanerApi` / `warrantyPoliciesApi` from `api/warranty/*` instead. */
export const warrantyApi = {
    ...warrantyPublicApi,
    admin: warrantyAdminApi,
    rma: warrantyRmaApi,
    loaner: warrantyLoanerApi,
    policies: warrantyPoliciesApi,
    slaPolicies: warrantySlaPoliciesApi,
};
