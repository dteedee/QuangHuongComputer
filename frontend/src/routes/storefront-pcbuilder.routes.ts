// Storefront PC-builder / compare tools (W3-9 owns this file from here on).
//
// `ROUTES.PC_BUILDER` ('/xay-dung-cau-hinh') is now a real route (phase-57):
// `pages/build-pc/build-pc-page.tsx` is the interactive builder; `:code` is
// the read-only shared-build view (contract §6, `docs/api-contracts/pc-builder.md`).
// The stale "no route yet" comment this file carried (and the identical one
// in `route-paths.ts`, not owned here) is now wrong — flagged in the W3-9 report.
import { lazy } from 'react';
import type { RouteDef, RedirectDef } from './route-types';
import { ROUTES } from './route-paths';

const ComparePage = lazy(() => import('../pages/ComparePage').then((m) => ({ default: m.ComparePage })));
const BuildPcPage = lazy(() => import('../pages/build-pc/build-pc-page').then((m) => ({ default: m.BuildPcPage })));
const BuildPcSharedViewPage = lazy(() =>
  import('../pages/build-pc/build-pc-shared-view-page').then((m) => ({ default: m.BuildPcSharedViewPage })));

export const storefrontPcbuilderRoutes: RouteDef[] = [
  { path: 'so-sanh', element: ComparePage, layout: 'storefront', seo: 'index', name: 'compare' },
  { path: 'xay-dung-cau-hinh', element: BuildPcPage, layout: 'storefront', seo: 'index', name: 'pcBuilder' },
  {
    path: 'xay-dung-cau-hinh/:code', element: BuildPcSharedViewPage, layout: 'storefront',
    seo: 'noindex', hidden: true, name: 'pcBuilderDetail',
  },
];

export const storefrontPcbuilderRedirects: RedirectDef[] = [
  { from: 'compare', to: ROUTES.COMPARE, layout: 'storefront' },
  { from: 'build-pc', to: ROUTES.PC_BUILDER, layout: 'storefront' },
];
