import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewItem from './ReviewItem';
import type { ProductReview } from '../../api/catalog/types';

const review: ProductReview = {
  id: 'r1', productId: 'p1', customerId: 'c1', rating: 4, title: 'Tốt', comment: 'Máy chạy êm.',
  pros: 'Pin trâu', cons: 'Hơi nặng', isVerifiedPurchase: true, isApproved: true, helpfulCount: 2,
  createdAt: '2026-09-20T03:00:00Z',
  images: [
    { url: '/media/u/reviews/2026/09/a-review-w1600.webp', thumbnailUrl: '/media/u/reviews/2026/09/a-review-w400.webp' },
    { url: '/media/u/reviews/2026/09/b-review-w1600.webp', thumbnailUrl: '/media/u/reviews/2026/09/b-review-w400.webp' },
  ],
  reply: { text: 'Cảm ơn anh đã tin tưởng!', repliedAt: '2026-09-21T03:00:00Z' },
};

describe('ReviewItem', () => {
  it('hiện phản hồi của cửa hàng và ưu/nhược điểm', () => {
    render(<ReviewItem review={review} />);
    expect(screen.getByText('Phản hồi từ Quang Hưởng')).toBeInTheDocument();
    expect(screen.getByText('Cảm ơn anh đã tin tưởng!')).toBeInTheDocument();
    expect(screen.getByText('Pin trâu')).toBeInTheDocument();
    expect(screen.getByText('Hơi nặng')).toBeInTheDocument();
  });

  it('không có phản hồi thì không hiện khối phản hồi', () => {
    render(<ReviewItem review={{ ...review, reply: null }} />);
    expect(screen.queryByText('Phản hồi từ Quang Hưởng')).not.toBeInTheDocument();
  });

  it('bấm ảnh thu nhỏ mở lightbox ảnh lớn, chuyển được ảnh sau', async () => {
    render(<ReviewItem review={review} />);
    await userEvent.click(screen.getByRole('button', { name: 'Xem ảnh 1 cỡ lớn' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('img')?.getAttribute('src')).toContain('a-review-w1600.webp');
    await userEvent.click(screen.getByRole('button', { name: 'Ảnh sau' }));
    expect(screen.getByRole('dialog').querySelector('img')?.getAttribute('src')).toContain('b-review-w1600.webp');
  });
});
