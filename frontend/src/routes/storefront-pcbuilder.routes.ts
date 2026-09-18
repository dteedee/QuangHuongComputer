// Storefront PC-builder / compare tools (W3-9 owns this file from here on).
//
// `ROUTES.PC_BUILDER` ('/xay-dung-cau-hinh') is reserved in the URL contract but has no route
// here yet — `api/pcbuilder.ts` exists, the FE page does not (verified: no component anywhere
// under `pages/`). Wiring a `<Route>` to a non-existent component would fabricate a feature and
// break `tsc`; W3-9 adds the route to this file when it ships the page.
import { lazy } from 'react';
import type { RouteDef, RedirectDef } from './route-types';
import { ROUTES } from './route-paths';

const ComparePage = lazy(() => import('../pages/ComparePage').then((m) => ({ default: m.ComparePage })));

export const storefrontPcbuilderRoutes: RouteDef[] = [
  { path: 'so-sanh', element: ComparePage, layout: 'storefront', seo: 'index', name: 'compare' },
];

export const storefrontPcbuilderRedirects: RedirectDef[] = [
  { from: 'compare', to: ROUTES.COMPARE, layout: 'storefront' },
];
