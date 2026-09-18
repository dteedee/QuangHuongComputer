// Backoffice core/system — dashboard, users, roles, config, reports, legacy /admin/* aliases
// (W3-11 owns this file from here on).
import { lazy } from 'react';
import type { RouteDef, RedirectDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const CommonDashboard = lazy(() => import('../pages/backoffice/CommonDashboard').then((m) => ({ default: m.CommonDashboard })));
const AdminPortal = lazy(() => import('../pages/backoffice/admin/AdminPortal').then((m) => ({ default: m.AdminPortal })));
const ManagerPortal = lazy(() => import('../pages/backoffice/manager/ManagerPortal').then((m) => ({ default: m.ManagerPortal })));
const AdminUsersPage = lazy(() => import('../pages/backoffice/admin/UsersPage').then((m) => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import('../pages/backoffice/admin/PermissionsPage').then((m) => ({ default: m.PermissionsPage })));
const ConfigPortal = lazy(() => import('../pages/backoffice/ConfigPortal').then((m) => ({ default: m.ConfigPortal })));
const AuditLogsPage = lazy(() => import('../pages/backoffice/admin/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const BackofficeMenuEditor = lazy(() => import('../pages/backoffice/admin/BackofficeMenuEditor').then((m) => ({ default: m.BackofficeMenuEditor })));
const TwoFactorSetupPage = lazy(() => import('../pages/backoffice/admin/two-factor-setup-page'));
const SessionsPage = lazy(() => import('../pages/backoffice/admin/sessions-page'));
const SystemHealthPage = lazy(() => import('../pages/backoffice/SystemHealthPage'));
const NotificationCenter = lazy(() => import('../pages/backoffice/NotificationCenter'));
const SePayAdminPage = lazy(() => import('../pages/admin/PaymentSettingsPage'));
const ReportsPortal = lazy(() => import('../pages/backoffice/ReportsPortal').then((m) => ({ default: m.ReportsPortal })));
const ComparisonPage = lazy(() => import('../pages/backoffice/reports/ComparisonPage').then((m) => ({ default: m.ComparisonPage })));
const AdminStoresPage = lazy(() => import('../pages/admin/StoresPage'));

export const adminSystemRoutes: RouteDef[] = [
  { path: '', element: CommonDashboard, layout: 'backoffice', hidden: true, name: 'dashboard' },
  { path: 'admin', element: AdminPortal, layout: 'backoffice', group: 'admin', icon: 'Settings', title: 'Trang quản trị', description: 'Tổng quan hệ thống', hidden: true, name: 'adminHub' },
  { path: 'manager', element: ManagerPortal, layout: 'backoffice', hidden: true, name: 'manager' },
  { path: 'users', element: AdminUsersPage, layout: 'backoffice', group: 'admin', icon: 'Users', title: 'Người dùng', description: 'Quản lý tài khoản', allowedRoles: ['Admin'], name: 'users' },
  { path: 'roles', element: RolesPage, layout: 'backoffice', group: 'admin', icon: 'Lock', title: 'Vai trò & Quyền', description: 'Phân quyền', permission: PERMISSIONS.ROLES_VIEW, name: 'roles' },
  { path: 'config', element: ConfigPortal, layout: 'backoffice', group: 'admin', icon: 'Settings', title: 'Cấu hình', description: 'Cài đặt hệ thống', permission: PERMISSIONS.SYSTEM_MANAGE_CONFIG, name: 'config' },
  { path: 'audit-logs', element: AuditLogsPage, layout: 'backoffice', group: 'admin', icon: 'Activity', title: 'Nhật ký & Backup', description: 'Log hoạt động & sao lưu', permission: PERMISSIONS.SYSTEM_VIEW_LOGS, name: 'auditLogs' },
  // No `Permissions.*` entry covers "edit the backoffice nav itself" — Admin-only escape hatch.
  { path: 'admin/menu-editor', element: BackofficeMenuEditor, layout: 'backoffice', group: 'admin', icon: 'LayoutList', title: 'Quản lý Menu', description: 'Chỉnh sửa menu backoffice', allowedRoles: ['Admin'], name: 'menuEditor' },
  { path: 'admin/2fa', element: TwoFactorSetupPage, layout: 'backoffice', hidden: true, name: 'twoFactorSetup' },
  { path: 'admin/sessions', element: SessionsPage, layout: 'backoffice', hidden: true, name: 'sessions' },
  { path: 'system-health', element: SystemHealthPage, layout: 'backoffice', group: 'admin', icon: 'Activity', title: 'Trạng thái', description: 'Health & Monitor', permission: PERMISSIONS.SYSTEM_VIEW_CONFIG, name: 'systemHealth' },
  { path: 'notifications', element: NotificationCenter, layout: 'backoffice', hidden: true, name: 'notifications' },
  { path: 'payments/sepay', element: SePayAdminPage, layout: 'backoffice', group: 'admin', icon: 'CreditCard', title: 'Thanh toán SePay', description: 'Cấu hình & Giao dịch', permission: PERMISSIONS.PAYMENTS_CONFIGURE, name: 'sepay' },
  { path: 'reports', element: ReportsPortal, layout: 'backoffice', group: 'admin', icon: 'BarChart3', title: 'Báo cáo', description: 'Thống kê & báo cáo', permission: PERMISSIONS.REPORTING_VIEW_SALES, name: 'reports' },
  { path: 'reports/comparison', element: ComparisonPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.REPORTING_VIEW_SALES, name: 'reportsComparison' },
  // Moved from the standalone `/admin/stores` (outside any layout, D11/phase-17 step 5) into the
  // backoffice shell. No `Permissions.*` entry for store/branch management — Admin-only, matches
  // the old dedicated `<RequireAuth allowedRoles={['Admin']}>` wrapper exactly.
  { path: 'stores', element: AdminStoresPage, layout: 'backoffice', group: 'admin', icon: 'Building2', title: 'Chi nhánh', description: 'Cửa hàng & kho', allowedRoles: ['Admin'], name: 'stores' },
];

// Legacy top-level `/admin/*` bookmarks (pre-dates the backoffice shell) — ungated redirects; the
// destination page enforces its own gate, so this is at most one extra hop, never a privilege gap.
export const adminSystemRedirects: RedirectDef[] = [
  { from: 'admin/stores', to: '/backoffice/stores', layout: 'standalone' },
  { from: 'admin/menus', to: '/backoffice/menus', layout: 'standalone' },
  { from: 'admin/homepage-builder', to: '/backoffice/homepage-builder', layout: 'standalone' },
  { from: 'admin/flash-sales', to: '/backoffice/promotions?type=FlashSale', layout: 'standalone' },
  { from: 'admin/promotions', to: '/backoffice/promotions', layout: 'standalone' },
  { from: 'admin/dynamic-permissions', to: '/backoffice/roles', layout: 'backoffice' },
  { from: 'admin/*', to: '/backoffice/admin', layout: 'standalone' },
];
