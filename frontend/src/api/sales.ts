/**
 * `api/sales.ts` — BARREL. Real code now lives in `api/sales/` split by
 * audience (W1-9, step 7c): `cart-checkout.ts`, `account-orders.ts`,
 * `pos.ts` (new), `returns-admin.ts`, `admin-orders.ts`, `types.ts`.
 *
 * This file exists only so every pre-existing `import { salesApi, Order }
 * from '../api/sales'` keeps compiling unchanged — no importer was touched.
 * New wave-3 code should import directly from `api/sales/<file>` instead.
 */
export * from './sales/types';
export * from './sales/cart-checkout';
export * from './sales/account-orders';
export * from './sales/pos';
export * from './sales/returns-admin';
export * from './sales/admin-orders';

import { salesCartCheckoutApi } from './sales/cart-checkout';
import { salesAccountOrdersApi } from './sales/account-orders';
import { salesReturnsAdminApi } from './sales/returns-admin';
import { salesAdminOrdersApi } from './sales/admin-orders';

/** @deprecated import `salesCartCheckoutApi` / `salesAccountOrdersApi` / `salesAdminOrdersApi` / `salesReturnsAdminApi` / `salesPosApi` from `api/sales/*` instead. */
export const salesApi = {
    cart: salesCartCheckoutApi.cart,
    checkoutSession: salesCartCheckoutApi.checkoutSession,

    orders: {
        getList: salesAdminOrdersApi.getList,
        getById: salesAdminOrdersApi.getById,
        create: salesCartCheckoutApi.orders.create,
        guestCheckout: salesCartCheckoutApi.orders.guestCheckout,
        updateStatus: salesAdminOrdersApi.updateStatus,
        cancel: salesAccountOrdersApi.cancel,
        getHistory: salesAccountOrdersApi.getHistory,
        returns: {
            getMine: salesAccountOrdersApi.returns.getMine,
            getList: salesAccountOrdersApi.returns.getList,
            getById: salesAccountOrdersApi.returns.getById,
            create: salesAccountOrdersApi.returns.create,
            cancel: salesAccountOrdersApi.returns.cancel,
            getEffectivePolicy: salesAccountOrdersApi.returns.getEffectivePolicy,
            adminGetList: salesReturnsAdminApi.adminGetList,
            adminGetById: salesReturnsAdminApi.adminGetById,
            approve: salesReturnsAdminApi.approve,
            reject: salesReturnsAdminApi.reject,
            processRefund: salesReturnsAdminApi.processRefund,
            inspect: salesReturnsAdminApi.inspect,
            complete: salesReturnsAdminApi.complete,
        },
        returnPolicies: salesReturnsAdminApi.returnPolicies,
    },

    stats: salesAdminOrdersApi.stats,
    admin: salesAdminOrdersApi.admin,

    getMyOrders: salesAccountOrdersApi.getMyOrders,
    getMyOrder: salesAccountOrdersApi.getMyOrder,
    getMyStats: salesAccountOrdersApi.getMyStats,
    verifyPurchase: salesAccountOrdersApi.verifyPurchase,
    loyalty: salesAccountOrdersApi.loyalty,
};
