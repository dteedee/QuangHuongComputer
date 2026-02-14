
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
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RepairPage } from './pages/RepairPage';
import { WarrantyPage } from './pages/WarrantyPage';
import { ChatSupport } from './components/ChatSupport';
import { RootLayout } from './layouts/RootLayout';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { RecruitmentPage } from './pages/RecruitmentPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { CategoryPage } from './pages/CategoryPage';
import { BackofficeLayout } from './layouts/BackofficeLayout';
import { CommonDashboard } from './pages/backoffice/CommonDashboard';
import { SalePortal } from './pages/backoffice/sale/SalePortal';
import { TechPortal } from './pages/backoffice/tech/TechPortal';
import { AccountingPortal } from './pages/backoffice/accountant/AccountingPortal';
import { InventoryPortal } from './pages/backoffice/inventory/InventoryPortal';
import { HRPortal } from './pages/backoffice/hr/HRPortal';
import { RecruitmentManagement } from './pages/backoffice/hr/RecruitmentManagement';
import { ManagerPortal } from './pages/backoffice/manager/ManagerPortal';
import { AdminPortal } from './pages/backoffice/admin/AdminPortal';
import { WarrantyPortal } from './pages/backoffice/WarrantyPortal';
import { CMSPortal } from './pages/backoffice/CMSPortal';
import { ReportsPortal } from './pages/backoffice/ReportsPortal';
import { ConfigPortal } from './pages/backoffice/ConfigPortal';
import { AdminProductsPage } from './pages/admin/ProductsPage';
import { AdminOrdersPage } from './pages/admin/OrdersPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { PermissionsPage as RolesPage } from './pages/backoffice/admin/PermissionsPage';
import { UsersPage as AdminUsersPage } from './pages/backoffice/admin/UsersPage';
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
import { RequireAuth } from './components/RequireAuth';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AdminDashboard from './pages/admin/AdminDashboard';
import POSPage from './pages/backoffice/sale/POSPage';
import { ScrollToTop } from './components/ScrollToTop';

const queryClient = new QueryClient();

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (

    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" reverseOrder={false} />

        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <CartProvider>
              <Routes>
                {/* Main Store Layout */}
                <Route path="/" element={<RootLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="repairs" element={<RepairPage />} />
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
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="recruitment" element={<RecruitmentPage />} />
                  <Route path="recruitment/:id" element={<JobDetailPage />} />

                  {/* Account Routes */}
                  <Route path="account/orders" element={<OrdersPage />} />
                  <Route path="account/orders/:orderId" element={<OrderDetailPage />} />

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
                    <Route path="tech" element={<TechPortal />} />
                    <Route path="inventory" element={<InventoryPortal />} />
                    <Route path="accounting" element={<AccountingPortal />} />
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
                    <Route path="config" element={<ConfigPortal />} />
                    <Route path="admin" element={<AdminPortal />} />
                    <Route path="manager" element={<ManagerPortal />} />
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
                </Route>

                {/* Auth Pages (Standalone) */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
