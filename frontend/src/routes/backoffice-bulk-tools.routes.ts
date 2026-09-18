// W3-16 — bulk tools + printed documents. NOT yet registered in `routes/index.ts` or the
// sidebar config (`backoffice-sidebar-menu-config.ts`) — that file/registry belongs to W3-G
// (phase-75 Next Steps). Filed as integration request; W3-G imports `backofficeBulkToolsRoutes`
// and spreads it into `routes/index.ts` the same way every other wave-3 track's file is spread.
import { lazy } from 'react';
import type { RouteDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const ImportProductsPage = lazy(() => import('../pages/backoffice/bulk-tools/import-products-page'));
const BulkPricePage = lazy(() => import('../pages/backoffice/bulk-tools/bulk-price-page'));
const OpeningStockPage = lazy(() => import('../pages/backoffice/bulk-tools/opening-stock-page'));
const QuickReceivePage = lazy(() => import('../pages/backoffice/bulk-tools/quick-receive-page'));
const LabelsPage = lazy(() => import('../pages/backoffice/print/labels-page'));
const DeliveryNotePage = lazy(() => import('../pages/backoffice/print/delivery-note-page'));
const DepositReceiptPage = lazy(() => import('../pages/backoffice/print/deposit-receipt-page'));

export const backofficeBulkToolsRoutes: RouteDef[] = [
    { path: 'bulk-tools/import-products', element: ImportProductsPage, layout: 'backoffice', group: 'sales', icon: 'Upload', title: 'Nhập sản phẩm', description: 'Nhập/cập nhật sản phẩm từ Excel', permission: PERMISSIONS.CATALOG_IMPORT, name: 'bulkImportProducts' },
    { path: 'bulk-tools/bulk-price', element: BulkPricePage, layout: 'backoffice', group: 'sales', icon: 'Tag', title: 'Đổi giá theo lô', description: 'Áp giá mới cho nhiều sản phẩm', permission: PERMISSIONS.CATALOG_BULK_PRICE, name: 'bulkPrice' },
    { path: 'bulk-tools/opening-stock', element: OpeningStockPage, layout: 'backoffice', group: 'sales', icon: 'PackageOpen', title: 'Nhập tồn đầu kỳ', description: 'Khởi tạo tồn kho ban đầu', permission: PERMISSIONS.INVENTORY_IMPORT_OPENING, name: 'bulkOpeningStock' },
    { path: 'bulk-tools/quick-receive', element: QuickReceivePage, layout: 'backoffice', group: 'sales', icon: 'PackageCheck', title: 'Nhập hàng nhanh', description: 'Nhập hàng mua trực tiếp, không qua PO', permission: PERMISSIONS.INVENTORY_QUICK_RECEIVE, name: 'quickReceive' },
    { path: 'print/labels', element: LabelsPage, layout: 'backoffice', group: 'sales', icon: 'Printer', title: 'In nhãn sản phẩm', description: 'In nhãn mã vạch/QR theo sản phẩm hoặc phiếu nhập', permission: PERMISSIONS.INVENTORY_VIEW_STOCK, name: 'printLabels' },
    { path: 'print/delivery-note/:orderId', element: DeliveryNotePage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.SALES_VIEW_ALL, name: 'printDeliveryNote' },
    { path: 'print/deposit-receipt/:orderId', element: DepositReceiptPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.SALES_VIEW_ALL, name: 'printDepositReceipt' },
];
