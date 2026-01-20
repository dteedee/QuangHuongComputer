import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../test/test-utils';
import { Header } from './Header';

describe('Header Component', () => {
  const mockOnCartClick = vi.fn();
  const mockOnChatClick = vi.fn();

  describe('Logo', () => {
    it('should render logo with link to home page', () => {
      render(<Header onCartClick={mockOnCartClick} onChatClick={mockOnChatClick} />);

      const logoLink = screen.getByTestId('logo-link');
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute('href', '/');
      expect(screen.getByText('QUANG HƯỞNG')).toBeInTheDocument();
    });

    it('should navigate to home page when logo is clicked', () => {
      render(<Header onCartClick={mockOnCartClick} onChatClick={mockOnChatClick} />);

      const logoLink = screen.getByTestId('logo-link');
      expect(logoLink.getAttribute('href')).toBe('/');
    });
  });

  describe('Main Menu', () => {
    it('should render all main menu items with correct hrefs', () => {
      render(<Header onCartClick={mockOnCartClick} onChatClick={mockOnChatClick} />);

      // Check for main menu items
      const productsLink = screen.getByText('Sản phẩm').closest('a');
      expect(productsLink).toHaveAttribute('href', '/products');

      const repairsLink = screen.getByText('Dịch vụ sửa chữa').closest('a');
      expect(repairsLink).toHaveAttribute('href', '/repairs');

      const warrantyLink = screen.getByText('Bảo hành').closest('a');
      expect(warrantyLink).toHaveAttribute('href', '/warranty');

      const newsLink = screen.getByText('Blog/Tin tức').closest('a');
      expect(newsLink).toHaveAttribute('href', '/policy/news');

      const contactLink = screen.getByText('Liên hệ').closest('a');
      expect(contactLink).toHaveAttribute('href', '/contact');
    });
  });

  describe('Cart Icon', () => {
    it('should render cart button', () => {
      render(<Header onCartClick={mockOnCartClick} onChatClick={mockOnChatClick} />);

      const cartButton = screen.getByTestId('cart-button');
      expect(cartButton).toBeInTheDocument();
    });

    it('should call onCartClick when cart button is clicked', () => {
      render(<Header onCartClick={mockOnCartClick} onChatClick={mockOnChatClick} />);

      const cartButton = screen.getByTestId('cart-button');
      fireEvent.click(cartButton);

      expect(mockOnCartClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Chat Icon', () => {
    it('should render chat button', () => {
      render(<Header onCartClick={mockOnCartClick} onChatClick={mockOnChatClick} />);

      const chatButton = screen.getByTestId('chat-button');
      expect(chatButton).toBeInTheDocument();
    });

    it('should call onChatClick when chat button is clicked', () => {
      render(<Header onCartClick={mockOnCartClick} onChatClick={mockOnChatClick} />);

      const chatButton = screen.getByTestId('chat-button');
      fireEvent.click(chatButton);

      expect(mockOnChatClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Account Menu - Not Logged In', () => {
    it('should show login link when not authenticated', () => {
      render(<Header onCartClick={mockOnCartClick} onChatClick={mockOnChatClick} />);

      const loginLink = screen.getByTestId('login-link');
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });
});
