// Backoffice inventory + procurement (W3-12 owns this file from here on).
import { lazy } from 'react';
import type { RouteDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const InventoryPortal = lazy(() => import('../pages/backoffice/inventory/InventoryPortal').then((m) => ({ default: m.InventoryPortal })));
const SuppliersPage = lazy(() => import('../pages/backoffice/inventory/SuppliersPage').then((m) => ({ default: m.SuppliersPage })));
const PurchaseOrdersPage = lazy(() => import('../pages/backoffice/inventory/PurchaseOrdersPage'));
const GoodsReceivedNotesPage = lazy(() => import('../pages/backoffice/inventory/goods-received-notes-page'));
const DeliveryNotesPage = lazy(() => import('../pages/backoffice/inventory/delivery-notes-page'));
const InventoryCountPage = lazy(() => import('../pages/backoffice/inventory/inventory-count-page'));
const PurchaseRequisitionsPage = lazy(() => import('../pages/backoffice/inventory/purchase-requisitions-page'));
const RfqPage = lazy(() => import('../pages/backoffice/inventory/rfq-page'));
const RfqDetailPage = lazy(() => import('../pages/backoffice/inventory/rfq-detail-page'));
const PoApprovalPage = lazy(() => import('../pages/backoffice/inventory/po-approval-page'));
const PurchaseReturnsPage = lazy(() => import('../pages/backoffice/inventory/purchase-returns-page'));
const LandedCostPage = lazy(() => import('../pages/backoffice/inventory/landed-cost-page'));
const SupplierScorecardPage = lazy(() => import('../pages/backoffice/inventory/supplier-scorecard-page'));
const SerialTracePage = lazy(() => import('../pages/backoffice/inventory/serial-trace-page'));

export const backofficeInventoryRoutes: RouteDef[] = [
  // Dashboard — kept at the old exact role set (Supplier included, matching the previous section wrapper).
  { path: 'inventory', element: InventoryPortal, layout: 'backoffice', group: 'sales', icon: 'Box', title: 'Kho hàng', description: 'Quản lý tồn kho', allowedRoles: ['Admin', 'Manager', 'InventoryStaff', 'Supplier'], name: 'inventory' },
  { path: 'inventory/suppliers', element: SuppliersPage, layout: 'backoffice', group: 'sales', icon: 'Building2', title: 'Nhà cung cấp', description: 'Quản lý NCC', permission: PERMISSIONS.INVENTORY_VIEW_SUPPLIER, name: 'inventorySuppliers' },
  { path: 'inventory/purchase-orders', element: PurchaseOrdersPage, layout: 'backoffice', group: 'sales', icon: 'ShoppingCart', title: 'Đơn mua hàng', description: 'Đặt hàng NCC', permission: PERMISSIONS.INVENTORY_VIEW_PURCHASE_ORDER, name: 'purchaseOrders' },
  { path: 'inventory/grn', element: GoodsReceivedNotesPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_RECEIVE_PURCHASE_ORDER, name: 'goodsReceivedNotes' },
  { path: 'inventory/dn', element: DeliveryNotesPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_MANAGE_STOCK, name: 'deliveryNotes' },
  { path: 'inventory/count', element: InventoryCountPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_MANAGE_STOCK, name: 'inventoryCount' },
  { path: 'inventory/purchase-requisitions', element: PurchaseRequisitionsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_CREATE_PURCHASE_ORDER, name: 'purchaseRequisitions' },
  { path: 'inventory/rfq', element: RfqPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_CREATE_PURCHASE_ORDER, name: 'rfq' },
  { path: 'inventory/rfq/:id', element: RfqDetailPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_CREATE_PURCHASE_ORDER, name: 'rfqDetail' },
  { path: 'inventory/po-approval', element: PoApprovalPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_APPROVE_PURCHASE_ORDER, name: 'poApproval' },
  { path: 'inventory/purchase-returns', element: PurchaseReturnsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_MANAGE_STOCK, name: 'purchaseReturns' },
  { path: 'inventory/landed-cost', element: LandedCostPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_MANAGE_STOCK, name: 'landedCost' },
  { path: 'inventory/supplier-scorecard', element: SupplierScorecardPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_VIEW_SUPPLIER, name: 'supplierScorecard' },
  { path: 'inventory/serial-trace', element: SerialTracePage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.INVENTORY_VIEW_STOCK, name: 'serialTrace' },
];
