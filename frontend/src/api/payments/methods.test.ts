import { describe, it, expect, vi } from 'vitest';

/**
 * D04 R1 (binding): danh sách phương thức thanh toán render 100% từ server, KHÔNG bảng cứng.
 * Gọi lỗi -> hạ về đúng một phần tử COD (`degraded: true`) — khách vẫn đặt được hàng, không
 * bao giờ "ô sắp ra mắt" hay tên/logo nhà cung cấp tự bịa ra ở FE.
 */
const mockGet = vi.hoisted(() => vi.fn());
vi.mock('../client', () => ({ default: { get: mockGet } }));

describe('fetchPaymentMethods', () => {
  it('API trả danh sách hợp lệ -> dùng NGUYÊN dữ liệu server (tên/mô tả), sắp theo sortOrder, degraded=false', async () => {
    mockGet.mockResolvedValue({
      data: [
        { code: 'vnpay', name: 'VNPay', description: 'x', requiresRedirect: true, direct: true, sortOrder: 2 },
        { code: 'cod', name: 'Thanh toán khi nhận hàng', description: 'y', requiresRedirect: false, direct: true, sortOrder: 1 },
      ],
    });
    const { fetchPaymentMethods } = await import('./methods');
    const result = await fetchPaymentMethods();
    expect(result.degraded).toBe(false);
    expect(result.methods.map((m) => m.code)).toEqual(['cod', 'vnpay']); // sorted by sortOrder
    expect(result.methods[1].name).toBe('VNPay'); // literally server's name, not a hardcoded label
  });

  it('gọi API lỗi (mạng/500) -> hạ về CHỈ COD, degraded=true, không throw lên UI', async () => {
    mockGet.mockRejectedValue(new Error('network down'));
    vi.resetModules();
    const { fetchPaymentMethods } = await import('./methods');
    const result = await fetchPaymentMethods();
    expect(result.degraded).toBe(true);
    expect(result.methods).toHaveLength(1);
    expect(result.methods[0].code).toBe('cod');
  });

  it('API trả mảng rỗng -> cũng hạ về COD + degraded=true (không hiện giỏ hàng không thể thanh toán)', async () => {
    mockGet.mockResolvedValue({ data: [] });
    vi.resetModules();
    const { fetchPaymentMethods } = await import('./methods');
    const result = await fetchPaymentMethods();
    expect(result.degraded).toBe(true);
    expect(result.methods[0].code).toBe('cod');
  });
});
