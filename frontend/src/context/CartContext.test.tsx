import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider, useCart, type CartProductInput } from './CartContext';

/**
 * `addToCart` thất bại -> phải báo lỗi cho khách, KHÔNG được hiện toast thành công
 * (regression W3-2: khách bấm "Thêm vào giỏ" hết hàng nhưng vẫn thấy dòng thành công).
 */
const mockAuth = vi.hoisted(() => ({ isAuthenticated: false }));
const mockNotify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const mockCartApi = vi.hoisted(() => ({
  cart: {
    get: vi.fn(),
    addItem: vi.fn(),
    merge: vi.fn(),
    removeItem: vi.fn(),
  },
  publicCart: {
    addItem: vi.fn(),
  },
}));

vi.mock('./AuthContext', () => ({ useAuth: () => mockAuth }));
vi.mock('../components/ui', () => ({ notify: mockNotify }));
vi.mock('../api/sales/cart-checkout', () => ({ salesCartCheckoutApi: mockCartApi }));
vi.mock('../components/cart/guest-cart-storage', async () => {
  const actual = await vi.importActual('../components/cart/guest-cart-storage');
  return { ...actual, hydrateGuestLines: vi.fn().mockResolvedValue({ lines: [], dropped: [] }) };
});

const product: CartProductInput = { id: 'p1', name: 'Chuột Logitech', price: 100000, stockQuantity: 5 };

function TestHarness() {
  const { addToCart } = useCart();
  return (
    <button onClick={() => void addToCart(product, 1)}>Thêm vào giỏ</button>
  );
}

describe('CartContext.addToCart', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuth.isAuthenticated = false;
    mockNotify.success.mockReset();
    mockNotify.error.mockReset();
    mockCartApi.publicCart.addItem.mockReset();
    mockCartApi.cart.addItem.mockReset();
    mockCartApi.cart.get.mockReset();
    mockCartApi.cart.merge.mockReset();
  });

  it('server từ chối thêm hàng (hết hàng) -> hiện toast LỖI, KHÔNG hiện toast thành công', async () => {
    mockCartApi.publicCart.addItem.mockRejectedValue({
      response: { status: 409, data: { message: 'Sản phẩm đã hết hàng' } },
    });
    render(<CartProvider><TestHarness /></CartProvider>);
    await userEvent.click(screen.getByText('Thêm vào giỏ'));

    await waitFor(() => expect(mockNotify.error).toHaveBeenCalledTimes(1));
    expect(mockNotify.error).toHaveBeenCalledWith('Sản phẩm đã hết hàng');
    expect(mockNotify.success).not.toHaveBeenCalled();
  });

  it('server nhận hàng thành công -> hiện toast thành công, không hiện toast lỗi', async () => {
    mockCartApi.publicCart.addItem.mockResolvedValue({ id: 'guest-cart', itemCount: 1 });
    render(<CartProvider><TestHarness /></CartProvider>);
    await userEvent.click(screen.getByText('Thêm vào giỏ'));

    await waitFor(() => expect(mockNotify.success).toHaveBeenCalledTimes(1));
    expect(mockNotify.success).toHaveBeenCalledWith(expect.stringContaining('Chuột Logitech'));
    expect(mockNotify.error).not.toHaveBeenCalled();
  });

  it('addToCart trả về false khi thất bại, true khi thành công (giá trị trả về để nơi gọi biết kết quả thật)', async () => {
    mockCartApi.publicCart.addItem.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    let result: boolean | undefined;
    function Harness2() {
      const { addToCart } = useCart();
      return <button onClick={async () => { result = await addToCart(product, 1); }}>go</button>;
    }
    render(<CartProvider><Harness2 /></CartProvider>);
    await userEvent.click(screen.getByText('go'));
    await waitFor(() => expect(result).toBe(false));
  });
});
