import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BundleView } from '../../api/bundle';
import { ProductComboSavingsBlock } from './product-combo-savings-block';

const getBundlesByProduct = vi.hoisted(() => vi.fn());
const addBundleToCart = vi.hoisted(() => vi.fn());
vi.mock('../../api/bundle', () => ({ bundleApi: { getBundlesByProduct } }));
vi.mock('../../context/CartContext', () => ({ useCart: () => ({ addBundleToCart }) }));

const combo = (extra: Partial<BundleView> = {}): BundleView => ({
    id: 'b1', name: 'Laptop + Chuột', description: '', imageUrl: null, validFrom: null, validTo: null,
    isActive: true, pricingMode: 'fixed', discountPercent: null, fixedPrice: 19_900_000,
    originalPrice: 20_500_000, bundlePrice: 19_900_000, savings: 600_000, isPurchasable: true, totalPrice: 19_900_000,
    items: [
        { id: 'i1', productId: 'p1', productName: 'Laptop ASUS', productSlug: 'laptop-asus', isMainItem: true, quantity: 1, unitPrice: 20_000_000, isPublished: true, inStock: true },
        { id: 'i2', productId: 'p2', productName: 'Chuột Logitech', productSlug: 'chuot', isMainItem: false, quantity: 1, unitPrice: 500_000, isPublished: true, inStock: true },
    ],
    ...extra,
});

const renderBlock = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><ProductComboSavingsBlock productId="p1" /></MemoryRouter>
    </QueryClientProvider>,
);

describe('ProductComboSavingsBlock', () => {
    beforeEach(() => { getBundlesByProduct.mockReset(); addBundleToCart.mockReset(); });

    it('hiện combo, tiền tiết kiệm và thêm cả combo vào giỏ', async () => {
        getBundlesByProduct.mockResolvedValue([combo()]);
        addBundleToCart.mockResolvedValue(true);
        renderBlock();

        expect(await screen.findByText('Combo tiết kiệm')).toBeInTheDocument();
        expect(screen.getByText('Laptop ASUS')).toBeInTheDocument();
        expect(screen.getByText(/Tiết kiệm/).textContent).toContain('600.000');

        await userEvent.click(screen.getByRole('button', { name: /Thêm combo vào giỏ/ }));
        await waitFor(() => expect(addBundleToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }), 1));
    });

    it('combo hết hàng thì khoá nút mua', async () => {
        getBundlesByProduct.mockResolvedValue([combo({ isPurchasable: false })]);
        renderBlock();
        expect(await screen.findByRole('button', { name: /Combo tạm hết hàng/ })).toBeDisabled();
    });

    it('không có combo thì không render gì', async () => {
        getBundlesByProduct.mockResolvedValue([]);
        const { container } = renderBlock();
        await waitFor(() => expect(getBundlesByProduct).toHaveBeenCalled());
        await waitFor(() => expect(container.querySelector('section')).toBeNull());
        expect(screen.queryByText('Combo tiết kiệm')).toBeNull();
    });
});
