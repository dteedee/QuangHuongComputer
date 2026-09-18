/**
 * `api/catalog.ts` — BARREL. Real code now lives in `api/catalog/` split by
 * audience (W1-9, step 7c): `public-listing.ts` (browse/search/facets),
 * `public-product.ts` (PDP), `admin.ts` (CRUD), `types.ts` (shared).
 *
 * This file exists only so every pre-existing `import { catalogApi, Product }
 * from '../api/catalog'` keeps compiling unchanged — no importer was touched.
 * New wave-3 code should import directly from `api/catalog/<file>` instead.
 */
export * from './catalog/types';
export * from './catalog/public-listing';
export * from './catalog/public-product';
export * from './catalog/admin';

import { catalogPublicListingApi } from './catalog/public-listing';
import { catalogPublicProductApi } from './catalog/public-product';
import { catalogAdminApi } from './catalog/admin';

/** @deprecated import `catalogPublicListingApi` / `catalogPublicProductApi` / `catalogAdminApi` from `api/catalog/*` instead. */
export const catalogApi = {
    ...catalogPublicListingApi,
    ...catalogPublicProductApi,
    ...catalogAdminApi,
};
