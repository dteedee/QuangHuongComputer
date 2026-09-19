import { describe, it, expect } from 'vitest';
import { readListingState, applyListingPatch, LISTING_PARAMS } from './use-listing-query';

/**
 * Bộ lọc listing phải round-trip qua URL: state -> URL -> state phải khớp, và một
 * đường link dán vào (URL có sẵn) phải đọc lại đúng state. Đây là bug class audit
 * tìm thấy: trang từng bỏ qua `?categoryId=` và hiện luôn cả 26 sản phẩm.
 */
describe('listing URL state round-trip', () => {
  it('URL trống -> state mặc định, hasFilters=false', () => {
    const state = readListingState(new URLSearchParams(''));
    expect(state).toMatchObject({ q: '', brandSlug: '', inStock: false, sort: 'newest', page: 1, hasFilters: false });
  });

  it('setFilters ghi hãng + khoảng giá + tồn kho -> đọc lại URL ra đúng state đó (round-trip)', () => {
    let params = new URLSearchParams('');
    params = applyListingPatch(params, { brandSlug: 'apple', minPrice: 1000000, maxPrice: 5000000, inStock: true });
    const state = readListingState(params);
    expect(state).toMatchObject({
      brandSlug: 'apple',
      minPrice: 1000000,
      maxPrice: 5000000,
      inStock: true,
      hasFilters: true,
    });
  });

  it('spec filter `spec.<key>=<value>` round-trip qua state.specs', () => {
    let params = new URLSearchParams('');
    params = applyListingPatch(params, { specs: { ram: '16GB' } });
    expect(params.get(`${LISTING_PARAMS.specPrefix}ram`)).toBe('16GB');
    const state = readListingState(params);
    expect(state.specs).toEqual({ ram: '16GB' });
    expect(state.hasFilters).toBe(true);
  });

  it('đổi bộ lọc trong khi đang ở trang 3 -> tự reset về trang 1 (tránh lưới trống)', () => {
    let params = new URLSearchParams(`${LISTING_PARAMS.page}=3`);
    params = applyListingPatch(params, { inStock: true });
    expect(params.get(LISTING_PARAMS.page)).toBeNull();
    expect(readListingState(params).page).toBe(1);
  });

  it('xoá bộ lọc hãng (remove: {brandSlug: null}) -> URL không còn tham số hãng, các bộ lọc khác giữ nguyên', () => {
    let params = new URLSearchParams('');
    params = applyListingPatch(params, { brandSlug: 'apple', inStock: true });
    params = applyListingPatch(params, { brandSlug: null });
    const state = readListingState(params);
    expect(state.brandSlug).toBe('');
    expect(state.inStock).toBe(true); // chip khác không bị xoá theo
  });

  it('sort không hợp lệ trong URL (bịa) -> rơi về "newest" thay vì crash/truyền thẳng lên API', () => {
    const state = readListingState(new URLSearchParams(`${LISTING_PARAMS.sort}=gia-tri-vo-nghia`));
    expect(state.sort).toBe('newest');
  });

  it('page âm hoặc không phải số trong URL -> rơi về trang 1', () => {
    expect(readListingState(new URLSearchParams(`${LISTING_PARAMS.page}=-5`)).page).toBe(1);
    expect(readListingState(new URLSearchParams(`${LISTING_PARAMS.page}=abc`)).page).toBe(1);
  });
});
