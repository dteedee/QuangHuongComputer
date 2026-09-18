// Backoffice POS + sales + returns (W3-5 owns this file from here on).
import { lazy } from 'react';
import type { RouteDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const PosPage = lazy(() => import('../pages/backoffice/pos/pos-page'));
const SalePortal = lazy(() => import('../pages/backoffice/sale/SalePortal').then((m) => ({ default: m.SalePortal })));
const ReturnsPage = lazy(() => import('../pages/backoffice/sale/returns-page'));
const ReturnInspectionPage = lazy(() => import('../pages/backoffice/sale/return-inspection-page'));
const LoyaltyAdminPage = lazy(() => import('../pages/backoffice/sale/loyalty-admin-page'));
const ReturnPoliciesPage = lazy(() => import('../pages/backoffice/sale/return-policies-page'));

export const backofficePosSalesRoutes: RouteDef[] = [
  { path: 'pos', element: PosPage, layout: 'backoffice', group: 'sales', icon: 'Store', title: 'Bán hàng (POS)', description: 'Quầy thu ngân', permission: PERMISSIONS.SALES_POS, name: 'pos' },
  { path: 'sale', element: SalePortal, layout: 'backoffice', hidden: true, permission: PERMISSIONS.SALES_VIEW_ALL, name: 'salePortal' },
  { path: 'returns', element: ReturnsPage, layout: 'backoffice', group: 'sales', icon: 'RefreshCw', title: 'Đổi trả', description: 'Quản lý đổi trả đơn hàng', permission: PERMISSIONS.SALES_VIEW_RETURNS, name: 'returns' },
  { path: 'sale/return-inspection', element: ReturnInspectionPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.SALES_VIEW_RETURNS, name: 'returnInspection' },
  { path: 'sale/loyalty', element: LoyaltyAdminPage, layout: 'backoffice', group: 'sales', icon: 'Star', title: 'Điểm thưởng', description: 'Thành viên, hạng và điều chỉnh điểm', permission: PERMISSIONS.SALES_VIEW_ALL, name: 'loyaltyAdmin' },
  // Admin-only before (policy config) — no clean `Permissions.*` match, escape hatch.
  { path: 'sale/return-policies', element: ReturnPoliciesPage, layout: 'backoffice', hidden: true, allowedRoles: ['Admin'], name: 'returnPolicies' },
];
