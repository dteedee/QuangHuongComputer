// Backoffice accounting + finance (W3-13 owns this file).
import { lazy } from 'react';
import type { RouteDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const AccountingPortal = lazy(() => import('../pages/backoffice/accountant/AccountingPortal').then((m) => ({ default: m.AccountingPortal })));
const InvoicesPage = lazy(() => import('../pages/backoffice/accountant/invoices-page').then((m) => ({ default: m.InvoicesPage })));
const InvoiceDetailPage = lazy(() => import('../pages/backoffice/accountant/invoice-detail-page').then((m) => ({ default: m.InvoiceDetailPage })));
const ARPage = lazy(() => import('../pages/backoffice/accountant/ARPage').then((m) => ({ default: m.ARPage })));
const APPage = lazy(() => import('../pages/backoffice/accountant/APPage').then((m) => ({ default: m.APPage })));
const CashBookPage = lazy(() => import('../pages/backoffice/accountant/cash-book-page').then((m) => ({ default: m.CashBookPage })));
const ShiftsPage = lazy(() => import('../pages/backoffice/accountant/ShiftsPage').then((m) => ({ default: m.ShiftsPage })));
const ShiftDetailPage = lazy(() => import('../pages/backoffice/accountant/shift-detail-page').then((m) => ({ default: m.ShiftDetailPage })));
const ExpensesPage = lazy(() => import('../pages/backoffice/accountant/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const EInvoicePage = lazy(() => import('../pages/backoffice/accountant/einvoice-page').then((m) => ({ default: m.EInvoicePage })));
const ReconciliationPage = lazy(() => import('../pages/backoffice/accountant/reconciliation-page').then((m) => ({ default: m.ReconciliationPage })));
const FinancialReportsPage = lazy(() => import('../pages/backoffice/accountant/FinancialReportsPage').then((m) => ({ default: m.FinancialReportsPage })));
const TaxReportsPage = lazy(() => import('../pages/backoffice/accountant/TaxReportsPage').then((m) => ({ default: m.TaxReportsPage })));

export const backofficeAccountingRoutes: RouteDef[] = [
  { path: 'accounting', element: AccountingPortal, layout: 'backoffice', group: 'finance_hr', icon: 'Wallet', title: 'Tài chính', description: 'Kế toán tài chính', permission: PERMISSIONS.ACCOUNTING_VIEW_REPORTS, name: 'accounting' },
  { path: 'accounting/invoices', element: InvoicesPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_VIEW_INVOICES, name: 'accountingInvoices' },
  { path: 'accounting/invoices/:id', element: InvoiceDetailPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_VIEW_INVOICES, name: 'accountingInvoiceDetail' },
  { path: 'accounting/ar', element: ARPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_MANAGE_DEBT, name: 'accountingAr' },
  { path: 'accounting/ap', element: APPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_MANAGE_INVOICES, name: 'accountingAp' },
  { path: 'accounting/cash-book', element: CashBookPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_VIEW_INVOICES, name: 'accountingCashBook' },
  { path: 'accounting/shifts', element: ShiftsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.PAYMENTS_RECONCILE, name: 'accountingShifts' },
  { path: 'accounting/shifts/:id', element: ShiftDetailPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.PAYMENTS_RECONCILE, name: 'accountingShiftDetail' },
  { path: 'accounting/expenses', element: ExpensesPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_MANAGE_EXPENSE, name: 'accountingExpenses' },
  { path: 'accounting/einvoice', element: EInvoicePage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_VIEW_INVOICES, name: 'accountingEInvoice' },
  { path: 'accounting/reconciliation', element: ReconciliationPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.PAYMENTS_RECONCILE, name: 'accountingReconciliation' },
  { path: 'accounting/reports', element: FinancialReportsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_VIEW_REPORTS, name: 'accountingReports' },
  { path: 'accounting/tax-reports', element: TaxReportsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_VIEW_REPORTS, name: 'accountingTaxReports' },
];
