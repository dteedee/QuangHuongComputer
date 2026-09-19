import { describe, it, expect, beforeEach } from 'vitest';
import {
  GUEST_CART_KEY,
  readGuestLines,
  writeGuestLines,
  clearGuestLines,
  mergeGuestLine,
} from './guest-cart-storage';

/**
 * Giỏ khách vãng lai (localStorage) — logic thuần, không cần MSW.
 * Bảo vệ đúng bug class W3-2 mô tả: khách thêm cùng một sản phẩm/biến thể hai lần
 * phải CỘNG dồn số lượng vào một dòng, không tạo dòng trùng.
 */
describe('guest-cart-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mergeGuestLine: thêm sản phẩm mới -> thêm dòng mới', () => {
    const next = mergeGuestLine([], { productId: 'p1', quantity: 2 });
    expect(next).toEqual([{ productId: 'p1', quantity: 2 }]);
  });

  it('mergeGuestLine: thêm lại đúng sản phẩm + biến thể -> cộng dồn số lượng vào MỘT dòng, không nhân đôi dòng', () => {
    const first = mergeGuestLine([], { productId: 'p1', variantId: 'v1', quantity: 1 });
    const second = mergeGuestLine(first, { productId: 'p1', variantId: 'v1', quantity: 2 });
    expect(second).toHaveLength(1);
    expect(second[0]).toEqual({ productId: 'p1', variantId: 'v1', quantity: 3 });
  });

  it('mergeGuestLine: cùng productId nhưng KHÁC biến thể -> hai dòng riêng biệt', () => {
    const first = mergeGuestLine([], { productId: 'p1', variantId: 'v1', quantity: 1 });
    const second = mergeGuestLine(first, { productId: 'p1', variantId: 'v2', quantity: 1 });
    expect(second).toHaveLength(2);
  });

  it('writeGuestLines rồi readGuestLines -> đọc lại đúng dữ liệu đã ghi (round-trip qua localStorage)', () => {
    writeGuestLines([{ productId: 'p1', quantity: 3 }]);
    expect(readGuestLines()).toEqual([{ productId: 'p1', quantity: 3 }]);
    expect(localStorage.getItem(GUEST_CART_KEY)).not.toBeNull();
  });

  it('writeGuestLines([]) -> xoá hẳn key khỏi localStorage, không để lại mảng rỗng', () => {
    writeGuestLines([{ productId: 'p1', quantity: 1 }]);
    writeGuestLines([]);
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull();
    expect(readGuestLines()).toEqual([]);
  });

  it('readGuestLines: dữ liệu hỏng trong localStorage (không phải mảng) -> trả mảng rỗng, không throw', () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ not: 'an array' }));
    expect(readGuestLines()).toEqual([]);
  });

  it('readGuestLines: dòng thiếu productId hoặc quantity không phải số -> bị lọc bỏ', () => {
    localStorage.setItem(
      GUEST_CART_KEY,
      JSON.stringify([{ productId: 'p1', quantity: 1 }, { quantity: 2 }, { productId: 'p2', quantity: 'x' }]),
    );
    expect(readGuestLines()).toEqual([{ productId: 'p1', quantity: 1 }]);
  });

  it('readGuestLines: số lượng âm hoặc lẻ -> làm tròn về nguyên dương tối thiểu 1', () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([{ productId: 'p1', quantity: -5 }]));
    expect(readGuestLines()).toEqual([{ productId: 'p1', quantity: 1 }]);
  });

  it('clearGuestLines -> xoá key, readGuestLines trả mảng rỗng', () => {
    writeGuestLines([{ productId: 'p1', quantity: 1 }]);
    clearGuestLines();
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull();
    expect(readGuestLines()).toEqual([]);
  });
});
