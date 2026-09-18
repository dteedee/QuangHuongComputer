/**
 * Applied filters as removable chips — the UX research "must-have" that makes
 * it obvious why a grid is showing 3 products instead of 26.
 */
import { X } from 'lucide-react';
import { formatDong } from '../ui';
import type { ListingPatch, ListingState } from './use-listing-query';
import type { PublicBrand } from '../../api/catalog/public-listing';

export interface ListingAppliedChipsProps {
    state: ListingState;
    brands: PublicBrand[] | undefined;
    specLabels: Record<string, string>;
    onChange: (patch: ListingPatch) => void;
    onClear: () => void;
}

interface Chip {
    key: string;
    label: string;
    remove: ListingPatch;
}

export const ListingAppliedChips = ({ state, brands, specLabels, onChange, onClear }: ListingAppliedChipsProps) => {
    const chips: Chip[] = [];

    if (state.brandSlug) {
        const brand = brands?.find((b) => b.slug === state.brandSlug);
        chips.push({ key: 'brand', label: `Hãng: ${brand?.name ?? state.brandSlug}`, remove: { brandSlug: null } });
    }
    if (state.minPrice !== undefined || state.maxPrice !== undefined) {
        const from = state.minPrice !== undefined ? `${formatDong(state.minPrice)}₫` : '0₫';
        const to = state.maxPrice !== undefined ? `${formatDong(state.maxPrice)}₫` : 'trở lên';
        chips.push({ key: 'price', label: `Giá: ${from} – ${to}`, remove: { minPrice: null, maxPrice: null } });
    }
    if (state.inStock) {
        chips.push({ key: 'stock', label: 'Chỉ hàng còn sẵn', remove: { inStock: null } });
    }
    for (const [key, value] of Object.entries(state.specs)) {
        chips.push({
            key: `spec-${key}`,
            label: `${specLabels[key] ?? key}: ${value}`,
            remove: { specs: { [key]: null } },
        });
    }

    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2" aria-label="Bộ lọc đang áp dụng">
            {chips.map((chip) => (
                <button
                    key={chip.key}
                    type="button"
                    onClick={() => onChange(chip.remove)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-subtle px-3 py-1 text-2xs font-medium text-brand-text transition-colors duration-140 hover:bg-brand hover:text-white"
                >
                    {chip.label}
                    <X size={12} aria-hidden />
                    <span className="sr-only">Bỏ bộ lọc</span>
                </button>
            ))}
            <button
                type="button"
                onClick={onClear}
                className="text-2xs font-medium text-fg-muted underline underline-offset-2 transition-colors duration-140 hover:text-brand"
            >
                Xoá tất cả
            </button>
        </div>
    );
};

export default ListingAppliedChips;
