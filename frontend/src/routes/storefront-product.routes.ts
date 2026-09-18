// Storefront product detail (W3-7 owns this file from here on).
import { lazy } from 'react';
import type { RouteDef, RedirectDef } from './route-types';

const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage'));

export const storefrontProductRoutes: RouteDef[] = [
  { path: 'san-pham/:slug', element: ProductDetailPage, layout: 'storefront', seo: 'index', hidden: true, name: 'productDetail' },
  // Legacy id-based URLs — kept live (not redirected): a numeric/GUID id has no slug to redirect
  // to without a lookup, and ProductDetailPage already resolves either shape.
  { path: 'product/:id', element: ProductDetailPage, layout: 'storefront', hidden: true },
];

export const storefrontProductRedirects: RedirectDef[] = [
  { from: 'products/:id', to: '/product/:id', layout: 'storefront' },
];
