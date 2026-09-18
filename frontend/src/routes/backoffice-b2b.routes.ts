// W3-17 — B2B workspace: quotations + instalment applications. NOT yet
// registered in `routes/index.ts` or the sidebar (`backoffice-sidebar-menu-config.ts`)
// — those files belong to W3-G (phase-76 Next Steps / Implementation Steps #8).
// Filed as integration request; W3-G imports `backofficeB2bRoutes` and spreads it
// into `routes/index.ts` the same way every other wave-3 track's file is spread.
import { lazy } from 'react';
import type { RouteDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const QuotationListPage = lazy(() => import('../pages/backoffice/quotations/quotation-list-page'));
const QuotationFormPage = lazy(() => import('../pages/backoffice/quotations/quotation-form-page'));
const QuotationDetailPage = lazy(() => import('../pages/backoffice/quotations/quotation-detail-page'));
const QuotationPrintPage = lazy(() => import('../pages/backoffice/quotations/quotation-print-page'));
const InstallmentQueuePage = lazy(() => import('../pages/backoffice/installments/installment-queue-page'));

export const backofficeB2bRoutes: RouteDef[] = [
    { path: 'quotations', element: QuotationListPage, layout: 'backoffice', group: 'sales', icon: 'FileText', title: 'Báo giá B2B', description: 'Báo giá cho khách doanh nghiệp/đơn vị ngân sách', permission: PERMISSIONS.SALES_QUOTATIONS_VIEW, name: 'quotationList' },
    { path: 'quotations/new', element: QuotationFormPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.SALES_QUOTATIONS_CREATE, name: 'quotationNew' },
    { path: 'quotations/:id', element: QuotationDetailPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.SALES_QUOTATIONS_VIEW, name: 'quotationDetail' },
    { path: 'quotations/:id/edit', element: QuotationFormPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.SALES_QUOTATIONS_EDIT, name: 'quotationEdit' },
    { path: 'quotations/:id/print', element: QuotationPrintPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.SALES_QUOTATIONS_VIEW, name: 'quotationPrint' },
    { path: 'installments', element: InstallmentQueuePage, layout: 'backoffice', group: 'sales', icon: 'Wallet', title: 'Hồ sơ trả góp', description: 'Duyệt/từ chối hồ sơ trả góp của khách', permission: PERMISSIONS.SALES_MANAGE_INSTALLMENTS, name: 'installmentQueue' },
];
