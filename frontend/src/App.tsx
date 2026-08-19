
import { Suspense, lazy, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ComparisonProvider } from './context/ComparisonContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { ComparisonBar } from './components/comparison';
import { RequireAuth } from './components/RequireAuth';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ScrollToTop } from './components/ScrollToTop';
import AiChatWidget from './components/ai-chat-widget';
import { useAnalyticsTracking } from './hooks/use-analytics-tracking';

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    fontSize: '1rem',
    color: '#888',
  }}>
    <div className="page-loader">
      <svg width="38" height="38" viewBox="0 0 38 38" stroke="#6366f1" style={{ margin: '0 auto', display: 'block' }}>
        <g fill="none" fillRule="evenodd">
          <g transform="translate(1 1)" strokeWidth="2">
            <circle strokeOpacity=".25" cx="18" cy="18" r="18" />
            <path d="M36 18c0-9.94-8.06-18-18-18">
              <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.8s" repeatCount="indefinite" />
            </path>
          </g>
        </g>
      </svg>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Helper: wrap named exports for React.lazy (which requires default export)
// ---------------------------------------------------------------------------
// For named exports we use a small wrapper that re-exports them as default.

// -- Layouts (small, keep eager for shells) --
import { RootLayout } from './layouts/RootLayout';
import { BackofficeLayout } from './layouts/BackofficeLayout';

// ---------------------------------------------------------------------------
// Lazy-loaded pages — Store / Public
// ---------------------------------------------------------------------------
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const RepairPage = lazy(() => import('./pages/RepairPage').then(m => ({ default: m.RepairPage })));
const RepairDetailPage = lazy(() => import('./pages/RepairDetailPage').then(m => ({ default: m.RepairDetailPage })));
const WarrantyPage = lazy(() => import('./pages/WarrantyPage').then(m => ({ default: m.WarrantyPage })));
const SystemHealthPage = lazy(() => import('./pages/backoffice/SystemHealthPage'));
const ChatSupport = lazy(() => import('./components/ChatSupport').then(m => ({ default: m.ChatSupport })));
const CartPage = lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const PaymentPage = lazy(() => import('./pages/PaymentPage').then(m => ({ default: m.PaymentPage })));
const PaymentCallbackPage = lazy(() => import('./pages/PaymentCallbackPage').then(m => ({ default: m.PaymentCallbackPage })));
const PaymentResultPage = lazy(() => import('./pages/PaymentResultPage').then(m => ({ default: m.PaymentResultPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const ProductCatalogPage = lazy(() => import('./pages/ProductCatalogPage'));
const ComparePage = lazy(() => import('./pages/ComparePage').then(m => ({ default: m.ComparePage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then(m => ({ default: m.AccountPage })));
const RecruitmentPage = lazy(() => import('./pages/RecruitmentPage').then(m => ({ default: m.RecruitmentPage })));
const JobDetailPage = lazy(() => import('./pages/JobDetailPage').then(m => ({ default: m.JobDetailPage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then(m => ({ default: m.CategoryPage })));
const PolicyPage = lazy(() => import('./pages/PolicyPage').then(m => ({ default: m.PolicyPage })));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage').then(m => ({ default: m.PostDetailPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const StoresPage = lazy(() => import('./pages/StoresPage'));

// Auth pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// Account pages
const OrdersPage = lazy(() => import('./pages/account/OrdersPage').then(m => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('./pages/account/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const NewReturnRequestPage = lazy(() => import('./pages/account/NewReturnRequestPage').then(m => ({ default: m.NewReturnRequestPage })));
const ReturnRequestDetailPage = lazy(() => import('./pages/account/return-request-detail-page').then(m => ({ default: m.ReturnRequestDetailPage })));
const LoyaltyPage = lazy(() => import('./pages/account/LoyaltyPage').then(m => ({ default: m.LoyaltyPage })));
const AddressBookPage = lazy(() => import('./pages/account/address-book-page'));

// ---------------------------------------------------------------------------
// Lazy-loaded pages — Backoffice
// ---------------------------------------------------------------------------
const CommonDashboard = lazy(() => import('./pages/backoffice/CommonDashboard').then(m => ({ default: m.CommonDashboard })));
const SalePortal = lazy(() => import('./pages/backoffice/sale/SalePortal').then(m => ({ default: m.SalePortal })));
const POSPage = lazy(() => import('./pages/backoffice/sale/POSPage'));
const ReturnsManagementPage = lazy(() => import('./pages/backoffice/sale/ReturnsManagementPage').then(m => ({ default: m.ReturnsManagementPage })));
const ReturnInspectionPage = lazy(() => import('./pages/backoffice/sale/return-inspection-page'));
const ReturnPoliciesPage = lazy(() => import('./pages/backoffice/sale/return-policies-page'));
const WarrantyClaimsPage = lazy(() => import('./pages/backoffice/warranty/warranty-claims-page'));
const WarrantyRmaPage = lazy(() => import('./pages/backoffice/warranty/warranty-rma-page'));
const LoanerDevicesPage = lazy(() => import('./pages/backoffice/warranty/loaner-devices-page'));
const WarrantyPoliciesPage = lazy(() => import('./pages/backoffice/warranty/warranty-policies-page'));
const TechPortal = lazy(() => import('./pages/backoffice/tech/TechPortal').then(m => ({ default: m.TechPortal })));
const WorkOrderDetailPage = lazy(() => import('./pages/backoffice/tech/WorkOrderDetailPage').then(m => ({ default: m.WorkOrderDetailPage })));
const AccountingPortal = lazy(() => import('./pages/backoffice/accountant/AccountingPortal').then(m => ({ default: m.AccountingPortal })));
const ARPage = lazy(() => import('./pages/backoffice/accountant/ARPage').then(m => ({ default: m.ARPage })));
const APPage = lazy(() => import('./pages/backoffice/accountant/APPage').then(m => ({ default: m.APPage })));
const ShiftsPage = lazy(() => import('./pages/backoffice/accountant/ShiftsPage').then(m => ({ default: m.ShiftsPage })));
const ExpensesPage = lazy(() => import('./pages/backoffice/accountant/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const FinancialReportsPage = lazy(() => import('./pages/backoffice/accountant/FinancialReportsPage').then(m => ({ default: m.FinancialReportsPage })));
const TaxReportsPage = lazy(() => import('./pages/backoffice/accountant/TaxReportsPage').then(m => ({ default: m.TaxReportsPage })));
const InventoryPortal = lazy(() => import('./pages/backoffice/inventory/InventoryPortal').then(m => ({ default: m.InventoryPortal })));
const SuppliersPage = lazy(() => import('./pages/backoffice/inventory/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const PurchaseOrdersPage = lazy(() => import('./pages/backoffice/inventory/PurchaseOrdersPage'));
const GoodsReceivedNotesPage = lazy(() => import('./pages/backoffice/inventory/goods-received-notes-page'));
const DeliveryNotesPage = lazy(() => import('./pages/backoffice/inventory/delivery-notes-page'));
const InventoryCountPage = lazy(() => import('./pages/backoffice/inventory/inventory-count-page'));
const PurchaseRequisitionsPage = lazy(() => import('./pages/backoffice/inventory/purchase-requisitions-page'));
const RfqPage = lazy(() => import('./pages/backoffice/inventory/rfq-page'));
const RfqDetailPage = lazy(() => import('./pages/backoffice/inventory/rfq-detail-page'));
const PoApprovalPage = lazy(() => import('./pages/backoffice/inventory/po-approval-page'));
const PurchaseReturnsPage = lazy(() => import('./pages/backoffice/inventory/purchase-returns-page'));
const LandedCostPage = lazy(() => import('./pages/backoffice/inventory/landed-cost-page'));
const SupplierScorecardPage = lazy(() => import('./pages/backoffice/inventory/supplier-scorecard-page'));
const SerialTracePage = lazy(() => import('./pages/backoffice/inventory/serial-trace-page'));
const HRPortal = lazy(() => import('./pages/backoffice/hr/HRPortal').then(m => ({ default: m.HRPortal })));
const RecruitmentManagement = lazy(() => import('./pages/backoffice/hr/RecruitmentManagement').then(m => ({ default: m.RecruitmentManagement })));
const AttendancePage = lazy(() => import('./pages/backoffice/hr/attendance-page'));
const LeaveApprovalPage = lazy(() => import('./pages/backoffice/hr/leave-approval-page'));
const OvertimeApprovalPage = lazy(() => import('./pages/backoffice/hr/overtime-approval-page'));
const EmployeeSelfServicePage = lazy(() => import('./pages/backoffice/hr/employee-self-service-page'));
const InternalChatPage = lazy(() => import('./pages/backoffice/hr/internal-chat-page'));
const HRReportsPage = lazy(() => import('./pages/backoffice/hr/HRReportsPage').then(m => ({ default: m.HRReportsPage })));
const EmployeesPage = lazy(() => import('./pages/backoffice/hr/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const PayrollRunPage = lazy(() => import('./pages/backoffice/hr/payroll-run-page'));
const PayrollDetailPage = lazy(() => import('./pages/backoffice/hr/payroll-detail-page'));
const HrContractsPage = lazy(() => import('./pages/backoffice/hr/contracts-page'));
const SalaryStructurePage = lazy(() => import('./pages/backoffice/hr/salary-structure-page'));
const AttendanceRulesPage = lazy(() => import('./pages/backoffice/hr/attendance-rules-page'));
const EmployeeAssetsPage = lazy(() => import('./pages/backoffice/hr/employee-assets-page'));
const PitFinalizationPage = lazy(() => import('./pages/backoffice/hr/pit-finalization-page'));
const ManagerPortal = lazy(() => import('./pages/backoffice/manager/ManagerPortal').then(m => ({ default: m.ManagerPortal })));
const AdminPortal = lazy(() => import('./pages/backoffice/admin/AdminPortal').then(m => ({ default: m.AdminPortal })));
const WarrantyPortal = lazy(() => import('./pages/backoffice/WarrantyPortal').then(m => ({ default: m.WarrantyPortal })));
const WarrantyReportsPage = lazy(() => import('./pages/backoffice/warranty/WarrantyReportsPage').then(m => ({ default: m.WarrantyReportsPage })));
const CRMReportsPage = lazy(() => import('./pages/backoffice/crm/CRMReportsPage').then(m => ({ default: m.CRMReportsPage })));
const CMSPortal = lazy(() => import('./pages/backoffice/CMSPortal').then(m => ({ default: m.CMSPortal })));
const ReportsPortal = lazy(() => import('./pages/backoffice/ReportsPortal').then(m => ({ default: m.ReportsPortal })));
const ComparisonPage = lazy(() => import('./pages/backoffice/reports/ComparisonPage').then(m => ({ default: m.ComparisonPage })));
const ConfigPortal = lazy(() => import('./pages/backoffice/ConfigPortal').then(m => ({ default: m.ConfigPortal })));
const NotificationCenter = lazy(() => import('./pages/backoffice/NotificationCenter'));

// Admin pages
const AdminProductsPage = lazy(() => import('./pages/admin/ProductsPage').then(m => ({ default: m.AdminProductsPage })));
const AdminOrdersPage = lazy(() => import('./pages/admin/OrdersPage').then(m => ({ default: m.AdminOrdersPage })));
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const BrandsPage = lazy(() => import('./pages/admin/BrandsPage'));
const MenuManager = lazy(() => import('./pages/admin/MenuManager').then(m => ({ default: m.MenuManager })));
const HomepageBuilder = lazy(() => import('./pages/admin/HomepageBuilder').then(m => ({ default: m.HomepageBuilder })));

// Backoffice admin pages
const BackofficeMenuEditor = lazy(() => import('./pages/backoffice/admin/BackofficeMenuEditor').then(m => ({ default: m.BackofficeMenuEditor })));
const TwoFactorSetupPage = lazy(() => import('./pages/backoffice/admin/two-factor-setup-page'));
const SessionsPage = lazy(() => import('./pages/backoffice/admin/sessions-page'));
const DynamicPermissionsPage = lazy(() => import('./pages/backoffice/admin/dynamic-permissions-page'));
const RolesPage = lazy(() => import('./pages/backoffice/admin/PermissionsPage').then(m => ({ default: m.PermissionsPage })));
const AdminUsersPage = lazy(() => import('./pages/backoffice/admin/UsersPage').then(m => ({ default: m.UsersPage })));
const ReviewsManagementPage = lazy(() => import('./pages/backoffice/admin/ReviewsManagementPage').then(m => ({ default: m.ReviewsManagementPage })));
const CouponsPage = lazy(() => import('./pages/backoffice/admin/CouponsPage').then(m => ({ default: m.CouponsPage })));
const AuditLogsPage = lazy(() => import('./pages/backoffice/admin/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const FlashSalesPage = lazy(() => import('./pages/admin/FlashSalesPage'));
const PromotionsPage = lazy(() => import('./pages/admin/PromotionsPage'));
const SePayAdminPage = lazy(() => import('./pages/admin/PaymentSettingsPage'));
const CustomFieldsManager = lazy(() => import('./pages/admin/CustomFieldsManager'));
const FormBuilderPage = lazy(() => import('./pages/admin/FormBuilderPage').then(m => ({ default: m.FormBuilderPage })));
const AutomationRulesPage = lazy(() => import('./pages/admin/AutomationRulesPage').then(m => ({ default: m.AutomationRulesPage })));
const AdminStoresPage = lazy(() => import('./pages/admin/StoresPage'));

// CRM pages
const CrmPortal = lazy(() => import('./pages/backoffice/crm/CrmPortal'));
const CrmCustomersPage = lazy(() => import('./pages/backoffice/crm/CustomersPage'));
const CrmLeadsPage = lazy(() => import('./pages/backoffice/crm/LeadsPage'));
const LeadPipelinePage = lazy(() => import('./pages/backoffice/crm/LeadPipelinePage'));
const CrmSegmentsPage = lazy(() => import('./pages/backoffice/crm/SegmentsPage'));
const CrmCampaignsPage = lazy(() => import('./pages/backoffice/crm/CampaignsPage'));

// ---------------------------------------------------------------------------
// Analytics tracker (must be inside BrowserRouter for useLocation)
// ---------------------------------------------------------------------------
function AnalyticsTracker() {
  useAnalyticsTracking();
  return null;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const queryClient = new QueryClient();

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Bọc children bằng GoogleOAuthProvider chỉ khi có client id thật — tránh
// render provider với placeholder gây lỗi console + nút đăng nhập Google giả.
function OptionalGoogleOAuthProvider({ children }: { children: ReactNode }) {
  if (!GOOGLE_CLIENT_ID) return <>{children}</>;
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}

function App() {
  return (
    <OptionalGoogleOAuthProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" reverseOrder={false} />

        <BrowserRouter>
          <AnalyticsTracker />
          <ScrollToTop />
          <SystemConfigProvider>
          <ConfirmProvider>
          <AuthProvider>
            <ThemeProvider>
              <CartProvider>
                <ComparisonProvider>
                  <ComparisonBar />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Main Store Layout */}
                      <Route path="/" element={<RootLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="repairs" element={<RepairPage />} />
                        <Route path="repair" element={<RepairPage />} />
                        <Route path="repair/:id" element={<RepairDetailPage />} />
                        <Route path="warranty" element={<WarrantyPage />} />
                        <Route path="support" element={<ChatSupport />} />
                        <Route path="cart" element={<CartPage />} />
                        <Route path="checkout" element={<CheckoutPage />} />
                        <Route path="payment/:orderId" element={<PaymentPage />} />
                        <Route path="payment/callback" element={<PaymentCallbackPage />} />
                        <Route path="payment/success" element={<PaymentResultPage />} />
                        <Route path="payment/failed" element={<PaymentResultPage />} />
                        <Route path="san-pham/:slug" element={<ProductDetailPage />} />
                        <Route path="product/:id" element={<ProductDetailPage />} />
                        <Route path="products" element={<ProductCatalogPage />} />
                        <Route path="products/:id" element={<ProductDetailPage />} />
                        <Route path="catalog" element={<ProductCatalogPage />} />
                        <Route path="compare" element={<ComparePage />} />
                        <Route path="profile" element={<AccountPage />} />
                        <Route path="account" element={<AccountPage />} />
                        <Route path="recruitment" element={<RecruitmentPage />} />
                        <Route path="recruitment/:id" element={<JobDetailPage />} />

                        {/* Account Routes */}
                        <Route path="account/orders" element={<OrdersPage />} />
                        <Route path="account/orders/:orderId" element={<OrderDetailPage />} />
                        <Route path="account/returns/new" element={<NewReturnRequestPage />} />
                        <Route path="account/returns/:id" element={<ReturnRequestDetailPage />} />
                        <Route path="account/loyalty" element={<LoyaltyPage />} />
                        <Route path="account/addresses" element={<AddressBookPage />} />

                        {/* Category Routes */}
                        <Route path="laptop" element={<CategoryPage />} />
                        <Route path="pc-gaming" element={<CategoryPage />} />
                        <Route path="workstation" element={<CategoryPage />} />
                        <Route path="components" element={<CategoryPage />} />
                        <Route path="screens" element={<CategoryPage />} />
                        <Route path="search" element={<CategoryPage />} />
                        <Route path="danh-muc/:slug" element={<CategoryPage />} />
                        <Route path="category/:slug" element={<CategoryPage />} />

                        {/* Content Pages */}
                        <Route path="policy/:type" element={<PolicyPage />} />
                        <Route path="post/:slug" element={<PostDetailPage />} />
                        <Route path="contact" element={<ContactPage />} />
                        <Route path="terms" element={<TermsPage />} />
                        <Route path="privacy" element={<PrivacyPage />} />
                        <Route path="about" element={<AboutPage />} />
                        <Route path="stores" element={<StoresPage />} />

                        {/* Redirects for convenience URLs */}
                        <Route path="promotion" element={<Navigate to="/policy/promotions" replace />} />
                        <Route path="promotions" element={<Navigate to="/policy/promotions" replace />} />
                        <Route path="news" element={<Navigate to="/policy/news" replace />} />

                        {/* Payment Callback routes */}
                        <Route path="payment/vnpay-return" element={<PaymentCallbackPage />} />
                        <Route path="payment/momo-return" element={<PaymentCallbackPage />} />
                        <Route path="payment/zalopay-return" element={<PaymentCallbackPage />} />
                      </Route>

                      {/* Backoffice Routes */}
                      <Route element={<RequireAuth allowedRoles={['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier']} />}>
                        <Route path="/backoffice" element={<BackofficeLayout />}>
                          <Route index element={<CommonDashboard />} />
                          <Route path="pos" element={<POSPage />} />
                          <Route path="sale" element={<SalePortal />} />
                          <Route path="returns" element={<ReturnsManagementPage />} />
                          <Route path="sale/return-inspection" element={<ReturnInspectionPage />} />
                          {/* Chính sách đổi trả — chỉ Admin */}
                          <Route element={<RequireAuth allowedRoles={['Admin']} />}>
                              <Route path="sale/return-policies" element={<ReturnPoliciesPage />} />
                          </Route>
                          {/* Bảo hành — Sale/Admin/Manager */}
                          <Route path="warranty/claims" element={<WarrantyClaimsPage />} />
                          <Route path="warranty/rma" element={<WarrantyRmaPage />} />
                          <Route path="warranty/loaner-devices" element={<LoanerDevicesPage />} />
                          <Route element={<RequireAuth allowedRoles={['Admin', 'Manager']} />}>
                              <Route path="warranty/policies" element={<WarrantyPoliciesPage />} />
                          </Route>
                          <Route path="tech" element={<TechPortal />} />
                          <Route path="tech/work-orders/:id" element={<WorkOrderDetailPage />} />
                          <Route path="inventory" element={<InventoryPortal />} />
                          <Route path="inventory/suppliers" element={<SuppliersPage />} />
                          <Route path="inventory/purchase-orders" element={<PurchaseOrdersPage />} />
                          <Route path="inventory/grn" element={<GoodsReceivedNotesPage />} />
                          <Route path="inventory/dn" element={<DeliveryNotesPage />} />
                          <Route path="inventory/count" element={<InventoryCountPage />} />
                          <Route path="inventory/purchase-requisitions" element={<PurchaseRequisitionsPage />} />
                          <Route path="inventory/rfq" element={<RfqPage />} />
                          <Route path="inventory/rfq/:id" element={<RfqDetailPage />} />
                          <Route path="inventory/po-approval" element={<PoApprovalPage />} />
                          <Route path="inventory/purchase-returns" element={<PurchaseReturnsPage />} />
                          <Route path="inventory/landed-cost" element={<LandedCostPage />} />
                          <Route path="inventory/supplier-scorecard" element={<SupplierScorecardPage />} />
                          <Route path="inventory/serial-trace" element={<SerialTracePage />} />
                          <Route path="accounting" element={<AccountingPortal />} />
                          <Route path="accounting/ar" element={<ARPage />} />
                          <Route path="accounting/ap" element={<APPage />} />
                          <Route path="accounting/shifts" element={<ShiftsPage />} />
                          <Route path="accounting/expenses" element={<ExpensesPage />} />
                          <Route path="accounting/reports" element={<FinancialReportsPage />} />
                          <Route path="accounting/tax-reports" element={<TaxReportsPage />} />
                          <Route path="hr" element={<HRPortal />} />
                          <Route path="hr/employees" element={<EmployeesPage />} />
                          <Route path="hr/recruitment" element={<RecruitmentManagement />} />
                          <Route path="hr/attendance" element={<AttendancePage />} />
                          <Route path="hr/approvals" element={<LeaveApprovalPage />} />
                          <Route path="hr/overtime-approval" element={<OvertimeApprovalPage />} />
                          <Route path="hr/self-service" element={<EmployeeSelfServicePage />} />
                          <Route path="hr/chat" element={<InternalChatPage />} />
                          <Route path="hr/reports" element={<HRReportsPage />} />
                          <Route path="hr/contracts" element={<HrContractsPage />} />
                          <Route path="hr/attendance-rules" element={<AttendanceRulesPage />} />
                          <Route path="hr/employee-assets" element={<EmployeeAssetsPage />} />
                          {/* Sensitive: Payroll/Salary/PIT — Admin + HR only */}
                          <Route element={<RequireAuth allowedRoles={['Admin', 'HR']} />}>
                              <Route path="hr/payroll-runs" element={<PayrollRunPage />} />
                              <Route path="hr/payroll/:payrollId" element={<PayrollDetailPage />} />
                              <Route path="hr/salary-structures" element={<SalaryStructurePage />} />
                              <Route path="hr/pit-finalization" element={<PitFinalizationPage />} />
                          </Route>
                          <Route path="warranty" element={<WarrantyPortal />} />
                          <Route path="warranty/reports" element={<WarrantyReportsPage />} />
                          <Route path="crm/reports" element={<CRMReportsPage />} />
                          <Route path="cms" element={<CMSPortal />} />
                          {/* Admin & Report Routes */}
                          <Route path="reports" element={<ReportsPortal />} />
                          <Route path="reports/comparison" element={<ComparisonPage />} />
                          <Route path="users" element={<AdminUsersPage />} />
                          <Route path="roles" element={<RolesPage />} />
                          <Route path="products" element={<AdminProductsPage />} />
                          <Route path="categories" element={<CategoriesPage />} />
                          <Route path="brands" element={<BrandsPage />} />
                          <Route path="orders" element={<AdminOrdersPage />} />
                          <Route path="reviews" element={<ReviewsManagementPage />} />
                          <Route path="coupons" element={<CouponsPage />} />
                          <Route path="config" element={<ConfigPortal />} />
                          <Route path="admin" element={<AdminPortal />} />
                          <Route path="admin/2fa" element={<TwoFactorSetupPage />} />
                          <Route path="admin/sessions" element={<SessionsPage />} />
                          <Route path="admin/dynamic-permissions" element={<DynamicPermissionsPage />} />
                          <Route path="admin/menu-editor" element={<BackofficeMenuEditor />} />
                          <Route path="audit-logs" element={<AuditLogsPage />} />
                          <Route path="manager" element={<ManagerPortal />} />
                          <Route path="notifications" element={<NotificationCenter />} />
                          <Route path="system-health" element={<SystemHealthPage />} />
                          <Route path="menus" element={<MenuManager />} />
                          <Route path="homepage-builder" element={<HomepageBuilder />} />
                          <Route path="flash-sales" element={<FlashSalesPage />} />
                          <Route path="promotions" element={<PromotionsPage />} />
                          <Route path="payments/sepay" element={<SePayAdminPage />} />
                          <Route path="custom-fields" element={<CustomFieldsManager />} />
                          <Route path="form-builder" element={<FormBuilderPage />} />
                          <Route path="automation-rules" element={<AutomationRulesPage />} />

                          {/* CRM Routes */}
                          <Route path="crm" element={<CrmPortal />} />
                          <Route path="crm/customers" element={<CrmCustomersPage />} />
                          <Route path="crm/leads" element={<CrmLeadsPage />} />
                          <Route path="crm/leads/pipeline" element={<LeadPipelinePage />} />
                          <Route path="crm/segments" element={<CrmSegmentsPage />} />
                          <Route path="crm/campaigns" element={<CrmCampaignsPage />} />
                        </Route>
                      </Route>

                      {/* Admin-only dedicated route: Store/Branch management */}
                      <Route element={<RequireAuth allowedRoles={['Admin']} />}>
                          <Route path="/admin/stores" element={<AdminStoresPage />} />
                      </Route>

                      {/* Admin Redirects for backward compatibility */}
                      <Route path="/admin/*" element={<RequireAuth allowedRoles={['Admin', 'Manager']} />}>
                          <Route path="*" element={<Navigate to="/backoffice/admin" replace />} />
                          <Route path="menus" element={<Navigate to="/backoffice/menus" replace />} />
                          <Route path="homepage-builder" element={<Navigate to="/backoffice/homepage-builder" replace />} />
                          <Route path="flash-sales" element={<Navigate to="/backoffice/flash-sales" replace />} />
                          <Route path="promotions" element={<Navigate to="/backoffice/promotions" replace />} />
                      </Route>

                      {/* Auth Pages (Standalone) */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                    </Routes>
                  </Suspense>
                </ComparisonProvider>
              </CartProvider>
            </ThemeProvider>
          </AuthProvider>
          </ConfirmProvider>
          </SystemConfigProvider>
          <AiChatWidget />
        </BrowserRouter>
      </QueryClientProvider>
    </OptionalGoogleOAuthProvider>
  );
}

export default App;
