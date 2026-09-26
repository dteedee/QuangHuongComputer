import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileBottomNav } from './mobile-bottom-nav';

const mockCart = vi.hoisted(() => ({ itemCount: 0 }));
vi.mock('../../context/CartContext', () => ({ useCart: () => mockCart }));

function renderAt(path: string, handlers = { onCategoryClick: vi.fn(), onCartClick: vi.fn() }) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <MobileBottomNav {...handlers} />
    </MemoryRouter>,
  );
  return handlers;
}

describe('MobileBottomNav', () => {
  beforeEach(() => {
    mockCart.itemCount = 0;
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-mobile-nav');
  });

  it('hiện đủ 5 mục và đánh dấu trang hiện tại', () => {
    renderAt('/khuyen-mai/giam-gia');
    const nav = screen.getByRole('navigation', { name: 'Điều hướng nhanh' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'Danh mục' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khuyến mãi' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Giỏ hàng' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tài khoản' })).not.toHaveAttribute('aria-current');
    expect(document.documentElement).toHaveAttribute('data-mobile-nav');
  });

  it('badge giỏ hàng hiện số dòng, chặn ở 99+', () => {
    mockCart.itemCount = 3;
    renderAt('/');
    expect(screen.getByTestId('mobile-nav-cart-badge')).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Giỏ hàng, 3 sản phẩm' })).toBeInTheDocument();
    cleanup();

    mockCart.itemCount = 120;
    renderAt('/');
    expect(screen.getByTestId('mobile-nav-cart-badge')).toHaveTextContent('99+');
  });

  it('Danh mục mở menu danh mục, Giỏ hàng mở giỏ', () => {
    const handlers = renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'Danh mục' }));
    expect(handlers.onCategoryClick).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Giỏ hàng' }));
    expect(handlers.onCartClick).toHaveBeenCalledTimes(1);
  });

  it.each(['/thanh-toan', '/checkout/success/abc', '/payment/callback', '/backoffice', '/backoffice/orders'])(
    'ẩn ở %s và không giữ chỗ dưới đáy',
    (path) => {
      renderAt(path);
      expect(screen.queryByRole('navigation', { name: 'Điều hướng nhanh' })).not.toBeInTheDocument();
      expect(document.documentElement).not.toHaveAttribute('data-mobile-nav');
    },
  );
});
