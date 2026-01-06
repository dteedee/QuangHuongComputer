
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PolicyPage } from './pages/PolicyPage';
import { ContactPage } from './pages/ContactPage';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RepairPage } from './pages/RepairPage';
import { WarrantyPage } from './pages/WarrantyPage';
import { ChatSupport } from './components/ChatSupport';
import { RootLayout } from './layouts/RootLayout';
import { HomePage } from './pages/HomePage';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/DashboardPage';
import { AdminProductsPage } from './pages/admin/ProductsPage';
import { AdminOrdersPage } from './pages/admin/OrdersPage';
import { AdminUsersPage } from './pages/admin/UsersPage';
import { RequireAuth } from './components/RequireAuth';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { ProfilePage } from './pages/ProfilePage';
import { CategoryPage } from './pages/CategoryPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
                <Route path="product/:id" element={<ProductDetailsPage />} />
                <Route path="profile" element={<ProfilePage />} />

                {/* Category Routes */}
                <Route path="laptop" element={<CategoryPage />} />
                <Route path="pc-gaming" element={<CategoryPage />} />
                <Route path="workstation" element={<CategoryPage />} />
                <Route path="office" element={<CategoryPage />} />
                <Route path="components" element={<CategoryPage />} />
                <Route path="screens" element={<CategoryPage />} />
                <Route path="category/:slug" element={<CategoryPage />} />

                {/* Content Pages */}
                <Route path="policy/:type" element={<PolicyPage />} />
                <Route path="contact" element={<ContactPage />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<RequireAuth allowedRoles={['Admin']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                </Route>
              </Route>

              {/* Auth Pages (Standalone) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}


export default App;
