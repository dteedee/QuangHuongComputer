// Backoffice accounting + finance (W3-13 owns this file from here on).
import { lazy } from 'react';
import type { RouteDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const AccountingPortal = lazy(() => import('../pages/backoffice/accountant/AccountingPortal').then((m) => ({ default: m.AccountingPortal })));
const ARPage = lazy(() => import('../pages/backoffice/accountant/ARPage').then((m) => ({ default: m.ARPage })));
const APPage = lazy(() => import('../pages/backoffice/accountant/APPage').then((m) => ({ default: m.APPage })));
const ShiftsPage = lazy(() => import('../pages/backoffice/accountant/ShiftsPage').then((m) => ({ default: m.ShiftsPage })));
const ExpensesPage = lazy(() => import('../pages/backoffice/accountant/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const FinancialReportsPage = lazy(() => import('../pages/backoffice/accountant/FinancialReportsPage').then((m) => ({ default: m.FinancialReportsPage })));
const TaxReportsPage = lazy(() => import('../pages/backoffice/accountant/TaxReportsPage').then((m) => ({ default: m.TaxReportsPage })));

export const backofficeAccountingRoutes: RouteDef[] = [
  { path: 'accounting', element: AccountingPortal, layout: 'backoffice', group: 'finance_hr', icon: 'Wallet', title: 'Tài chính', description: 'Kế toán tài chính', permission: PERMISSIONS.ACCOUNTING_VIEW_REPORTS, name: 'accounting' },
  { path: 'accounting/ar', element: ARPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_MANAGE_DEBT, name: 'accountingAr' },
  { path: 'accounting/ap', element: APPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_MANAGE_INVOICES, name: 'accountingAp' },
  { path: 'accounting/shifts', element: ShiftsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.PAYMENTS_RECONCILE, name: 'accountingShifts' },
  { path: 'accounting/expenses', element: ExpensesPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_MANAGE_EXPENSE, name: 'accountingExpenses' },
  { path: 'accounting/reports', element: FinancialReportsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_VIEW_REPORTS, name: 'accountingReports' },
  { path: 'accounting/tax-reports', element: TaxReportsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.ACCOUNTING_VIEW_REPORTS, name: 'accountingTaxReports' },
];
