import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider } from '../../context/CartContext';
import App from '../../App';

// Mock API calls
vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('../../api/catalog', () => ({
  getProducts: vi.fn(() => Promise.resolve({ data: [] })),
  getCategories: vi.fn(() => Promise.resolve({ data: [] })),
}));

describe('End-to-End User Flows', () => {
  let queryClient: QueryClient;

  const renderApp = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Authentication Flow', () => {
    it('complete login flow - from home to dashboard', async () => {
      const user = userEvent.setup();
      renderApp();

      // 1. Navigate to login page
      const loginLink = screen.getByRole('link', { name: /login|đăng nhập/i });
      await user.click(loginLink);

      // 2. Verify login page is displayed
      expect(screen.getByRole('heading', { name: /login|đăng nhập/i })).toBeInTheDocument();

      // 3. Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password|mật khẩu/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // 4. Submit login form
      const loginButton = screen.getByRole('button', { name: /login|đăng nhập/i });
      await user.click(loginButton);

      // 5. Verify successful login - redirected to dashboard
      await waitFor(() => {
        expect(screen.getByText(/dashboard|tổng quan/i)).toBeInTheDocument();
      });
    });

    it('displays error on failed login', async () => {
      const user = userEvent.setup();

      // Mock failed login
      const authModule = await import('../../api/auth');
      vi.spyOn(authModule, 'login').mockRejectedValue(new Error('Invalid credentials'));

      renderApp();

      // Navigate to login
      const loginLink = screen.getByRole('link', { name: /login|đăng nhập/i });
      await user.click(loginLink);

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /login|đăng nhập/i }));

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/invalid|lỗi/i)).toBeInTheDocument();
      });
    });

    it('logout flow and redirect to home', async () => {
      const user = userEvent.setup();

      // Setup logged in state
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: '1',
        name: 'Test User',
        roles: ['Admin'],
      }));

      renderApp();

      // Click logout
      const logoutButton = screen.getByRole('button', { name: /logout|đăng xuất/i });
      await user.click(logoutButton);

      // Verify redirect to home
      await waitFor(() => {
        expect(window.location.pathname).toBe('/');
      });
    });
  });

  describe('Product Browsing Flow', () => {
    it('browse products from home page', async () => {
      const user = userEvent.setup();

      // Mock products data
      const catalogModule = await import('../../api/catalog');
      vi.spyOn(catalogModule, 'getProducts').mockResolvedValue({
        data: [
          {
            id: '1',
            name: 'Laptop Gaming',
            price: 25000000,
            image: 'laptop.jpg',
            category: 'laptop',
          },
          {
            id: '2',
            name: 'PC Gaming',
            price: 35000000,
            image: 'pc.jpg',
            category: 'pc-gaming',
          },
        ],
      });

      renderApp();

      // Verify home page loads
      expect(screen.getByText('Quang Hưởng')).toBeInTheDocument();

      // Navigate to products page
      const productsLink = screen.getByRole('link', { name: /sản phẩm|products/i });
      await user.click(productsLink);

      // Verify products are displayed
      await waitFor(() => {
        expect(screen.getByText('Laptop Gaming')).toBeInTheDocument();
        expect(screen.getByText('PC Gaming')).toBeInTheDocument();
      });
    });

    it('filter products by category', async () => {
      const user = userEvent.setup();

      renderApp();

      // Click on category
      const laptopCategory = screen.getByRole('link', { name: /laptop/i });
      await user.click(laptopCategory);

      // Verify category page
      await waitFor(() => {
        expect(screen.getByText(/laptop/i)).toBeInTheDocument();
      });
    });

    it('search for products', async () => {
      const user = userEvent.setup();

      renderApp();

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/tìm|search/i);
      await user.type(searchInput, 'gaming laptop');

      // Submit search
      await user.keyboard('{Enter}');

      // Verify search results
      await waitFor(() => {
        expect(screen.getByText(/gaming laptop|kết quả/i)).toBeInTheDocument();
      });
    });
  });

  describe('Shopping Cart Flow', () => {
    it('add product to cart', async () => {
      const user = userEvent.setup();

      renderApp();

      // Find add to cart button
      const addToCartButton = screen.getByRole('button', { name: /thêm vào giỏ|add to cart/i });
      await user.click(addToCartButton);

      // Verify cart notification
      await waitFor(() => {
        expect(screen.getByText(/đã thêm|added/i)).toBeInTheDocument();
      });

      // Verify cart count increased
      const cartCount = screen.getByRole('status', { name: /cart count/i });
      expect(cartCount).toHaveTextContent('1');
    });

    it('view cart and proceed to checkout', async () => {
      const user = userEvent.setup();

      renderApp();

      // Open cart
      const cartButton = screen.getByRole('button', { name: /cart|giỏ hàng/i });
      await user.click(cartButton);

      // Verify cart drawer opens
      await waitFor(() => {
        expect(screen.getByText(/giỏ hàng|your cart/i)).toBeInTheDocument();
      });

      // Click checkout
      const checkoutButton = screen.getByRole('button', { name: /checkout|thanh toán/i });
      await user.click(checkoutButton);

      // Verify checkout page
      await waitFor(() => {
        expect(screen.getByText(/thanh toán|checkout/i)).toBeInTheDocument();
      });
    });

    it('remove product from cart', async () => {
      const user = userEvent.setup();

      renderApp();

      // Open cart
      await user.click(screen.getByRole('button', { name: /cart|giỏ hàng/i }));

      // Click remove button
      const removeButton = screen.getByRole('button', { name: /remove|xóa/i });
      await user.click(removeButton);

      // Verify product removed
      await waitFor(() => {
        expect(screen.getByText(/giỏ hàng trống|cart is empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Checkout Flow', () => {
    it('complete checkout as guest user', async () => {
      const user = userEvent.setup();

      renderApp();

      // Navigate to checkout
      await user.click(screen.getByRole('link', { name: /checkout/i }));

      // Fill checkout form
      await user.type(screen.getByLabelText(/name|họ tên/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/phone|số điện thoại/i), '0123456789');
      await user.type(screen.getByLabelText(/address|địa chỉ/i), '123 Test Street');

      // Select payment method
      await user.click(screen.getByLabelText(/cash|tiền mặt/i));

      // Place order
      const placeOrderButton = screen.getByRole('button', { name: /đặt hàng|place order/i });
      await user.click(placeOrderButton);

      // Verify success
      await waitFor(() => {
        expect(screen.getByText(/đặt hàng thành công|order successful/i)).toBeInTheDocument();
      });
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();

      renderApp();

      // Navigate to checkout
      await user.click(screen.getByRole('link', { name: /checkout/i }));

      // Try to submit without filling form
      const placeOrderButton = screen.getByRole('button', { name: /đặt hàng|place order/i });
      await user.click(placeOrderButton);

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText(/bắt buộc|required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Product Details Flow', () => {
    it('view product details', async () => {
      const user = userEvent.setup();

      renderApp();

      // Click on product
      const productLink = screen.getByRole('link', { name: /laptop gaming/i });
      await user.click(productLink);

      // Verify product details page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /laptop gaming/i })).toBeInTheDocument();
        expect(screen.getByText(/mô tả|description/i)).toBeInTheDocument();
        expect(screen.getByText(/thông số|specifications/i)).toBeInTheDocument();
      });
    });

    it('add related products to cart', async () => {
      const user = userEvent.setup();

      renderApp();

      // Navigate to product details
      await user.click(screen.getByRole('link', { name: /laptop gaming/i }));

      // Scroll to related products
      const relatedSection = screen.getByRole('region', { name: /sản phẩm liên quan|related products/i });

      // Add related product to cart
      const addToCartButtons = within(relatedSection).getAllByRole('button', { name: /thêm vào giỏ/i });
      await user.click(addToCartButtons[0]);

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/đã thêm|added/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('works on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderApp();

      // Verify mobile navigation
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();

      // Open mobile menu
      fireEvent.click(screen.getByRole('button', { name: /menu/i }));

      // Verify menu items are visible
      expect(screen.getByRole('navigation')).toBeVisible();
    });

    it('works on tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderApp();

      // Verify tablet layout
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('works on desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      renderApp();

      // Verify desktop layout with all features
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });
});
