import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { InstallmentForm } from './installment-form';

/**
 * D10 (binding, Luật 91/2025): hồ sơ trả góp KHÔNG được thu CCCD/CMND qua web — không có
 * ô tải ảnh giấy tờ nào trong luồng trả góp. Bảo vệ đúng regression: upload CCCD từng bị bỏ
 * (xem comment đầu file `installment-form.tsx`), test này khoá lại để không ai vô tình thêm lại.
 */
vi.mock('../../api/installment', () => ({
  installmentApi: {
    getProviders: vi.fn().mockResolvedValue([]),
    calculate: vi.fn(),
  },
}));

describe('InstallmentForm', () => {
  it('không render bất kỳ input[type=file] nào trong toàn bộ luồng trả góp', async () => {
    const { container } = render(
      <InstallmentForm totalAmount={10000000} onChange={vi.fn()} />,
    );
    await waitFor(() => expect(container.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });
});
