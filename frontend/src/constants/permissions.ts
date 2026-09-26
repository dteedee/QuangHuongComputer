// GENERATED FILE - do not hand-edit the PERMISSIONS block below.
// Source: plans/260917-2100-full-system-overhaul/reports/w1-1-permissions.json via
// constants/permissions-catalog.ts. Every route def, <Can permission="...">, and RequireAuth
// check must import a key from here instead of hand-typing the 'Permissions.X.Y' string
// (phase-17-w1-fe-app-shell.md Risk Assessment: "Permission strings drifting from the backend").
import { PERMISSIONS_CATALOG, type PermissionCatalogEntry } from './permissions-catalog';

export type { PermissionCatalogEntry } from './permissions-catalog';
export { PERMISSIONS_CATALOG } from './permissions-catalog';

/** Flat map of SCREAMING_SNAKE const name -> literal backend permission key. */
export const PERMISSIONS = {
  CATALOG_VIEW: 'Permissions.Catalog.View',
  CATALOG_CREATE: 'Permissions.Catalog.Create',
  CATALOG_EDIT: 'Permissions.Catalog.Edit',
  CATALOG_DELETE: 'Permissions.Catalog.Delete',
  CATALOG_MANAGE: 'Permissions.Catalog.Manage',
  CATALOG_EXPORT: 'Permissions.Catalog.Export',
  CATALOG_IMPORT: 'Permissions.Catalog.Import',
  CATALOG_BULK_PRICE: 'Permissions.Catalog.BulkPrice',
  SALES_VIEW_OWN: 'Permissions.Sales.ViewOwn',
  SALES_VIEW_ALL: 'Permissions.Sales.ViewAll',
  SALES_MANAGE_ALL: 'Permissions.Sales.ManageAll',
  SALES_CHECKOUT: 'Permissions.Sales.Checkout',
  SALES_UPDATE_STATUS: 'Permissions.Sales.UpdateStatus',
  SALES_CANCEL_ORDER: 'Permissions.Sales.CancelOrder',
  SALES_VIEW_RETURNS: 'Permissions.Sales.ViewReturns',
  SALES_MANAGE_RETURNS: 'Permissions.Sales.ManageReturns',
  SALES_POS: 'Permissions.Sales.Pos',
  SALES_EXPORT: 'Permissions.Sales.Export',
  SALES_SELL_ON_CREDIT: 'Permissions.Sales.SellOnCredit',
  SALES_TAKE_DEPOSIT: 'Permissions.Sales.TakeDeposit',
  SALES_MANAGE_INSTALLMENTS: 'Permissions.Sales.ManageInstallments',
  SALES_QUOTATIONS_VIEW: 'Permissions.Sales.Quotations.View',
  SALES_QUOTATIONS_CREATE: 'Permissions.Sales.Quotations.Create',
  SALES_QUOTATIONS_EDIT: 'Permissions.Sales.Quotations.Edit',
  SALES_QUOTATIONS_APPROVE: 'Permissions.Sales.Quotations.Approve',
  INVENTORY_VIEW_STOCK: 'Permissions.Inventory.ViewStock',
  INVENTORY_MANAGE_STOCK: 'Permissions.Inventory.ManageStock',
  INVENTORY_ADJUST_STOCK: 'Permissions.Inventory.AdjustStock',
  INVENTORY_VIEW_SUPPLIER: 'Permissions.Inventory.ViewSupplier',
  INVENTORY_CREATE_SUPPLIER: 'Permissions.Inventory.CreateSupplier',
  INVENTORY_UPDATE_SUPPLIER: 'Permissions.Inventory.UpdateSupplier',
  INVENTORY_DELETE_SUPPLIER: 'Permissions.Inventory.DeleteSupplier',
  INVENTORY_VIEW_PURCHASE_ORDER: 'Permissions.Inventory.ViewPurchaseOrder',
  INVENTORY_CREATE_PURCHASE_ORDER: 'Permissions.Inventory.CreatePurchaseOrder',
  INVENTORY_APPROVE_PURCHASE_ORDER: 'Permissions.Inventory.ApprovePurchaseOrder',
  INVENTORY_RECEIVE_PURCHASE_ORDER: 'Permissions.Inventory.ReceivePurchaseOrder',
  INVENTORY_VIEW_RESERVATIONS: 'Permissions.Inventory.ViewReservations',
  INVENTORY_APPROVE: 'Permissions.Inventory.Approve',
  INVENTORY_IMPORT_OPENING: 'Permissions.Inventory.ImportOpening',
  INVENTORY_QUICK_RECEIVE: 'Permissions.Inventory.QuickReceive',
  INVENTORY_EXPORT: 'Permissions.Inventory.Export',
  PAYMENTS_VIEW: 'Permissions.Payments.View',
  PAYMENTS_RECONCILE: 'Permissions.Payments.Reconcile',
  PAYMENTS_REFUND: 'Permissions.Payments.Refund',
  PAYMENTS_COLLECT_COD: 'Permissions.Payments.CollectCod',
  PAYMENTS_CONFIGURE: 'Permissions.Payments.Configure',
  REPAIR_BOOK: 'Permissions.Repair.Book',
  REPAIR_VIEW_OWN: 'Permissions.Repair.ViewOwn',
  REPAIR_VIEW_ALL: 'Permissions.Repair.ViewAll',
  REPAIR_UPDATE_STATUS: 'Permissions.Repair.UpdateStatus',
  REPAIR_ASSIGN_TECHNICIAN: 'Permissions.Repair.AssignTechnician',
  REPAIR_CREATE_QUOTE: 'Permissions.Repair.CreateQuote',
  REPAIR_APPROVE_QUOTE: 'Permissions.Repair.ApproveQuote',
  REPAIR_COMPLETE: 'Permissions.Repair.Complete',
  REPAIR_MANAGE_SERVICE_TYPES: 'Permissions.Repair.ManageServiceTypes',
  WARRANTY_SUBMIT_CLAIM: 'Permissions.Warranty.SubmitClaim',
  WARRANTY_VIEW_OWN: 'Permissions.Warranty.ViewOwn',
  WARRANTY_VIEW_ALL: 'Permissions.Warranty.ViewAll',
  WARRANTY_REVIEW_CLAIM: 'Permissions.Warranty.ReviewClaim',
  WARRANTY_APPROVE_CLAIM: 'Permissions.Warranty.ApproveClaim',
  WARRANTY_MODERATE: 'Permissions.Warranty.Moderate',
  CONTENT_VIEW_PAGES: 'Permissions.Content.ViewPages',
  CONTENT_MANAGE_PAGES: 'Permissions.Content.ManagePages',
  CONTENT_VIEW_POSTS: 'Permissions.Content.ViewPosts',
  CONTENT_MANAGE_POSTS: 'Permissions.Content.ManagePosts',
  CONTENT_VIEW_COUPONS: 'Permissions.Content.ViewCoupons',
  CONTENT_MANAGE_COUPONS: 'Permissions.Content.ManageCoupons',
  CONTENT_VIEW_BANNERS: 'Permissions.Content.ViewBanners',
  CONTENT_MANAGE_BANNERS: 'Permissions.Content.ManageBanners',
  CONTENT_MANAGE_MEDIA: 'Permissions.Content.ManageMedia',
  CONTENT_MANAGE_MENUS: 'Permissions.Content.ManageMenus',
  CONTENT_MANAGE_CONTACTS: 'Permissions.Content.ManageContacts',
  CONTENT_VIEW_REDIRECTS: 'Permissions.Content.ViewRedirects',
  CONTENT_MANAGE_REDIRECTS: 'Permissions.Content.ManageRedirects',
  CRM_VIEW_CUSTOMERS: 'Permissions.CRM.ViewCustomers',
  CRM_MANAGE_CUSTOMERS: 'Permissions.CRM.ManageCustomers',
  CRM_VIEW_LEADS: 'Permissions.CRM.ViewLeads',
  CRM_MANAGE_LEADS: 'Permissions.CRM.ManageLeads',
  CRM_VIEW_SEGMENTS: 'Permissions.CRM.ViewSegments',
  CRM_MANAGE_SEGMENTS: 'Permissions.CRM.ManageSegments',
  CRM_VIEW_ANALYTICS: 'Permissions.CRM.ViewAnalytics',
  CRM_MANAGE_TASKS: 'Permissions.CRM.ManageTasks',
  CRM_VIEW_CAMPAIGNS: 'Permissions.CRM.ViewCampaigns',
  CRM_MANAGE_CAMPAIGNS: 'Permissions.CRM.ManageCampaigns',
  CRM_SEND_CAMPAIGNS: 'Permissions.CRM.SendCampaigns',
  ACCOUNTING_VIEW_INVOICES: 'Permissions.Accounting.ViewInvoices',
  ACCOUNTING_CREATE_INVOICE: 'Permissions.Accounting.CreateInvoice',
  ACCOUNTING_EDIT_INVOICE: 'Permissions.Accounting.EditInvoice',
  ACCOUNTING_DELETE_INVOICE: 'Permissions.Accounting.DeleteInvoice',
  ACCOUNTING_MANAGE_INVOICES: 'Permissions.Accounting.ManageInvoices',
  ACCOUNTING_APPROVE_CREDIT: 'Permissions.Accounting.ApproveCredit',
  ACCOUNTING_MANAGE_DEBT: 'Permissions.Accounting.ManageDebt',
  ACCOUNTING_MANAGE_EXPENSE: 'Permissions.Accounting.ManageExpense',
  ACCOUNTING_VIEW_REPORTS: 'Permissions.Accounting.ViewReports',
  ACCOUNTING_EXPORT: 'Permissions.Accounting.Export',
  HR_VIEW_EMPLOYEES: 'Permissions.HR.ViewEmployees',
  HR_MANAGE_EMPLOYEES: 'Permissions.HR.ManageEmployees',
  HR_VIEW_ATTENDANCE: 'Permissions.HR.ViewAttendance',
  HR_MANAGE_ATTENDANCE: 'Permissions.HR.ManageAttendance',
  HR_APPROVE_LEAVE: 'Permissions.HR.ApproveLeave',
  HR_VIEW_PAYROLL: 'Permissions.HR.ViewPayroll',
  HR_MANAGE_PAYROLL: 'Permissions.HR.ManagePayroll',
  HR_MANAGE_STATUTORY_PARAMETERS: 'Permissions.HR.ManageStatutoryParameters',
  USERS_VIEW: 'Permissions.Users.View',
  USERS_CREATE: 'Permissions.Users.Create',
  USERS_EDIT: 'Permissions.Users.Edit',
  USERS_DELETE: 'Permissions.Users.Delete',
  USERS_MANAGE_ROLES: 'Permissions.Users.ManageRoles',
  ROLES_VIEW: 'Permissions.Roles.View',
  ROLES_CREATE: 'Permissions.Roles.Create',
  ROLES_EDIT: 'Permissions.Roles.Edit',
  ROLES_DELETE: 'Permissions.Roles.Delete',
  REPORTING_VIEW_SALES: 'Permissions.Reporting.ViewSales',
  REPORTING_VIEW_INVENTORY: 'Permissions.Reporting.ViewInventory',
  REPORTING_VIEW_FINANCIAL: 'Permissions.Reporting.ViewFinancial',
  REPORTING_VIEW_REPAIR: 'Permissions.Reporting.ViewRepair',
  REPORTING_VIEW_HR: 'Permissions.Reporting.ViewHR',
  REPORTING_EXPORT_REPORTS: 'Permissions.Reporting.ExportReports',
  SYSTEM_VIEW_CONFIG: 'Permissions.System.ViewConfig',
  SYSTEM_MANAGE_CONFIG: 'Permissions.System.ManageConfig',
  SYSTEM_VIEW_LOGS: 'Permissions.System.ViewLogs',
  SYSTEM_MANAGE_LOGS: 'Permissions.System.ManageLogs',
  SYSTEM_MANAGE_BACKUPS: 'Permissions.System.ManageBackups',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Roles the backend grants a permission to today (mirrors `PERMISSIONS_CATALOG[].roles`). */
export function rolesForPermission(permission: string): readonly string[] {
  return PERMISSIONS_CATALOG.find((p) => p.key === permission)?.roles ?? [];
}

/** True if `userRoles` contains at least one role the catalog grants `permission` to. */
export function roleListHasPermission(userRoles: readonly string[], permission: string): boolean {
  const granted = rolesForPermission(permission);
  return userRoles.some((r) => granted.includes(r));
}

/** Vietnamese module display name + description for one permission key (admin UI use). */
export function getPermissionInfo(key: string): Pick<PermissionCatalogEntry, 'key' | 'displayName' | 'module' | 'moduleDisplayName'> {
  const entry = PERMISSIONS_CATALOG.find((p) => p.key === key);
  if (entry) return entry;
  const parts = key.split('.');
  return { key, displayName: parts[parts.length - 1] ?? key, module: parts[1] ?? 'Khác', moduleDisplayName: parts[1] ?? 'Khác' };
}

/** Groups a flat permission-key list by module, in catalog module order (admin UI use). */
export function groupPermissionsByModule(keys: readonly string[]): Record<string, PermissionCatalogEntry[]> {
  const grouped: Record<string, PermissionCatalogEntry[]> = {};
  for (const key of keys) {
    const entry = PERMISSIONS_CATALOG.find((p) => p.key === key);
    if (!entry) continue;
    (grouped[entry.moduleDisplayName] ??= []).push(entry);
  }
  return grouped;
}

/**
 * The ONE permission check, shared by `AuthContext.hasPermission` and `usePermissions().hasPermission`
 * (previously two copies of the same three lines — DRY). Admin bypasses every check, matching the
 * backend's own `Admin` superuser behaviour (see `BuildingBlocks/Security/PermissionRegistry.cs`).
 */
export function userHasPermission(
  roles: readonly string[] | undefined,
  permissions: readonly string[] | undefined,
  permission: string,
): boolean {
  if (!roles || roles.length === 0) return false;
  if (roles.includes('Admin')) return true;
  return permissions?.includes(permission) ?? false;
}
