// Backoffice repair + warranty service management (W3-15 owns this file from here on).
import { lazy } from 'react';
import type { RouteDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const TechPortal = lazy(() => import('../pages/backoffice/tech/TechPortal').then((m) => ({ default: m.TechPortal })));
const WorkOrderDetailPage = lazy(() => import('../pages/backoffice/tech/WorkOrderDetailPage').then((m) => ({ default: m.WorkOrderDetailPage })));
const TechniciansDirectoryPage = lazy(() => import('../pages/backoffice/tech/technicians-directory-page'));
const BookingsQueuePage = lazy(() => import('../pages/backoffice/service/bookings-queue-page'));
const WarrantyPortal = lazy(() => import('../pages/backoffice/WarrantyPortal').then((m) => ({ default: m.WarrantyPortal })));
const WarrantyClaimsPage = lazy(() => import('../pages/backoffice/warranty/warranty-claims-page'));
const WarrantyRmaPage = lazy(() => import('../pages/backoffice/warranty/warranty-rma-page'));
const LoanerDevicesPage = lazy(() => import('../pages/backoffice/warranty/loaner-devices-page'));
const WarrantyPoliciesPage = lazy(() => import('../pages/backoffice/warranty/warranty-policies-page'));
const WarrantyReportsPage = lazy(() => import('../pages/backoffice/warranty/WarrantyReportsPage').then((m) => ({ default: m.WarrantyReportsPage })));

export const backofficeServiceRoutes: RouteDef[] = [
  { path: 'tech', element: TechPortal, layout: 'backoffice', group: 'service', icon: 'Hammer', title: 'Sửa chữa', description: 'Quản lý sửa chữa', permission: PERMISSIONS.REPAIR_VIEW_ALL, name: 'tech' },
  { path: 'tech/bookings', element: BookingsQueuePage, layout: 'backoffice', group: 'service', icon: 'Calendar', title: 'Đặt lịch sửa chữa', description: 'Duyệt / chuyển phiếu sửa', permission: PERMISSIONS.REPAIR_VIEW_ALL, name: 'techBookings' },
  { path: 'tech/technicians', element: TechniciansDirectoryPage, layout: 'backoffice', group: 'service', icon: 'UserCog', title: 'Kỹ thuật viên', description: 'Danh sách kỹ thuật viên', permission: PERMISSIONS.REPAIR_ASSIGN_TECHNICIAN, name: 'techTechnicians' },
  { path: 'tech/work-orders/:id', element: WorkOrderDetailPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.REPAIR_VIEW_ALL, name: 'techWorkOrderDetail' },
  { path: 'warranty', element: WarrantyPortal, layout: 'backoffice', group: 'service', icon: 'ShieldCheck', title: 'Bảo hành', description: 'Theo dõi bảo hành', permission: PERMISSIONS.WARRANTY_VIEW_ALL, name: 'warranty' },
  { path: 'warranty/claims', element: WarrantyClaimsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.WARRANTY_VIEW_ALL, name: 'warrantyClaims' },
  { path: 'warranty/rma', element: WarrantyRmaPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.WARRANTY_REVIEW_CLAIM, name: 'warrantyRma' },
  { path: 'warranty/loaner-devices', element: LoanerDevicesPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.WARRANTY_REVIEW_CLAIM, name: 'warrantyLoanerDevices' },
  { path: 'warranty/policies', element: WarrantyPoliciesPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.WARRANTY_MODERATE, name: 'warrantyPolicies' },
  { path: 'warranty/reports', element: WarrantyReportsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.REPORTING_VIEW_REPAIR, name: 'warrantyReports' },
];
