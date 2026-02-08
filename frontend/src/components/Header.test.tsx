import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';
import * as routerHooks from 'react-router-dom';
import * as authContext from '../context/AuthContext';
import * as cartContext from '../context/CartContext';

// Mock the hooks
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

describe('Header Component Integration Tests', () => {
  const mockUseAuth = {
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  };

  const mockUseCart = {
    itemCount: 0,
    items: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  };

  beforeEach(() => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue(mockUseAuth);
    vi.spyOn(cartContext, 'useCart').mockReturnValue(mockUseCart);
  });

  it('renders without crashing', () => {
    render(<Header onCartClick={vi.fn()} onChatClick={vi.fn()} />);
    expect(screen.getByText('Quang Hưởng')).toBeInTheDocument();
  });

  it('displays cart item count', () => {
    vi.spyOn(cartContext, 'useCart').mockReturnValue({
      ...mockUseCart,
      itemCount: 5,
    });

    render(<Header onCartClick={vi.fn()} onChatClick={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onCartClick when cart button is clicked', async () => {
    const onCartClick = vi.fn();
    const user = userEvent.setup();

    render(<Header onCartClick={onCartClick} onChatClick={vi.fn()} />);

    const cartButton = screen.getByRole('button', { name: /cart/i });
    await user.click(cartButton);

    expect(onCartClick).toHaveBeenCalledTimes(1);
  });

  it('toggles chat when chat button is clicked', async () => {
    const onChatClick = vi.fn();
    const user = userEvent.setup();

    render(<Header onCartClick={vi.fn()} onChatClick={onChatClick} />);

    const chatButton = screen.getByRole('button', { name: /chat/i });
    await user.click(chatButton);

    expect(onChatClick).toHaveBeenCalledTimes(1);
  });

  it('displays user menu when authenticated', () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      ...mockUseAuth,
      isAuthenticated: true,
      user: { name: 'Test User', email: 'test@example.com' },
    });

    render(<Header onCartClick={vi.fn()} onChatClick={vi.fn()} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', async () => {
    const mockLogout = vi.fn();
    const user = userEvent.setup();

    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      ...mockUseAuth,
      isAuthenticated: true,
      user: { name: 'Test User', email: 'test@example.com' },
      logout: mockLogout,
    });

    render(<Header onCartClick={vi.fn()} onChatClick={vi.fn()} />);

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('handles search form submission', async () => {
    const user = userEvent.setup();
    const mockNavigate = vi.fn();

    vi.spyOn(routerHooks, 'useNavigate').mockReturnValue(mockNavigate);

    render(<Header onCartClick={vi.fn()} onChatClick={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/tìm/i);
    const searchForm = searchInput.closest('form');

    if (searchForm) {
      await user.type(searchInput, 'laptop');
      fireEvent.submit(searchForm);

      expect(mockNavigate).toHaveBeenCalledWith(
        '/search?query=laptop'
      );
    }
  });

  it('displays navigation links', () => {
    render(<Header onCartClick={vi.fn()} onChatClick={vi.fn()} />);

    expect(screen.getByText('Trang chủ')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('Dịch vụ')).toBeInTheDocument();
    expect(screen.getByText('Tin tức')).toBeInTheDocument();
  });

  it('opens mobile menu on mobile menu button click', async () => {
    const user = userEvent.setup();

    // Mock mobile viewport
    global.innerWidth = 375;

    render(<Header onCartClick={vi.fn()} onChatClick={vi.fn()} />);

    const menuButton = screen.getByRole('button', { name: /menu/i });
    await user.click(menuButton);

    // Check if mobile menu is shown
    const mobileMenu = screen.getByRole('navigation');
    expect(mobileMenu).toBeVisible();
  });

  it('is accessible - keyboard navigation', () => {
    render(<Header onCartClick={vi.fn()} onChatClick={vi.fn()} />);

    const cartButton = screen.getByRole('button', { name: /cart/i });
    cartButton.focus();
    expect(document.activeElement).toBe(cartButton);
  });

  it('has proper ARIA labels', () => {
    render(<Header onCartClick={vi.fn()} onChatClick={vi.fn()} />);

    const cartButton = screen.getByRole('button', { name: /cart/i });
    expect(cartButton).toHaveAttribute('aria-label');

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveAttribute('aria-label');
  });

  it('updates search query state', async () => {
    const user = userEvent.setup();

    render(<Header onCartClick={vi.fn()} onChatClick={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/tìm/i);
    await user.type(searchInput, 'test query');

    expect(searchInput).toHaveValue('test query');
  });
});
