
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PolicyPage } from './pages/PolicyPage';
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
import { CategoryPage } from './pages/CategoryPage';
import { BackofficeLayout } from './layouts/BackofficeLayout';
import { CommonDashboard } from './pages/backoffice/CommonDashboard';
import { SalePortal } from './pages/backoffice/sale/SalePortal';
import { TechPortal } from './pages/backoffice/tech/TechPortal';
import { AccountingPortal } from './pages/backoffice/accountant/AccountingPortal';
import { InventoryPortal } from './pages/backoffice/inventory/InventoryPortal';
import { HRPortal } from './pages/backoffice/hr/HRPortal';
import { ManagerPortal } from './pages/backoffice/manager/ManagerPortal';
import { AdminPortal } from './pages/backoffice/admin/AdminPortal';
import { WarrantyPortal } from './pages/backoffice/WarrantyPortal';
import { CMSPortal } from './pages/backoffice/CMSPortal';
import { ReportsPortal } from './pages/backoffice/ReportsPortal';
import { ConfigPortal } from './pages/backoffice/ConfigPortal';
import { AdminProductsPage } from './pages/admin/ProductsPage';
import { AdminOrdersPage } from './pages/admin/OrdersPage';
import { AdminUsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentPage } from './pages/PaymentPage';
import { PaymentResultPage } from './pages/PaymentResultPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { RequireAuth } from './components/RequireAuth';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';

const queryClient = new QueryClient();

function App() {
  console.log('App Rendering...');
  return (
    <GoogleOAuthProvider clientId="97898189481-npr89hminm1stncf1tpee4apc1q2gu7g.apps.googleusercontent.com">
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" reverseOrder={false} />
        <BrowserRouter>
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
                  <Route path="payment/success" element={<PaymentResultPage />} />
                  <Route path="payment/failed" element={<PaymentResultPage />} />
                  <Route path="product/:id" element={<ProductDetailsPage />} />
                  <Route path="profile" element={<ProfilePage />} />

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
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="privacy" element={<PrivacyPage />} />
                  <Route path="about" element={<AboutPage />} />
                </Route>

                {/* Backoffice Routes */}
                <Route element={<RequireAuth allowedRoles={['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier']} />}>
                  <Route path="/backoffice" element={<BackofficeLayout />}>
                    <Route index element={<CommonDashboard />} />
                    <Route path="sale" element={<SalePortal />} />
                    <Route path="tech" element={<TechPortal />} />
                    <Route path="inventory" element={<InventoryPortal />} />
                    <Route path="accounting" element={<AccountingPortal />} />
                    <Route path="hr" element={<HRPortal />} />
                    <Route path="warranty" element={<WarrantyPortal />} />
                    <Route path="cms" element={<CMSPortal />} />
                    <Route path="reports" element={<ReportsPortal />} />
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="roles" element={<RolesPage />} />
                    <Route path="products" element={<AdminProductsPage />} />
                    <Route path="orders" element={<AdminOrdersPage />} />
                    <Route path="config" element={<ConfigPortal />} />
                    <Route path="admin" element={<AdminPortal />} />
                    <Route path="manager" element={<ManagerPortal />} />
                  </Route>
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
