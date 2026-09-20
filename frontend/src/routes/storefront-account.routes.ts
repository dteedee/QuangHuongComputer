// Storefront account area — orders, returns, loyalty, addresses, wishlist (W3-8 owns this file
// from here on). Prefix renamed `/account` -> `/tai-khoan` (D11 §2); sub-segments kept in English
// on purpose — D11 only mandates the prefix, and `pages/account/**` + `components/header/**`
// (not owned by this track) hardcode the old sub-paths, so redirects below keep them working
// (one extra client-side hop, the exact tradeoff D11 §2 accepts) until W3-8 updates the call sites.
import { lazy } from 'react';
import type { RouteDef, RedirectDef } from './route-types';
import { ROUTES } from './route-paths';

const AccountPage = lazy(() => import('../pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const ProfilePage = lazy(() => import('../pages/account/profile-page'));
const SecurityPage = lazy(() => import('../pages/account/security-page'));
const ReturnsListPage = lazy(() => import('../pages/account/returns-list-page'));
const OrdersPage = lazy(() => import('../pages/account/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('../pages/account/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const NewReturnRequestPage = lazy(() => import('../pages/account/NewReturnRequestPage').then((m) => ({ default: m.NewReturnRequestPage })));
const ReturnRequestDetailPage = lazy(() => import('../pages/account/return-request-detail-page').then((m) => ({ default: m.ReturnRequestDetailPage })));
const LoyaltyPage = lazy(() => import('../pages/account/LoyaltyPage').then((m) => ({ default: m.LoyaltyPage })));
const AddressBookPage = lazy(() => import('../pages/account/address-book-page'));
const WishlistPage = lazy(() => import('../pages/account/WishlistPage').then((m) => ({ default: m.WishlistPage })));
const GuestOrderLookupPage = lazy(() => import('../pages/account/GuestOrderLookupPage'));

// All require login only (no specific permission) — wrapped in `<RequireAuth>` at render time
// (routes/index.ts), matching the old "bắt buộc đăng nhập (mọi role)" behaviour exactly.
export const storefrontAccountRoutes: RouteDef[] = [
  { path: 'tai-khoan', element: AccountPage, layout: 'storefront', seo: 'noindex', requiresAuth: true, name: 'account' },
  { path: 'tai-khoan/profile', element: ProfilePage, layout: 'storefront', seo: 'noindex', requiresAuth: true, hidden: true, name: 'accountProfile' },
  { path: 'tai-khoan/security', element: SecurityPage, layout: 'storefront', seo: 'noindex', requiresAuth: true, hidden: true, name: 'accountSecurity' },
  { path: 'tai-khoan/orders', element: OrdersPage, layout: 'storefront', seo: 'noindex', requiresAuth: true, hidden: true, name: 'accountOrders' },
  { path: 'tai-khoan/orders/:orderId', element: OrderDetailPage, layout: 'storefront', seo: 'noindex', requiresAuth: true, hidden: true, name: 'accountOrderDetail' },
  { path: 'tai-khoan/returns', element: ReturnsListPage, layout: 'storefront', seo: 'noindex', requiresAuth: true, hidden: true, name: 'accountReturns' },
  { path: 'tai-khoan/returns/new', element: NewReturnRequestPage, layout: 'storefront', seo: 'noindex', requiresAuth: true, hidden: true, name: 'accountReturnNew' },
  { path: 'tai-khoan/returns/:id', element: ReturnRequestDetailPage, layout: 'storefront', seo: 'noindex', requiresAuth: true, hidden: true, name: 'accountReturnDetail' },
  { path: 'tai-khoan/loyalty', element: LoyaltyPage, layout: 'storefront', seo: 'noindex', requiresAuth: true, hidden: true, name: 'accountLoyalty' },
  { path: 'tai-khoan/addresses', element: AddressBookPage, layout: 'storefront', seo: 'noindex', requiresAuth: true, hidden: true, name: 'accountAddresses' },
  // New: WishlistPage existed (main.tsx/W1-13 already mounts WishlistProvider) but had no route —
  // an unreachable page (Requirements: "wishlist works").
  { path: 'tai-khoan/wishlist', element: WishlistPage, layout: 'storefront', seo: 'noindex', requiresAuth: true, hidden: true, name: 'accountWishlist' },
  // Guest lookup — anonymous, no `requiresAuth` (phase-56 Step 8).
  { path: 'tra-cuu-don-hang', element: GuestOrderLookupPage, layout: 'storefront', seo: 'index', hidden: true, name: 'guestOrderLookup' },
];

export const storefrontAccountRedirects: RedirectDef[] = [
  { from: 'profile', to: ROUTES.ACCOUNT, layout: 'storefront' },
  { from: 'account', to: ROUTES.ACCOUNT, layout: 'storefront' },
  { from: 'account/orders', to: '/tai-khoan/orders', layout: 'storefront' },
  { from: 'account/orders/:orderId', to: '/tai-khoan/orders/:orderId', layout: 'storefront' },
  { from: 'account/returns/new', to: '/tai-khoan/returns/new', layout: 'storefront' },
  { from: 'account/returns/:id', to: '/tai-khoan/returns/:id', layout: 'storefront' },
  { from: 'account/loyalty', to: '/tai-khoan/loyalty', layout: 'storefront' },
  { from: 'account/addresses', to: '/tai-khoan/addresses', layout: 'storefront' },
  { from: 'account/wishlist', to: '/tai-khoan/wishlist', layout: 'storefront' },
];
