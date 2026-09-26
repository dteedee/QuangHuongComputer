import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import type { PcGalleryBuild } from '../../api/pcbuilder-gallery';
import { PC_BUILD_SESSION_KEY } from '../build-pc/pc-build-state-types';
import { PcBuildGalleryPage } from './pc-build-gallery-page';

const list = vi.hoisted(() => vi.fn());
const addToCart = vi.hoisted(() => vi.fn());
vi.mock('../../api/pcbuilder-gallery', async (orig) => ({
    ...(await orig<typeof import('../../api/pcbuilder-gallery')>()),
    pcBuildGalleryApi: { list },
}));
vi.mock('../../context/CartContext', () => ({ useCart: () => ({ addToCart }) }));

const build = (extra: Partial<PcGalleryBuild> = {}): PcGalleryBuild => ({
    id: 'g1', buildCode: 'GAME2026', title: 'PC Gaming 20 triệu', useCaseTag: 'gaming', useCaseLabel: 'Gaming',
    isFeatured: true, isPublic: true, sortOrder: 0, liveTotal: 19_990_000, savedTotal: 21_000_000,
    overallVerdict: 'Compatible', isPurchasable: true, issues: [],
    items: [
        { productId: 'cpu1', name: 'Core i5 14400F', slug: 'core-i5', imageUrl: null, slotId: 'cpu', slotLabel: 'CPU', sku: 'I5', quantity: 1, unitPrice: 4_990_000, isAvailable: true, inStock: true },
        { productId: 'vga1', name: 'RTX 4060', slug: 'rtx-4060', imageUrl: null, slotId: 'vga', slotLabel: 'Card màn hình', sku: 'RTX', quantity: 1, unitPrice: 15_000_000, isAvailable: true, inStock: true },
    ],
    ...extra,
});

const LocationProbe = () => <p data-testid="location">{useLocation().pathname}{useLocation().search}</p>;

const renderPage = (entry = '/cau-hinh-mau') => render(
    <HelmetProvider>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter initialEntries={[entry]}>
                <Routes>
                    <Route path="/cau-hinh-mau" element={<><PcBuildGalleryPage /><LocationProbe /></>} />
                    <Route path="*" element={<LocationProbe />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    </HelmetProvider>,
);

describe('PcBuildGalleryPage', () => {
    beforeEach(() => {
        list.mockReset();
        addToCart.mockReset();
        window.sessionStorage.clear();
        list.mockResolvedValue([build()]);
    });

    it('hiển thị thẻ với tổng giá hiện hành, nhãn nhu cầu và tương thích', async () => {
        renderPage();
        const card = await screen.findByTestId('pc-gallery-card');
        expect(card).toHaveAttribute('id', 'GAME2026');
        expect(within(card).getByText('PC Gaming 20 triệu')).toBeInTheDocument();
        expect(within(card).getByText('Hợp lệ')).toBeInTheDocument();
        expect(within(card).getByText(/19\.990\.000/)).toBeInTheDocument();
    });

    it('chip lọc đổi query trên URL và gọi API với khoảng ngân sách', async () => {
        renderPage();
        await screen.findByTestId('pc-gallery-card');
        await userEvent.click(screen.getByRole('button', { name: 'Văn phòng' }));
        await userEvent.click(screen.getByRole('button', { name: '15–25 triệu' }));

        await waitFor(() => expect(list).toHaveBeenLastCalledWith({ tag: 'van-phong', minBudget: 15_000_000, maxBudget: 25_000_000 }));
        expect(screen.getAllByTestId('location')[0].textContent).toContain('tag=van-phong');
        expect(screen.getAllByTestId('location')[0].textContent).toContain('budget=15-25');
    });

    it('"Mua cả bộ" thêm từng linh kiện vào giỏ', async () => {
        addToCart.mockResolvedValue(true);
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: 'Mua cả bộ' }));

        await waitFor(() => expect(addToCart).toHaveBeenCalledTimes(2));
        expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 'cpu1' }), 1, { silent: true });
        expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 'vga1' }), 1, { silent: true });
    });

    it('"Mua cả bộ" bị khoá khi có linh kiện hết hàng', async () => {
        list.mockResolvedValue([build({ isPurchasable: false })]);
        renderPage();
        expect(await screen.findByRole('button', { name: 'Mua cả bộ' })).toBeDisabled();
    });

    it('"Tùy chỉnh" nạp cấu hình vào builder rồi chuyển trang', async () => {
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: 'Tùy chỉnh' }));

        const state = JSON.parse(window.sessionStorage.getItem(PC_BUILD_SESSION_KEY) ?? '{}');
        expect(state.cpu[0]).toMatchObject({ productId: 'cpu1', quantity: 1, price: 4_990_000 });
        expect(state.vga[0]).toMatchObject({ productId: 'vga1' });
        await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/xay-dung-cau-hinh'));
    });
});
