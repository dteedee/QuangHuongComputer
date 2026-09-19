import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CartTotals } from './cart-totals';

/**
 * D01: mọi con số hiển thị PHẢI là số server trả, component không tự tính gì.
 * Bảo vệ đúng regression đã sửa: `checkout-order-summary.tsx` từng tự nhân `subtotal * 0.1`.
 */
describe('CartTotals', () => {
  it('tax = 0 -> KHÔNG hiển thị dòng "Trong đó VAT"', () => {
    render(<CartTotals subtotal={100000} discountAmount={0} shippingAmount={0} total={100000} tax={0} />);
    expect(screen.queryByText(/Trong đó VAT/)).not.toBeInTheDocument();
  });

  it('một mức VAT duy nhất -> hiện đúng % và đúng số tiền VAT do server trả (không tự tính lại)', () => {
    render(
      <CartTotals
        subtotal={1000000}
        discountAmount={0}
        shippingAmount={0}
        total={1100000}
        tax={100000}
        vatBreakdown={[{ rate: 0.1, vat: 100000 }]}
      />,
    );
    const vatNote = screen.getByText(/Trong đó VAT \(10%\):/);
    // formatDong renders "100.000" - assert exact figure appears, not a recomputed one.
    expect(vatNote.textContent).toContain('100.000');
  });

  it('nhiều mức VAT -> không in một % duy nhất, liệt kê từng mức theo breakdown', () => {
    const { container } = render(
      <CartTotals
        subtotal={1000000}
        discountAmount={0}
        shippingAmount={0}
        total={1080000}
        tax={80000}
        vatBreakdown={[
          { rate: 0.1, vat: 50000 },
          { rate: 0.05, vat: 30000 },
        ]}
      />,
    );
    expect(container.textContent).toContain('Trong đó VAT:');
    expect(container.textContent).not.toMatch(/Trong đó VAT \(\d+%\)/); // không được chọn một % duy nhất
    expect(container.textContent).toContain('VAT 10%');
    expect(container.textContent).toContain('VAT 5%');
  });

  it('shippingUnknown -> hiện "Tính ở bước thanh toán" thay vì phí 0đ giả', () => {
    render(
      <CartTotals subtotal={100000} discountAmount={0} shippingAmount={0} total={100000} tax={0} shippingUnknown />,
    );
    expect(screen.getByText('Tính ở bước thanh toán')).toBeInTheDocument();
  });

  it('discountAmount > 0 -> hiện dòng Giảm giá với đúng số tiền server trả', () => {
    render(<CartTotals subtotal={200000} discountAmount={20000} shippingAmount={0} total={180000} tax={0} />);
    expect(screen.getByText('Giảm giá')).toBeInTheDocument();
    expect(screen.getByText(/20\.000/)).toBeInTheDocument();
  });
});
