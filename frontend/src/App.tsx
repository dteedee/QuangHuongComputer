
import { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ComparisonProvider } from './context/ComparisonContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ComparisonBar } from './components/comparison';
import { RequireAuth } from './components/RequireAuth';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ScrollToTop } from './components/ScrollToTop';

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

// Auth pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// Account pages
const OrdersPage = lazy(() => import('./pages/account/OrdersPage').then(m => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('./pages/account/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const NewReturnRequestPage = lazy(() => import('./pages/account/NewReturnRequestPage').then(m => ({ default: m.NewReturnRequestPage })));
const LoyaltyPage = lazy(() => import('./pages/account/LoyaltyPage').then(m => ({ default: m.LoyaltyPage })));

// ---------------------------------------------------------------------------
// Lazy-loaded pages — Backoffice
// ---------------------------------------------------------------------------
const CommonDashboard = lazy(() => import('./pages/backoffice/CommonDashboard').then(m => ({ default: m.CommonDashboard })));
const SalePortal = lazy(() => import('./pages/backoffice/sale/SalePortal').then(m => ({ default: m.SalePortal })));
const POSPage = lazy(() => import('./pages/backoffice/sale/POSPage'));
const ReturnsManagementPage = lazy(() => import('./pages/backoffice/sale/ReturnsManagementPage').then(m => ({ default: m.ReturnsManagementPage })));
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
const HRPortal = lazy(() => import('./pages/backoffice/hr/HRPortal').then(m => ({ default: m.HRPortal })));
const RecruitmentManagement = lazy(() => import('./pages/backoffice/hr/RecruitmentManagement').then(m => ({ default: m.RecruitmentManagement })));
const ManagerPortal = lazy(() => import('./pages/backoffice/manager/ManagerPortal').then(m => ({ default: m.ManagerPortal })));
const AdminPortal = lazy(() => import('./pages/backoffice/admin/AdminPortal').then(m => ({ default: m.AdminPortal })));
const WarrantyPortal = lazy(() => import('./pages/backoffice/WarrantyPortal').then(m => ({ default: m.WarrantyPortal })));
const CMSPortal = lazy(() => import('./pages/backoffice/CMSPortal').then(m => ({ default: m.CMSPortal })));
const ReportsPortal = lazy(() => import('./pages/backoffice/ReportsPortal').then(m => ({ default: m.ReportsPortal })));
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
const RolesPage = lazy(() => import('./pages/backoffice/admin/PermissionsPage').then(m => ({ default: m.PermissionsPage })));
const AdminUsersPage = lazy(() => import('./pages/backoffice/admin/UsersPage').then(m => ({ default: m.UsersPage })));
const ReviewsManagementPage = lazy(() => import('./pages/backoffice/admin/ReviewsManagementPage').then(m => ({ default: m.ReviewsManagementPage })));
const CouponsPage = lazy(() => import('./pages/backoffice/admin/CouponsPage').then(m => ({ default: m.CouponsPage })));
const AuditLogsPage = lazy(() => import('./pages/backoffice/admin/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const FlashSalesPage = lazy(() => import('./pages/admin/FlashSalesPage'));
const SePayAdminPage = lazy(() => import('./pages/admin/PaymentSettingsPage'));

// CRM pages
const CrmPortal = lazy(() => import('./pages/backoffice/crm/CrmPortal'));
const CrmCustomersPage = lazy(() => import('./pages/backoffice/crm/CustomersPage'));
const CrmLeadsPage = lazy(() => import('./pages/backoffice/crm/LeadsPage'));
const LeadPipelinePage = lazy(() => import('./pages/backoffice/crm/LeadPipelinePage'));
const CrmSegmentsPage = lazy(() => import('./pages/backoffice/crm/SegmentsPage'));
const CrmCampaignsPage = lazy(() => import('./pages/backoffice/crm/CampaignsPage'));

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const queryClient = new QueryClient();

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  const effectiveClientId = GOOGLE_CLIENT_ID || 'placeholder.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={effectiveClientId}>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" reverseOrder={false} />

        <BrowserRouter>
          <ScrollToTop />
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
                        <Route path="account/loyalty" element={<LoyaltyPage />} />

                        {/* Category Routes */}
                        <Route path="laptop" element={<CategoryPage />} />
                        <Route path="pc-gaming" element={<CategoryPage />} />
                        <Route path="workstation" element={<CategoryPage />} />
                        <Route path="office" element={<CategoryPage />} />
                        <Route path="components" element={<CategoryPage />} />
                        <Route path="screens" element={<CategoryPage />} />
                        <Route path="search" element={<CategoryPage />} />
                        <Route path="category/:slug" element={<CategoryPage />} />

                        {/* Content Pages */}
                        <Route path="policy/:type" element={<PolicyPage />} />
                        <Route path="post/:slug" element={<PostDetailPage />} />
                        <Route path="contact" element={<ContactPage />} />
                        <Route path="terms" element={<TermsPage />} />
                        <Route path="privacy" element={<PrivacyPage />} />
                        <Route path="about" element={<AboutPage />} />

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
                          <Route path="tech" element={<TechPortal />} />
                          <Route path="tech/work-orders/:id" element={<WorkOrderDetailPage />} />
                          <Route path="inventory" element={<InventoryPortal />} />
                          <Route path="inventory/suppliers" element={<SuppliersPage />} />
                          <Route path="inventory/purchase-orders" element={<PurchaseOrdersPage />} />
                          <Route path="accounting" element={<AccountingPortal />} />
                          <Route path="accounting/ar" element={<ARPage />} />
                          <Route path="accounting/ap" element={<APPage />} />
                          <Route path="accounting/shifts" element={<ShiftsPage />} />
                          <Route path="accounting/expenses" element={<ExpensesPage />} />
                          <Route path="accounting/reports" element={<FinancialReportsPage />} />
                          <Route path="accounting/tax-reports" element={<TaxReportsPage />} />
                          <Route path="hr" element={<HRPortal />} />
                          <Route path="hr/recruitment" element={<RecruitmentManagement />} />
                          <Route path="warranty" element={<WarrantyPortal />} />
                          <Route path="cms" element={<CMSPortal />} />
                          {/* Admin & Report Routes */}
                          <Route path="reports" element={<ReportsPortal />} />
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
                          <Route path="audit-logs" element={<AuditLogsPage />} />
                          <Route path="manager" element={<ManagerPortal />} />
                          <Route path="notifications" element={<NotificationCenter />} />
                          <Route path="system-health" element={<SystemHealthPage />} />
                          <Route path="menus" element={<MenuManager />} />
                          <Route path="homepage-builder" element={<HomepageBuilder />} />
                          <Route path="flash-sales" element={<FlashSalesPage />} />
                          <Route path="payments/sepay" element={<SePayAdminPage />} />
                          
                          {/* CRM Routes */}
                          <Route path="crm" element={<CrmPortal />} />
                          <Route path="crm/customers" element={<CrmCustomersPage />} />
                          <Route path="crm/leads" element={<CrmLeadsPage />} />
                          <Route path="crm/leads/pipeline" element={<LeadPipelinePage />} />
                          <Route path="crm/segments" element={<CrmSegmentsPage />} />
                          <Route path="crm/campaigns" element={<CrmCampaignsPage />} />
                        </Route>
                      </Route>

                      {/* Admin Redirects for backward compatibility */}
                      <Route path="/admin/*" element={<RequireAuth allowedRoles={['Admin', 'Manager']} />}>
                          <Route path="*" element={<Navigate to="/backoffice/admin" replace />} />
                          <Route path="menus" element={<Navigate to="/backoffice/menus" replace />} />
                          <Route path="homepage-builder" element={<Navigate to="/backoffice/homepage-builder" replace />} />
                          <Route path="flash-sales" element={<Navigate to="/backoffice/flash-sales" replace />} />
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
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
