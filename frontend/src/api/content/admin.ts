/**
 * Content — ADMIN surface, assembled. Split out of the old flat
 * `api/content.ts`'s `contentApi.admin` object (W1-9, step 7c).
 * `api/content.ts` re-exports `contentAdminApi` under the original
 * `contentApi.admin` shape (see that barrel).
 */
import { contentAdminCoreApi } from './admin-pages-posts-coupons-menus';
import { contentAdminContactMessagesApi, contentAdminFlashSalesApi } from './admin-flash-sales-contact-messages';

export const contentAdminApi = {
    ...contentAdminCoreApi,
    flashSales: contentAdminFlashSalesApi,
    contactMessages: contentAdminContactMessagesApi,
};
