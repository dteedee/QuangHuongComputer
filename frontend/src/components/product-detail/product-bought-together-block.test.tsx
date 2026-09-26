import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BoughtTogetherResult } from '../../api/catalog/bought-together';
import type { Product } from '../../api/catalog/types';
import { pickAnchorLine } from '../cart/pick-cart-anchor-line';

/** `get(productId, limit, selected?)` — what the server would answer; wired through the HTTP client mock. */
const get = vi.hoisted(() => vi.fn());
const addToCart = vi.hoisted(() => vi.fn());
vi.mock('../../api/client', () => ({
    default: {
        get: async (url: string, config: { params: { limit: number; selected?: string } }) => {
            const productId = url.split('/')[3];
            const selected = config.params.selected === undefined ? undefined : config.params.selected.split(',').filter(Boolean);
            return { data: await get(productId, config.params.limit, selected) };
        },
    },
}));
vi.mock('../../context/CartContext', () => ({ useCart: () => ({ addToCart }) }));

import ProductBoughtTogetherBlock from './product-bought-together-block';

const product = (id: string, name: string, price: number) =>
    ({ id, name, price, sku: id, stockQuantity: 5, slug: id } as unknown as Product);

const result = (total: number): BoughtTogetherResult => ({
    source: 'co-purchase',
    anchor: product('laptop', 'Laptop Gaming', 20_000_000),
    items: [
        { product: product('mouse', 'Chuột không dây', 300_000), orderCount: 12 },
        { product: product('bag', 'Balo laptop', 500_000), orderCount: 7 },
    ],
    total,
});

function renderBlock() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter><ProductBoughtTogetherBlock productId="laptop" /></MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    get.mockReset();
    addToCart.mockReset().mockResolvedValue(true);
});

describe('ProductBoughtTogetherBlock', () => {
    it('hiện tổng do server tính; bỏ chọn một món thì hỏi lại server với danh sách đã chọn', async () => {
        get.mockImplementation((_id: string, _limit: number, selected?: string[]) =>
            Promise.resolve(result(selected ? 20_300_000 : 20_800_000)));
        renderBlock();

        expect(await screen.findByText('Thường được mua cùng')).toBeInTheDocument();
        expect(screen.getByText('12 đơn mua cùng')).toBeInTheDocument();
        expect(screen.getByText('20.800.000')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn mua kèm Balo laptop' }));

        await waitFor(() => expect(get).toHaveBeenLastCalledWith('laptop', 6, ['mouse']));
        expect(await screen.findByText('20.300.000')).toBeInTheDocument();
    });

    it('"Thêm tất cả vào giỏ" thêm sản phẩm đang xem + các món còn được chọn', async () => {
        get.mockResolvedValue(result(20_800_000));
        renderBlock();

        await userEvent.click(await screen.findByRole('checkbox', { name: 'Chọn mua kèm Chuột không dây' }));
        await userEvent.click(screen.getByRole('button', { name: /Thêm tất cả vào giỏ/ }));

        await waitFor(() => expect(addToCart).toHaveBeenCalledTimes(2));
        expect(addToCart.mock.calls.map((c) => c[0].id)).toEqual(['laptop', 'bag']);
    });

    it('không có gợi ý thì không hiện gì (không phải lỗi với khách)', async () => {
        get.mockResolvedValue({ ...result(20_000_000), items: [] });
        const { container } = renderBlock();

        await waitFor(() => expect(get).toHaveBeenCalled());
        await waitFor(() => expect(container.querySelector('section')).toBeNull());
    });
});

describe('pickAnchorLine', () => {
    it('neo gợi ý vào dòng giá trị lớn nhất trong giỏ', () => {
        const line = (id: string, lineTotal: number) =>
            ({ id, name: id, price: lineTotal, quantity: 1, stockQuantity: 1, lineTotal });
        expect(pickAnchorLine([line('pad', 100_000), line('laptop', 20_000_000), line('mouse', 300_000)])?.id).toBe('laptop');
        expect(pickAnchorLine([])).toBeUndefined();
    });
});
