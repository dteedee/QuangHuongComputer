/**
 * Warranty — ADMIN surface, assembled. Split out of the old flat
 * `api/warranty.ts`'s `warrantyApi.admin` / `.rma` / `.loaner` / `.policies`
 * (W1-9, step 7c). `api/warranty.ts` re-exports these under their original
 * shape (see that barrel).
 */
export * from './admin-claims';
export * from './admin-rma-loaner';
export * from './admin-policies';

import { warrantyAdminClaimsApi } from './admin-claims';
import { warrantyAdminLoanerApi, warrantyAdminRmaApi } from './admin-rma-loaner';
import { warrantyAdminPoliciesApi, warrantyAdminSlaPoliciesApi } from './admin-policies';

export const warrantyAdminApi = warrantyAdminClaimsApi;
export const warrantyRmaApi = warrantyAdminRmaApi;
export const warrantyLoanerApi = warrantyAdminLoanerApi;
export const warrantyPoliciesApi = warrantyAdminPoliciesApi;
export const warrantySlaPoliciesApi = warrantyAdminSlaPoliciesApi;
