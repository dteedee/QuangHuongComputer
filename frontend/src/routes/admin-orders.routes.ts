// Backoffice order management (W3-10 owns this file from here on).
import { lazy } from 'react';
import type { RouteDef } from './route-types';

const AdminOrdersPage = lazy(() => import('../pages/admin/OrdersPage').then((m) => ({ default: m.AdminOrdersPage })));

export const adminOrdersRoutes: RouteDef[] = [
  // No permission before (only the outer "is staff" gate) — kept as-is, exact behaviour parity.
  { path: 'orders', element: AdminOrdersPage, layout: 'backoffice', group: 'sales', icon: 'Receipt', title: 'Đơn hàng', description: 'Quản lý đơn hàng', badgeSource: 'pendingOrders', name: 'orders' },
];
