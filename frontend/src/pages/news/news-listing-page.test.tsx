import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import type { Post } from '../../api/content/types';
import { NewsListingPage } from './news-listing-page';

const getPosts = vi.hoisted(() => vi.fn());
vi.mock('../../api/content/public', () => ({ contentPublicApi: { getPosts } }));

beforeAll(() => {
    if (!window.matchMedia) {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }),
        });
    }
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

const post = (i: number, extra: Partial<Post> = {}): Post => ({
    id: `p${i}`,
    title: `Bài viết ${i}`,
    slug: `bai-viet-${i}`,
    content: `<p>Nội dung ${i}</p>`,
    type: 'News',
    isPublished: true,
    publishedAt: '2026-09-20T03:00:00Z',
    createdAt: '2026-09-20T03:00:00Z',
    ...extra,
});

function renderPage(url = '/tin-tuc') {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <HelmetProvider>
            <QueryClientProvider client={client}>
                <MemoryRouter initialEntries={[url]}>
                    <NewsListingPage />
                </MemoryRouter>
            </QueryClientProvider>
        </HelmetProvider>,
    );
}

describe('NewsListingPage (/tin-tuc)', () => {
    beforeEach(() => getPosts.mockReset());

    it('bài mới nhất nổi bật, bài Promotion bị loại (thuộc /khuyen-mai), link trỏ /tin-tuc/:slug', async () => {
        getPosts.mockResolvedValue([post(1), post(2), post(3, { type: 'Promotion', title: 'Giảm giá laptop' })]);
        renderPage();

        const featured = await screen.findByText('Bài viết 1');
        expect(featured.closest('a')).toHaveAttribute('href', '/tin-tuc/bai-viet-1');
        expect(screen.getByText('Bài mới nhất')).toBeInTheDocument();
        expect(screen.getByText('Bài viết 2').closest('a')).toHaveAttribute('href', '/tin-tuc/bai-viet-2');
        expect(screen.queryByText('Giảm giá laptop')).not.toBeInTheDocument();
    });

    it('có chuyên mục -> hiện tab; chọn tab chỉ còn bài của chuyên mục đó', async () => {
        getPosts.mockResolvedValue([
            post(1, { category: 'Hướng dẫn' }),
            post(2, { category: 'Công nghệ' }),
            post(3, { category: 'Hướng dẫn' }),
        ]);
        renderPage();

        const tablist = await screen.findByRole('tablist', { name: 'Chuyên mục tin tức' });
        await userEvent.click(within(tablist).getByRole('tab', { name: 'Công nghệ' }));

        expect(await screen.findByText('Bài viết 2')).toBeInTheDocument();
        expect(screen.queryByText('Bài viết 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Bài mới nhất')).not.toBeInTheDocument();
    });

    it('không có chuyên mục nào -> không hiện thanh tab', async () => {
        getPosts.mockResolvedValue([post(1), post(2)]);
        renderPage();
        await screen.findByText('Bài viết 1');
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('nhiều hơn 1 trang -> có phân trang; ?page=2 hiện đúng phần sau', async () => {
        getPosts.mockResolvedValue(Array.from({ length: 12 }, (_, i) => post(i + 1)));
        renderPage('/tin-tuc?page=2');

        // Page 2 = posts 11..12 (post 1 is featured, posts 2..10 fill page 1).
        expect(await screen.findByText('Bài viết 11')).toBeInTheDocument();
        expect(screen.queryByText('Bài viết 5')).not.toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: /phân trang/i })).toBeInTheDocument();
    });

    it('chỉ có bài khuyến mãi -> trạng thái rỗng có lối ra', async () => {
        getPosts.mockResolvedValue([post(1, { type: 'Promotion' })]);
        renderPage();
        expect(await screen.findByText('Chưa có bài viết nào', {}, { timeout: 2000 })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Xem sản phẩm' })).toBeInTheDocument();
    });
});
