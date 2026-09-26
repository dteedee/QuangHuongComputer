import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WriteReviewModal from './WriteReviewModal';

const api = vi.hoisted(() => ({ createProductReview: vi.fn(), uploadReviewPhoto: vi.fn() }));
vi.mock('../../api/catalog/public-product', () => ({ catalogPublicProductApi: api }));
const notifyMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock('../ui/toast', async (orig) => ({ ...(await orig<typeof import('../ui/toast')>()), notify: notifyMock }));

const image = (name: string, type = 'image/jpeg', size = 1000) => {
  const file = new File(['x'.repeat(10)], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};
const pick = (files: File[]) =>
  fireEvent.change(screen.getByTestId('review-photo-input'), { target: { files } });

const renderModal = (onSubmitted = vi.fn(), onClose = vi.fn()) =>
  render(<WriteReviewModal isOpen onClose={onClose} productId="p1" productName="Laptop ASUS" onReviewSubmitted={onSubmitted} />);

describe('WriteReviewModal', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    Object.values(notifyMock).forEach((fn) => fn.mockReset());
    let n = 0;
    api.uploadReviewPhoto.mockImplementation(async () => {
      n += 1;
      const hex = String(n).padStart(32, '0');
      return { url: `/media/u/reviews/2026/09/${hex}-review-w1600.webp`, thumbnailUrl: `/media/u/reviews/2026/09/${hex}-review-w400.webp` };
    });
  });

  it('từ chối file không phải ảnh và ảnh thứ 6', async () => {
    renderModal();
    pick([image('a.svg', 'image/svg+xml')]);
    await waitFor(() => expect(notifyMock.error).toHaveBeenCalledWith(expect.stringContaining('chỉ nhận ảnh JPG, PNG hoặc WebP')));
    expect(api.uploadReviewPhoto).not.toHaveBeenCalled();

    pick([1, 2, 3, 4, 5, 6].map((i) => image(`p${i}.jpg`)));
    await waitFor(() => expect(api.uploadReviewPhoto).toHaveBeenCalledTimes(5));
    expect(notifyMock.error).toHaveBeenCalledWith('Tối đa 5 ảnh cho một đánh giá');
    expect(screen.getByRole('button', { name: 'Thêm ảnh' })).toBeDisabled();
  });

  it('từ chối ảnh quá 5MB', async () => {
    renderModal();
    pick([image('big.png', 'image/png', 6 * 1024 * 1024)]);
    await waitFor(() => expect(notifyMock.error).toHaveBeenCalledWith(expect.stringContaining('vượt quá 5MB')));
    expect(api.uploadReviewPhoto).not.toHaveBeenCalled();
  });

  it('tải ảnh rồi gửi đánh giá kèm ảnh, ưu và nhược điểm', async () => {
    api.createProductReview.mockResolvedValue({ id: 'r1', message: 'ok', isVerifiedPurchase: true });
    const onSubmitted = vi.fn();
    renderModal(onSubmitted);

    await userEvent.click(screen.getByRole('radio', { name: /5 sao/ }));
    await userEvent.type(screen.getByLabelText(/Nội dung đánh giá/), 'Máy chạy êm, pin trâu cả ngày.');
    await userEvent.type(screen.getByLabelText('Ưu điểm (tuỳ chọn)'), 'Nhẹ');
    await userEvent.type(screen.getByLabelText('Nhược điểm (tuỳ chọn)'), 'Hơi nóng');
    pick([image('a.jpg'), image('b.webp', 'image/webp')]);
    await waitFor(() => expect(api.uploadReviewPhoto).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gửi đánh giá' })).toBeEnabled());

    await userEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));

    await waitFor(() => expect(api.createProductReview).toHaveBeenCalledTimes(1));
    const [productId, body] = api.createProductReview.mock.calls[0];
    expect(productId).toBe('p1');
    expect(body).toMatchObject({ rating: 5, pros: 'Nhẹ', cons: 'Hơi nóng', comment: 'Máy chạy êm, pin trâu cả ngày.' });
    expect(body.photos).toHaveLength(2);
    expect(body.photos[0].url).toMatch(/^\/media\/u\/reviews\//);
    expect(onSubmitted).toHaveBeenCalled();
  });
});
