import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BundleView } from '../../../api/bundle';
import { BundleEditorPage } from './bundle-editor-page';

const api = vi.hoisted(() => ({ get: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock('../../../api/bundle', () => ({ bundleAdminApi: api }));
vi.mock('../../../api/catalog/admin', () => ({ catalogAdminApi: { listProducts: vi.fn() } }));

const existing: BundleView = {
    id: 'b1', name: 'Laptop + Chuột', description: '', imageUrl: null, validFrom: null, validTo: null,
    isActive: true, pricingMode: 'fixed', discountPercent: null, fixedPrice: 19_900_000,
    originalPrice: 20_500_000, bundlePrice: 19_900_000, savings: 600_000, isPurchasable: true, totalPrice: 19_900_000,
    items: [
        { id: 'i1', productId: 'p1', productName: 'Laptop ASUS', isMainItem: true, quantity: 1, unitPrice: 20_000_000, isPublished: true, inStock: true },
        { id: 'i2', productId: 'p2', productName: 'Chuột Logitech', isMainItem: false, quantity: 1, unitPrice: 500_000, isPublished: true, inStock: true },
    ],
};

const renderEditor = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/backoffice/bundles/b1']}>
            <Routes>
                <Route path="/backoffice/bundles/:id" element={<BundleEditorPage />} />
                <Route path="*" element={<p>Danh sách</p>} />
            </Routes>
        </MemoryRouter>
    </QueryClientProvider>,
);

describe('BundleEditorPage', () => {
    beforeEach(() => { Object.values(api).forEach(fn => fn.mockReset()); api.get.mockResolvedValue(existing); });

    it('đổi sang giảm %, chưa nhập % thì báo lỗi, nhập rồi gửi đúng payload', async () => {
        api.update.mockResolvedValue({ id: 'b1' });
        renderEditor();

        await userEvent.click(await screen.findByLabelText('Giảm % trên tổng giá lẻ'));
        await userEvent.click(screen.getByRole('button', { name: 'Lưu combo' }));
        expect(await screen.findByText('Phần trăm giảm từ 0 đến dưới 100')).toBeInTheDocument();
        expect(api.update).not.toHaveBeenCalled();

        await userEvent.type(screen.getByLabelText(/Phần trăm giảm/), '10');
        await userEvent.click(screen.getByRole('button', { name: 'Lưu combo' }));

        await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
        expect(api.update).toHaveBeenCalledWith('b1', expect.objectContaining({
            name: 'Laptop + Chuột', totalPrice: 0, discountPercent: 10,
            items: [{ productId: 'p1', quantity: 1, isMainItem: true }, { productId: 'p2', quantity: 1, isMainItem: false }],
        }));
    });
});
