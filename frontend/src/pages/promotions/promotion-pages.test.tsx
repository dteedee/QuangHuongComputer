import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import type { Post } from '../../api/content/types';
import { PromotionListingPage } from './promotion-listing-page';
import { PromotionDetailPage } from './promotion-detail-page';

const getPosts = vi.hoisted(() => vi.fn());
const getPost = vi.hoisted(() => vi.fn());
const getActive = vi.hoisted(() => vi.fn());
const getRunningCodes = vi.hoisted(() => vi.fn());
vi.mock('../../api/content/public', () => ({ contentPublicApi: { getPosts, getPost } }));
vi.mock('../../api/promotions/public', () => ({
    flashSalePublicApi: { getActive },
    promotionCodePublicApi: { getRunningCodes },
}));

const promoPost: Post = {
    id: 'k1',
    title: 'Back to school 2026',
    slug: 'back-to-school-2026',
    content: '<p>Áp dụng cho học sinh, sinh viên.</p><ul><li>Đơn từ 10 triệu</li></ul>',
    type: 'Promotion',
    isPublished: true,
    publishedAt: '2026-09-01T02:00:00Z',
    createdAt: '2026-09-01T02:00:00Z',
};

function renderAt(url: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <HelmetProvider>
            <QueryClientProvider client={client}>
                <MemoryRouter initialEntries={[url]}>
                    <Routes>
                        <Route path="/khuyen-mai" element={<PromotionListingPage />} />
                        <Route path="/khuyen-mai/:slug" element={<PromotionDetailPage />} />
                        <Route path="/tin-tuc/:slug" element={<p>trang tin tức</p>} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        </HelmetProvider>,
    );
}

describe('/khuyen-mai', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getActive.mockResolvedValue([]);
        getRunningCodes.mockResolvedValue([
            {
                id: 'c1', code: 'QH500K', name: 'Giảm 500K cho laptop', description: 'Đơn laptop từ 15 triệu',
                discountType: 'Fixed', discountValue: 500000, maxDiscountAmount: null,
                endAt: new Date(Date.now() + 3_600_000).toISOString(), usageRemaining: 12,
            },
        ]);
    });

    it('danh sách: bài khuyến mãi trỏ /khuyen-mai/:slug + thẻ mã có luật giảm, lượt còn lại và nút sao chép', async () => {
        getPosts.mockResolvedValue([promoPost]);
        renderAt('/khuyen-mai');

        const card = await screen.findByText('Back to school 2026');
        expect(card.closest('a')).toHaveAttribute('href', '/khuyen-mai/back-to-school-2026');
        expect(getPosts).toHaveBeenCalledWith('Promotion');
        expect(await screen.findByText('QH500K')).toBeInTheDocument();
        expect(screen.getByText('Giảm 500.000₫')).toBeInTheDocument();
        expect(screen.getByText('Còn 12 lượt dùng')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sao chép' })).toBeInTheDocument();
        // No flash sale running -> no teaser link to /flash-sale.
        expect(screen.queryByText('Flash sale đang diễn ra')).not.toBeInTheDocument();
    });

    it('chi tiết: hiện nội dung điều kiện đã lọc HTML', async () => {
        getPost.mockResolvedValue(promoPost);
        renderAt('/khuyen-mai/back-to-school-2026');

        expect(await screen.findByRole('heading', { level: 1, name: 'Back to school 2026' })).toBeInTheDocument();
        expect(screen.getByText('Đơn từ 10 triệu')).toBeInTheDocument();
    });

    it('chi tiết: bài tin thường ở URL khuyến mãi -> chuyển về /tin-tuc/:slug', async () => {
        getPost.mockResolvedValue({ ...promoPost, type: 'News', slug: 'mot-tin' });
        renderAt('/khuyen-mai/mot-tin');

        expect(await screen.findByText('trang tin tức')).toBeInTheDocument();
    });

    it('chi tiết: không tồn tại -> trạng thái không tìm thấy có lối ra', async () => {
        getPost.mockRejectedValue(new Error('404'));
        renderAt('/khuyen-mai/khong-co');

        expect(await screen.findByText('Không tìm thấy chương trình khuyến mãi')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Xem khuyến mãi đang chạy' })).toBeInTheDocument();
    });
});
