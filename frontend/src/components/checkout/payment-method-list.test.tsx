import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentMethodList, usePaymentMethodChoice } from './payment-method-list';
import { COD_FALLBACK } from '../../api/payments/methods';

/**
 * D04 R1 (binding): danh sách phương thức render 100% từ server; gọi lỗi -> rơi về đúng COD,
 * không có tên/logo nhà cung cấp nào bị hardcode ở FE.
 */
const mockUsePaymentMethods = vi.hoisted(() => vi.fn());
vi.mock('../../api/payments/methods', async () => {
  const actual = await vi.importActual('../../api/payments/methods');
  return { ...actual, usePaymentMethods: mockUsePaymentMethods };
});

function Harness() {
  const choice = usePaymentMethodChoice('cod', () => {});
  return <PaymentMethodList choice={choice} value="cod" onChange={() => {}} />;
}

describe('PaymentMethodList (D04)', () => {
  it('API lỗi (degraded=true) -> chỉ hiện đúng COD, kèm cảnh báo "Tạm thời chỉ nhận thanh toán khi nhận hàng"', () => {
    mockUsePaymentMethods.mockReturnValue({
      data: { methods: [COD_FALLBACK], degraded: true },
      isPending: false,
    });
    render(<Harness />);
    expect(screen.getByText(COD_FALLBACK.name)).toBeInTheDocument();
    expect(screen.getByText(/Tạm thời chỉ nhận thanh toán khi nhận hàng/)).toBeInTheDocument();
    // No hardcoded provider name should ever appear when the server never sent one.
    expect(screen.queryByText(/VNPay|Momo|SePay|ZaloPay/i)).not.toBeInTheDocument();
  });

  it('API trả nhiều phương thức -> hiện đúng TÊN server trả (không phải nhãn cứng ở FE), không có cảnh báo degraded', () => {
    mockUsePaymentMethods.mockReturnValue({
      data: {
        methods: [
          { code: 'cod', name: 'Thanh toán khi nhận hàng', description: '', requiresRedirect: false, direct: true, sortOrder: 1 },
          { code: 'bank_transfer', name: 'Chuyển khoản QR', description: '', requiresRedirect: false, direct: true, sortOrder: 2 },
        ],
        degraded: false,
      },
      isPending: false,
    });
    render(<Harness />);
    expect(screen.getByText('Chuyển khoản QR')).toBeInTheDocument();
    expect(screen.queryByText(/Tạm thời chỉ nhận thanh toán khi nhận hàng/)).not.toBeInTheDocument();
  });
});
