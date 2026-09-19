import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListingAppliedChips } from './listing-applied-chips';
import type { ListingState } from './use-listing-query';

const baseState: ListingState = {
  q: '',
  brandSlug: 'apple',
  minPrice: 1000000,
  maxPrice: undefined,
  inStock: true,
  sort: 'newest',
  page: 1,
  specs: { ram: '16GB' },
  hasFilters: true,
};

describe('ListingAppliedChips', () => {
  it('bấm chip "Hãng" -> chỉ gửi patch xoá brandSlug, không đụng các bộ lọc khác', async () => {
    const onChange = vi.fn();
    render(<ListingAppliedChips state={baseState} brands={undefined} specLabels={{}} onChange={onChange} onClear={vi.fn()} />);
    await userEvent.click(screen.getByText(/Hãng: apple/));
    expect(onChange).toHaveBeenCalledWith({ brandSlug: null });
  });

  it('bấm chip "Giá" -> patch xoá cả minPrice lẫn maxPrice', async () => {
    const onChange = vi.fn();
    render(<ListingAppliedChips state={baseState} brands={undefined} specLabels={{}} onChange={onChange} onClear={vi.fn()} />);
    await userEvent.click(screen.getByText(/Giá:/));
    expect(onChange).toHaveBeenCalledWith({ minPrice: null, maxPrice: null });
  });

  it('bấm chip spec (RAM) -> patch chỉ xoá đúng spec key đó', async () => {
    const onChange = vi.fn();
    render(
      <ListingAppliedChips state={baseState} brands={undefined} specLabels={{ ram: 'RAM' }} onChange={onChange} onClear={vi.fn()} />,
    );
    await userEvent.click(screen.getByText(/RAM: 16GB/));
    expect(onChange).toHaveBeenCalledWith({ specs: { ram: null } });
  });

  it('không có bộ lọc nào áp dụng -> không render gì (không có nút "Xoá tất cả" thừa)', () => {
    const emptyState: ListingState = { ...baseState, brandSlug: '', minPrice: undefined, inStock: false, specs: {}, hasFilters: false };
    const { container } = render(
      <ListingAppliedChips state={emptyState} brands={undefined} specLabels={{}} onChange={vi.fn()} onClear={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('bấm "Xoá tất cả" -> gọi onClear, không gọi onChange', async () => {
    const onClear = vi.fn();
    const onChange = vi.fn();
    render(<ListingAppliedChips state={baseState} brands={undefined} specLabels={{}} onChange={onChange} onClear={onClear} />);
    await userEvent.click(screen.getByText('Xoá tất cả'));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
