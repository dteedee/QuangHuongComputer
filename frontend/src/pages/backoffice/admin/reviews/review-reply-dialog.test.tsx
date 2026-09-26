import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdminReviewRow } from '../../../../api/catalog/types';
import { ReviewReplyDialog } from './review-reply-dialog';

const reviews = vi.hoisted(() => ({ reply: vi.fn(), editReply: vi.fn(), deleteReply: vi.fn() }));
vi.mock('../../../../api/catalog/admin', () => ({ catalogAdminApi: { reviews } }));

const row = (reply: string | null): AdminReviewRow => ({
  productName: 'Laptop ASUS',
  repliedBy: reply ? 'staff-1' : null,
  review: {
    id: 'r1', productId: 'p1', customerId: 'c1', rating: 5, comment: 'Rất tốt', isVerifiedPurchase: true,
    isApproved: true, helpfulCount: 0, createdAt: '2026-09-20T03:00:00Z',
    reply: reply ? { text: reply, repliedAt: '2026-09-21T03:00:00Z' } : null,
  },
});

describe('ReviewReplyDialog', () => {
  beforeEach(() => Object.values(reviews).forEach((fn) => { fn.mockReset(); fn.mockResolvedValue({}); }));

  it('chưa có phản hồi: gửi bằng POST', async () => {
    const onChanged = vi.fn();
    render(<ReviewReplyDialog row={row(null)} onClose={vi.fn()} onChanged={onChanged} />);

    await userEvent.type(screen.getByLabelText('Phản hồi từ Quang Hưởng'), 'Cảm ơn anh!');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));

    await waitFor(() => expect(reviews.reply).toHaveBeenCalledWith('r1', 'Cảm ơn anh!'));
    expect(reviews.editReply).not.toHaveBeenCalled();
    expect(onChanged).toHaveBeenCalled();
  });

  it('đã có phản hồi: sửa bằng PUT', async () => {
    render(<ReviewReplyDialog row={row('Cũ')} onClose={vi.fn()} onChanged={vi.fn()} />);

    const box = screen.getByLabelText('Phản hồi từ Quang Hưởng');
    await userEvent.clear(box);
    await userEvent.type(box, 'Mới');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => expect(reviews.editReply).toHaveBeenCalledWith('r1', 'Mới'));
    expect(reviews.reply).not.toHaveBeenCalled();
  });

  it('phản hồi rỗng không gọi API', async () => {
    render(<ReviewReplyDialog row={row(null)} onClose={vi.fn()} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));
    expect(await screen.findByText('Nội dung phản hồi là bắt buộc')).toBeInTheDocument();
    expect(reviews.reply).not.toHaveBeenCalled();
  });
});
