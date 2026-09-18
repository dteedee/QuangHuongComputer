/**
 * `api/content.ts` — BARREL. Real code now lives in `api/content/` split by
 * audience (W1-9, step 7c): `public.ts`, `admin.ts` (+ its two sub-files),
 * `types.ts`. This file exists only so every pre-existing
 * `import { contentApi, Post } from '../api/content'` keeps compiling
 * unchanged. New wave-3 code should import directly from `api/content/<file>`.
 */
export * from './content/types';
export * from './content/public';
export { contentAdminApi } from './content/admin';

import { contentPublicApi } from './content/public';
import { contentAdminApi } from './content/admin';

/** @deprecated import `contentPublicApi` / `contentAdminApi` from `api/content/*` instead. */
export const contentApi = {
    ...contentPublicApi,
    admin: contentAdminApi,
};
