// Route manifest — single source of truth for the router, sidebar, command palette,
// breadcrumbs and `paths` helper (phase-17-w1-fe-app-shell.md). One file per wave-3 track
// (route-types.ts "ONE file per wave-3 track") so those tracks never touch this file or App.tsx.
import type { RouteDef, RedirectDef } from './route-types';
import { buildPathsIndex } from './route-paths';

import { storefrontShopRoutes, storefrontShopRedirects } from './storefront-shop.routes';
import { storefrontProductRoutes, storefrontProductRedirects } from './storefront-product.routes';
import { storefrontCheckoutRoutes, storefrontCheckoutRedirects } from './storefront-checkout.routes';
import { storefrontAccountRoutes, storefrontAccountRedirects } from './storefront-account.routes';
import { storefrontServiceRoutes, storefrontServiceRedirects } from './storefront-service.routes';
import { storefrontPcbuilderRoutes, storefrontPcbuilderRedirects } from './storefront-pcbuilder.routes';
import { adminCatalogRoutes, adminCatalogRedirects } from './admin-catalog.routes';
import { adminOrdersRoutes } from './admin-orders.routes';
import { adminSystemRoutes, adminSystemRedirects } from './admin-system.routes';
import { backofficePosSalesRoutes } from './backoffice-pos-sales.routes';
import { backofficeInventoryRoutes } from './backoffice-inventory.routes';
import { backofficeHrRoutes } from './backoffice-hr.routes';
import { backofficeAccountingRoutes } from './backoffice-accounting.routes';
import { backofficeCrmRoutes } from './backoffice-crm.routes';
import { backofficeServiceRoutes } from './backoffice-service.routes';
import { standaloneRoutes } from './standalone.routes';

export const routes: RouteDef[] = [
  ...storefrontShopRoutes,
  ...storefrontProductRoutes,
  ...storefrontCheckoutRoutes,
  ...storefrontAccountRoutes,
  ...storefrontServiceRoutes,
  ...storefrontPcbuilderRoutes,
  ...adminCatalogRoutes,
  ...adminOrdersRoutes,
  ...adminSystemRoutes,
  ...backofficePosSalesRoutes,
  ...backofficeInventoryRoutes,
  ...backofficeHrRoutes,
  ...backofficeAccountingRoutes,
  ...backofficeCrmRoutes,
  ...backofficeServiceRoutes,
  ...standaloneRoutes,
];

export const redirects: RedirectDef[] = [
  ...storefrontShopRedirects,
  ...storefrontProductRedirects,
  ...storefrontCheckoutRedirects,
  ...storefrontAccountRedirects,
  ...storefrontServiceRedirects,
  ...storefrontPcbuilderRedirects,
  ...adminCatalogRedirects,
  ...adminSystemRedirects,
];

/** `paths.storefront.<name>(...)` / `paths.backoffice.<name>(...)` — generated, see route-paths.ts. */
export const paths = buildPathsIndex(routes);

export { ROUTES, buildPath, fullPath } from './route-paths';
export type { RouteDef, RedirectDef, RouteLayout, RouteSeo } from './route-types';
