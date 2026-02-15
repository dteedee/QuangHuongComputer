
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PolicyPage } from './pages/PolicyPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ContactPage } from './pages/ContactPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AboutPage } from './pages/AboutPage';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ComparisonProvider } from './context/ComparisonContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RepairPage } from './pages/RepairPage';
import { RepairDetailPage } from './pages/RepairDetailPage';
import { WarrantyPage } from './pages/WarrantyPage';
import { ChatSupport } from './components/ChatSupport';
import { RootLayout } from './layouts/RootLayout';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { AccountPage } from './pages/AccountPage';
import { RecruitmentPage } from './pages/RecruitmentPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { CategoryPage } from './pages/CategoryPage';
import { BackofficeLayout } from './layouts/BackofficeLayout';
import { CommonDashboard } from './pages/backoffice/CommonDashboard';
import { SalePortal } from './pages/backoffice/sale/SalePortal';
import { TechPortal } from './pages/backoffice/tech/TechPortal';
import { WorkOrderDetailPage } from './pages/backoffice/tech/WorkOrderDetailPage';
import { AccountingPortal } from './pages/backoffice/accountant/AccountingPortal';
import { ARPage } from './pages/backoffice/accountant/ARPage';
import { APPage } from './pages/backoffice/accountant/APPage';
import { ShiftsPage } from './pages/backoffice/accountant/ShiftsPage';
import { ExpensesPage } from './pages/backoffice/accountant/ExpensesPage';
import { FinancialReportsPage } from './pages/backoffice/accountant/FinancialReportsPage';
import { InventoryPortal } from './pages/backoffice/inventory/InventoryPortal';
import { HRPortal } from './pages/backoffice/hr/HRPortal';
import { RecruitmentManagement } from './pages/backoffice/hr/RecruitmentManagement';
import { ManagerPortal } from './pages/backoffice/manager/ManagerPortal';
import { AdminPortal } from './pages/backoffice/admin/AdminPortal';
import {
  CrmPortal,
  CustomersPage as CrmCustomersPage,
  LeadsPage as CrmLeadsPage,
  LeadPipelinePage,
  SegmentsPage as CrmSegmentsPage,
  CampaignsPage as CrmCampaignsPage
} from './pages/backoffice/crm';
import { WarrantyPortal } from './pages/backoffice/WarrantyPortal';
import { CMSPortal } from './pages/backoffice/CMSPortal';
import { ReportsPortal } from './pages/backoffice/ReportsPortal';
import { ConfigPortal } from './pages/backoffice/ConfigPortal';
import { AdminProductsPage } from './pages/admin/ProductsPage';
import { AdminOrdersPage } from './pages/admin/OrdersPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { PermissionsPage as RolesPage } from './pages/backoffice/admin/PermissionsPage';
import { UsersPage as AdminUsersPage } from './pages/backoffice/admin/UsersPage';
import { ReviewsManagementPage } from './pages/backoffice/admin/ReviewsManagementPage';
import { CouponsPage } from './pages/backoffice/admin/CouponsPage';
import FlashSalesPage from './pages/admin/FlashSalesPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentPage } from './pages/PaymentPage';
import { PaymentResultPage } from './pages/PaymentResultPage';
import { PaymentCallbackPage } from './pages/PaymentCallbackPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import ProductCatalogPage from './pages/ProductCatalogPage';
import ProductDetailPage from './pages/ProductDetailPage';
import { OrdersPage } from './pages/account/OrdersPage';
import { OrderDetailPage } from './pages/account/OrderDetailPage';
import { NewReturnRequestPage } from './pages/account/NewReturnRequestPage';
import { WishlistPage } from './pages/account/WishlistPage';
import { LoyaltyPage } from './pages/account/LoyaltyPage';
import { ComparePage } from './pages/ComparePage';
import { ComparisonBar } from './components/comparison';
import { RequireAuth } from './components/RequireAuth';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AdminDashboard from './pages/admin/AdminDashboard';
import POSPage from './pages/backoffice/sale/POSPage';
import { ReturnsManagementPage } from './pages/backoffice/sale/ReturnsManagementPage';
import { ScrollToTop } from './components/ScrollToTop';

const queryClient = new QueryClient();

// Google OAuth Client ID - required for Google login functionality
// If not configured, Google login button will show as disabled
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  // Use a placeholder client ID to prevent GoogleOAuthProvider errors
  // The actual login will fail validation on the backend if not properly configured
  const effectiveClientId = GOOGLE_CLIENT_ID || 'placeholder.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={effectiveClientId}>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" reverseOrder={false} />

        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <ThemeProvider>
              <CartProvider>
                <WishlistProvider>
                  <ComparisonProvider>
                    <ComparisonBar />
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
                        <Route path="product/:id" element={<ProductDetailsPage />} />
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
                        <Route path="account/wishlist" element={<WishlistPage />} />
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
                          <Route path="accounting" element={<AccountingPortal />} />
                          <Route path="accounting/ar" element={<ARPage />} />
                          <Route path="accounting/ap" element={<APPage />} />
                          <Route path="accounting/shifts" element={<ShiftsPage />} />
                          <Route path="accounting/expenses" element={<ExpensesPage />} />
                          <Route path="accounting/reports" element={<FinancialReportsPage />} />
                          <Route path="hr" element={<HRPortal />} />
                          <Route path="hr/recruitment" element={<RecruitmentManagement />} />
                          <Route path="warranty" element={<WarrantyPortal />} />
                          <Route path="cms" element={<CMSPortal />} />
                          <Route path="reports" element={<ReportsPortal />} />
                          <Route path="users" element={<AdminUsersPage />} />
                          <Route path="roles" element={<RolesPage />} />
                          <Route path="products" element={<AdminProductsPage />} />
                          <Route path="categories" element={<CategoriesPage />} />
                          <Route path="orders" element={<AdminOrdersPage />} />
                          <Route path="reviews" element={<ReviewsManagementPage />} />
                          <Route path="coupons" element={<CouponsPage />} />
                          <Route path="config" element={<ConfigPortal />} />
                          <Route path="admin" element={<AdminPortal />} />
                          <Route path="manager" element={<ManagerPortal />} />

                          {/* CRM Routes */}
                          <Route path="crm" element={<CrmPortal />} />
                          <Route path="crm/customers" element={<CrmCustomersPage />} />
                          <Route path="crm/leads" element={<CrmLeadsPage />} />
                          <Route path="crm/leads/pipeline" element={<LeadPipelinePage />} />
                          <Route path="crm/segments" element={<CrmSegmentsPage />} />
                          <Route path="crm/campaigns" element={<CrmCampaignsPage />} />
                        </Route>
                      </Route>

                      {/* Admin Routes */}
                      <Route element={<RequireAuth allowedRoles={['Admin', 'Manager']} />}>
                        <Route path="/admin" element={<AdminPortal />} />
                        <Route path="/admin/products" element={<AdminProductsPage />} />
                        <Route path="/admin/products/new" element={<AdminProductsPage />} />
                        <Route path="/admin/orders" element={<AdminOrdersPage />} />
                        <Route path="/admin/orders/:orderId" element={<AdminOrdersPage />} />
                        <Route path="/admin/users" element={<AdminUsersPage />} />
                        <Route path="/admin/roles" element={<RolesPage />} />
                        <Route path="/admin/flash-sales" element={<FlashSalesPage />} />
                      </Route>

                      {/* Auth Pages (Standalone) */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                    </Routes>
                  </ComparisonProvider>
                </WishlistProvider>
              </CartProvider>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
