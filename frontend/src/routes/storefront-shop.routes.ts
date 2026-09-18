// Storefront discovery — home, catalog listing, categories, search (W3-1 owns this file from here on).
import { lazy } from 'react';
import type { RouteDef, RedirectDef } from './route-types';
import { ROUTES } from './route-paths';

const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
const ProductCatalogPage = lazy(() => import('../pages/ProductCatalogPage'));
const CategoryPage = lazy(() => import('../pages/CategoryPage').then((m) => ({ default: m.CategoryPage })));

export const storefrontShopRoutes: RouteDef[] = [
  { path: '', element: HomePage, layout: 'storefront', hidden: true, seo: 'index', name: 'home' },
  { path: 'san-pham', element: ProductCatalogPage, layout: 'storefront', seo: 'index', name: 'products' },
  { path: 'danh-muc/:slug', element: CategoryPage, layout: 'storefront', seo: 'index', name: 'category' },
  { path: 'tim-kiem', element: CategoryPage, layout: 'storefront', seo: 'noindex', name: 'search' },

  // Legacy flat category shortcuts (`/laptop`, `/pc-gaming`, ...) — the URL segment IS the
  // category slug, so they keep working unmodified; only the redirect target below is new.
  { path: 'laptop', element: CategoryPage, layout: 'storefront', hidden: true },
  { path: 'pc-gaming', element: CategoryPage, layout: 'storefront', hidden: true },
  { path: 'workstation', element: CategoryPage, layout: 'storefront', hidden: true },
  { path: 'components', element: CategoryPage, layout: 'storefront', hidden: true },
  { path: 'screens', element: CategoryPage, layout: 'storefront', hidden: true },
];

// D11 §2: old English paths -> canonical Vietnamese path. External/bookmarked links keep working;
// every INTERNAL link must use `ROUTES`/`paths` instead (enforced by the no-hardcoded-route-strings rule).
export const storefrontShopRedirects: RedirectDef[] = [
  { from: 'products', to: ROUTES.PRODUCTS, layout: 'storefront' },
  { from: 'catalog', to: ROUTES.PRODUCTS, layout: 'storefront' },
  { from: 'category/:slug', to: '/danh-muc/:slug', layout: 'storefront' },
  { from: 'search', to: ROUTES.SEARCH, layout: 'storefront' },
];
