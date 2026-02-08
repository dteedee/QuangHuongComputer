import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';
import * as router from 'react-router-dom';

// Mock Link component
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

const mockProduct = {
  id: '1',
  name: 'Laptop Gaming Dell G15',
  price: 25000000,
  originalPrice: 30000000,
  image: 'https://example.com/laptop.jpg',
  category: 'laptop',
  inStock: true,
};

describe('ProductCard Component Integration Tests', () => {
  it('renders product information correctly', () => {
    render(<ProductCard {...mockProduct} />);

    expect(screen.getByText('Laptop Gaming Dell G15')).toBeInTheDocument();
    expect(screen.getByText('laptop')).toBeInTheDocument();
    expect(screen.getByText(/25\.000\.000/)).toBeInTheDocument();
  });

  it('displays discount badge when originalPrice is higher', () => {
    render(<ProductCard {...mockProduct} />);

    expect(screen.getByText('-17%')).toBeInTheDocument();
  });

  it('does not display discount when prices are equal', () => {
    const productWithoutDiscount = {
      ...mockProduct,
      originalPrice: 25000000,
    };

    render(<ProductCard {...productWithoutDiscount} />);

    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it('calls onAddToCart when add to cart button is clicked', async () => {
    const onAddToCart = vi.fn();
    const user = userEvent.setup();

    render(<ProductCard {...mockProduct} onAddToCart={onAddToCart} />);

    const addButton = screen.getByRole('button', { name: /thêm vào giỏ/i });
    await user.click(addButton);

    expect(onAddToCart).toHaveBeenCalledTimes(1);
  });

  it('disables add to cart button when out of stock', () => {
    const outOfStockProduct = {
      ...mockProduct,
      inStock: false,
    };

    render(<ProductCard {...outOfStockProduct} />);

    expect(screen.getByText('Hết hàng')).toBeInTheDocument();
    const addButton = screen.getByRole('button', { name: /hết hàng/i });
    expect(addButton).toBeDisabled();
  });

  it('links to product detail page', () => {
    render(<ProductCard {...mockProduct} />);

    const productLinks = screen.getAllByRole('link');
    const detailLink = productLinks.find(link =>
      link.getAttribute('href') === '/product/1'
    );

    expect(detailLink).toBeInTheDocument();
  });

  it('links to category page', () => {
    render(<ProductCard {...mockProduct} />);

    const categoryLink = screen.getByRole('link', { name: /laptop/i });
    expect(categoryLink).toHaveAttribute('href', '/category/laptop');
  });

  it('has hover effects', () => {
    const { container } = render(<ProductCard {...mockProduct} />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('hover:shadow-xl');
  });

  it('displays original price with strikethrough', () => {
    render(<ProductCard {...mockProduct} />);

    const originalPrice = screen.getByText(/30\.000\.000/);
    expect(originalPrice).toHaveClass('line-through');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ProductCard {...mockProduct} className="custom-class" />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-class');
  });

  it('is accessible - keyboard navigation', () => {
    render(<ProductCard {...mockProduct} />);

    const addButton = screen.getByRole('button', { name: /thêm vào giỏ/i });
    addButton.focus();
    expect(document.activeElement).toBe(addButton);
  });

  it('has proper ARIA labels', () => {
    render(<ProductCard {...mockProduct} />);

    const addButton = screen.getByRole('button', { name: /thêm vào giỏ/i });
    expect(addButton).toHaveAttribute('aria-label');
  });

  it('renders product image with correct src', () => {
    render(<ProductCard {...mockProduct} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/laptop.jpg');
    expect(image).toHaveAttribute('alt', 'Laptop Gaming Dell G15');
  });

  it('handles quick view or wishlist actions', async () => {
    const onToggleWishlist = vi.fn();
    const user = userEvent.setup();

    render(
      <ProductCard
        {...mockProduct}
        onToggleWishlist={onToggleWishlist}
        isWishlisted={false}
      />
    );

    // Assuming there's a wishlist button
    const wishlistButton = screen.getByRole('button', { name: /wishlist/i });
    await user.click(wishlistButton);

    expect(onToggleWishlist).toHaveBeenCalledTimes(1);
  });

  it('displays correct price formatting', () => {
    render(<ProductCard {...mockProduct} />);

    // Vietnamese currency formatting
    expect(screen.getByText(/25\.000\.000₫/)).toBeInTheDocument();
  });

  it('is responsive on mobile', () => {
    // Mock mobile viewport
    global.innerWidth = 375;

    render(<ProductCard {...mockProduct} />);

    const card = screen.getByText('Laptop Gaming Dell G15').closest('.group');
    expect(card).toBeInTheDocument();
  });
});
