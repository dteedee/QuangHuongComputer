// Storefront cart / checkout / payment (W3-2 owns this file from here on).
//
// Only the two top-level destinations (`/cart`, `/checkout`) are renamed to their D11 canonical
// Vietnamese path. Every sub-path below them (`checkout/success/:orderId`, `payment/*`) stays at
// its OLD literal path on purpose: `api/payment.ts` builds `${origin}/payment/callback` as the
// return URL it hands to VNPay/Momo/ZaloPay (a query-string-bearing, provider-configured URL — a
// `<Navigate>` alias would need to forward `location.search` to not silently drop the gateway's
// signature params, unverified without a live payment run), and `components/checkout/
// checkout-success-url.ts` + `use-checkout-submit.ts` (neither owned by this track) hardcode
// `/checkout/success/${order.id}` for the real post-order redirect. Renaming those without
// coordinating the owning track risks breaking checkout in production — flagged as an
// integration request to W3-2 instead (see reports/integration-requests-w1.md).
import { lazy } from 'react';
import type { RouteDef, RedirectDef } from './route-types';
import { ROUTES } from './route-paths';

const CartPage = lazy(() => import('../pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const CheckoutSuccessPage = lazy(() => import('../pages/checkout-success-page').then((m) => ({ default: m.CheckoutSuccessPage })));
const PaymentPage = lazy(() => import('../pages/PaymentPage').then((m) => ({ default: m.PaymentPage })));
const PaymentCallbackPage = lazy(() => import('../pages/PaymentCallbackPage').then((m) => ({ default: m.PaymentCallbackPage })));
const PaymentResultPage = lazy(() => import('../pages/PaymentResultPage').then((m) => ({ default: m.PaymentResultPage })));

export const storefrontCheckoutRoutes: RouteDef[] = [
  { path: 'gio-hang', element: CartPage, layout: 'storefront', seo: 'noindex', name: 'cart' },
  { path: 'thanh-toan', element: CheckoutPage, layout: 'storefront', seo: 'noindex', name: 'checkout' },
  // Unchanged (see file header) — kept reachable exactly as before.
  { path: 'checkout/success/:orderId', element: CheckoutSuccessPage, layout: 'storefront', seo: 'noindex', hidden: true, name: 'checkoutSuccess' },
  { path: 'payment/:orderId', element: PaymentPage, layout: 'storefront', seo: 'noindex', hidden: true, name: 'payment' },
  { path: 'payment/callback', element: PaymentCallbackPage, layout: 'storefront', seo: 'noindex', hidden: true },
  { path: 'payment/success', element: PaymentResultPage, layout: 'storefront', seo: 'noindex', hidden: true },
  { path: 'payment/failed', element: PaymentResultPage, layout: 'storefront', seo: 'noindex', hidden: true },
  // Provider-return URLs are configured in the VNPay/Momo/ZaloPay dashboards — cannot rename at all.
  { path: 'payment/vnpay-return', element: PaymentCallbackPage, layout: 'storefront', hidden: true },
  { path: 'payment/momo-return', element: PaymentCallbackPage, layout: 'storefront', hidden: true },
  { path: 'payment/zalopay-return', element: PaymentCallbackPage, layout: 'storefront', hidden: true },
];

export const storefrontCheckoutRedirects: RedirectDef[] = [
  { from: 'cart', to: ROUTES.CART, layout: 'storefront' },
  { from: 'checkout', to: ROUTES.CHECKOUT, layout: 'storefront' },
];
