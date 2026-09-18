// Storefront discovery — home, catalog listing, categories, search (W3-1 owns this file).
import { lazy } from 'react';
import type { RouteDef, RedirectDef } from './route-types';
import { ROUTES } from './route-paths';

const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
// One page for every browse surface — `ProductCatalogPage`/`CategoryPage` are gone (W3-1).
const ProductListingPage = lazy(() => import('../pages/product-listing-page'));

export const storefrontShopRoutes: RouteDef[] = [
  { path: '', element: HomePage, layout: 'storefront', hidden: true, seo: 'index', name: 'home' },
  { path: 'san-pham', element: ProductListingPage, layout: 'storefront', seo: 'index', name: 'products' },
  { path: 'danh-muc/:slug', element: ProductListingPage, layout: 'storefront', seo: 'index', name: 'category' },
  { path: 'tim-kiem', element: ProductListingPage, layout: 'storefront', seo: 'noindex', name: 'search' },

  // Legacy flat category shortcuts (`/laptop`, `/pc-gaming`, ...). The URL segment is NOT a
  // category slug in the current data (`laptop-may-tinh-xach-tay`, `may-tinh-choi-game`, ...),
  // so they redirect to the canonical category URL instead of rendering an empty grid.
];

// D11 §2: old English paths -> canonical Vietnamese path. External/bookmarked links keep working;
// every INTERNAL link must use `ROUTES`/`paths` instead (enforced by the no-hardcoded-route-strings rule).
export const storefrontShopRedirects: RedirectDef[] = [
  { from: 'products', to: ROUTES.PRODUCTS, layout: 'storefront' },
  { from: 'catalog', to: ROUTES.PRODUCTS, layout: 'storefront' },
  { from: 'category/:slug', to: '/danh-muc/:slug', layout: 'storefront' },
  { from: 'search', to: ROUTES.SEARCH, layout: 'storefront' },
  // Flat legacy shortcuts -> the category slugs that actually exist in the
  // catalogue (verified against GET /api/catalog/categories on 2026-09-18).
  // An unknown slug renders the listing page's "Không tìm thấy danh mục" state,
  // never the full catalogue.
  { from: 'laptop', to: '/danh-muc/laptop', layout: 'storefront' },
  { from: 'pc-gaming', to: '/danh-muc/pc-gaming', layout: 'storefront' },
  { from: 'workstation', to: '/danh-muc/pc-do-hoa', layout: 'storefront' },
  { from: 'components', to: '/danh-muc/linh-kien-may-tinh', layout: 'storefront' },
  { from: 'screens', to: '/danh-muc/man-hinh-may-tinh', layout: 'storefront' },
];
