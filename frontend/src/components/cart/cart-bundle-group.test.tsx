import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { CartBundleGroup, CartItem } from '../../context/CartContext';
import { CartBundleGroupCard } from './cart-bundle-group';

const lines: CartItem[] = [
    { id: 'p1', name: 'Laptop ASUS', price: 20_000_000, quantity: 1, stockQuantity: 5, lineTotal: 19_414_634, bundleId: 'b1', bundleName: 'Combo' },
    { id: 'p2', name: 'Chuột Logitech', price: 500_000, quantity: 1, stockQuantity: 5, lineTotal: 485_366, bundleId: 'b1', bundleName: 'Combo' },
];

const group = (extra: Partial<CartBundleGroup> = {}): CartBundleGroup => ({
    bundleId: 'b1', name: 'Laptop + Chuột', isApplied: true, reason: null, sets: 1,
    listTotal: 20_500_000, bundleTotal: 19_900_000, discount: 600_000, pendingCheckout: false, ...extra,
});

const renderCard = (g: CartBundleGroup, handlers = { onUpdateItem: vi.fn(), onRemoveItem: vi.fn(), onRemoveGroup: vi.fn() }) => {
    render(<MemoryRouter><CartBundleGroupCard group={g} lines={lines} {...handlers} /></MemoryRouter>);
    return handlers;
};

describe('CartBundleGroupCard', () => {
    it('combo được áp giá: hiện tiền tiết kiệm', () => {
        renderCard(group());
        expect(screen.getByText(/Tiết kiệm/).textContent).toContain('600.000');
    });

    it('combo vỡ / hết hạn: hiện lý do và báo tính giá lẻ', () => {
        renderCard(group({ isApplied: false, reason: 'Combo đã hết hạn', discount: 0 }));
        expect(screen.getByText(/Combo đã hết hạn — tính giá lẻ/)).toBeInTheDocument();
    });

    it('giỏ vãng lai: ghi rõ giảm giá áp dụng khi thanh toán', () => {
        renderCard(group({ pendingCheckout: true }));
        expect(screen.getByText(/áp dụng khi thanh toán/)).toBeInTheDocument();
    });

    it('bỏ một món phải xác nhận việc tách combo trước khi gọi API', async () => {
        const handlers = renderCard(group());
        await userEvent.click(screen.getByRole('button', { name: 'Bỏ Chuột Logitech khỏi combo' }));
        expect(handlers.onRemoveItem).not.toHaveBeenCalled();
        expect(await screen.findByText('Tách combo?')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Tách combo' }));
        expect(handlers.onRemoveItem).toHaveBeenCalledWith('b1', 'p2');
    });
});
