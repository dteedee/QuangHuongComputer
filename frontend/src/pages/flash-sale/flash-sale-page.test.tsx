import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import type { ActiveFlashSale } from '../../api/promotions/public';
import { FlashSalePage } from './flash-sale-page';

const getActive = vi.hoisted(() => vi.fn());
const getProduct = vi.hoisted(() => vi.fn());
vi.mock('../../api/promotions/public', () => ({ flashSalePublicApi: { getActive } }));
vi.mock('../../api/catalog/public-product', () => ({ catalogPublicProductApi: { getProduct } }));
// ProductCard only needs `addToCart` from the cart context.
vi.mock('../../context/CartContext', () => ({ useCart: () => ({ addToCart: vi.fn() }) }));

beforeAll(() => {
    if (!('IntersectionObserver' in window)) {
        class IO {
            observe() {}
            unobserve() {}
            disconnect() {}
            takeRecords() {
                return [];
            }
        }
        Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: IO });
    }
});

const inOneDay = () => new Date(Date.now() + 86_400_000).toISOString();

const sale = (extra: Partial<ActiveFlashSale> = {}): ActiveFlashSale => ({
    id: 'sale-1',
    name: 'Giờ vàng laptop',
    description: 'Giảm sâu 3 ngày',
    endAt: inOneDay(),
    products: [
        { productId: 'p1', variantId: null, flashPrice: 15_990_000, quantityLimit: 10, soldCount: 4, remaining: 6, isSoldOut: false },
        { productId: 'p2', variantId: null, flashPrice: 9_990_000, quantityLimit: 5, soldCount: 5, remaining: 0, isSoldOut: true },
    ],
    ...extra,
});

const product = (id: string, name: string, price: number) => ({
    id,
    name,
    slug: `${id}-slug`,
    sku: id.toUpperCase(),
    price,
    stockQuantity: 10,
    status: 'InStock',
    averageRating: 0,
});

function renderPage() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <HelmetProvider>
            <QueryClientProvider client={client}>
                <MemoryRouter initialEntries={['/flash-sale']}>
                    <FlashSalePage />
                </MemoryRouter>
            </QueryClientProvider>
        </HelmetProvider>,
    );
}

describe('FlashSalePage (/flash-sale)', () => {
    beforeEach(() => {
        getActive.mockReset();
        getProduct.mockReset();
        getProduct.mockImplementation(async (id: string) =>
            id === 'p1' ? product('p1', 'Laptop A', 18_990_000) : product('p2', 'Laptop B', 12_990_000),
        );
    });

    it('đang chạy: tên đợt, đồng hồ đếm ngược, thẻ sản phẩm với thanh đã bán và trạng thái hết suất', async () => {
        getActive.mockResolvedValue([sale()]);
        renderPage();

        expect(await screen.findByRole('heading', { name: 'Giờ vàng laptop' })).toBeInTheDocument();
        expect(screen.getByRole('timer', { name: /thời gian còn lại/i })).toBeInTheDocument();
        expect(await screen.findByText('Laptop A')).toBeInTheDocument();
        expect(screen.getByText('Đã bán 4/10')).toBeInTheDocument();
        expect(screen.getByText('Hết suất ưu đãi')).toBeInTheDocument();
        expect(screen.getByText('· còn 6 suất')).toBeInTheDocument();
    });

    it('đợt đã qua giờ kết thúc khi đang xem -> ẩn lưới giá, báo đã kết thúc', async () => {
        getActive.mockResolvedValue([sale({ endAt: new Date(Date.now() - 1000).toISOString() })]);
        renderPage();

        expect(await screen.findByText('Flash sale đã kết thúc')).toBeInTheDocument();
        expect(screen.queryByText('Laptop A')).not.toBeInTheDocument();
    });

    it('không có đợt nào (hoặc chỉ có dòng không giá flash) -> trạng thái rỗng thật, không bịa deal', async () => {
        getActive.mockResolvedValue([
            sale({ products: [{ productId: 'p1', variantId: null, flashPrice: 0, quantityLimit: null, soldCount: 0, remaining: null, isSoldOut: false }] }),
        ]);
        renderPage();

        expect(await screen.findByText('Hiện chưa có flash sale nào', {}, { timeout: 2000 })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Xem khuyến mãi' })).toBeInTheDocument();
        expect(getProduct).not.toHaveBeenCalled();
    });
});
