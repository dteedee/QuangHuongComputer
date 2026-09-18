/** Price range input + the usual VND presets. Commits on Apply, not per keystroke. */
import { useEffect, useState } from 'react';
import { Button, Input, formatDong } from '../ui';
import type { ListingPatch } from './use-listing-query';

const PRESETS: Array<{ label: string; min?: number; max?: number }> = [
    { label: 'Dưới 5 triệu', max: 5_000_000 },
    { label: '5 – 10 triệu', min: 5_000_000, max: 10_000_000 },
    { label: '10 – 20 triệu', min: 10_000_000, max: 20_000_000 },
    { label: '20 – 35 triệu', min: 20_000_000, max: 35_000_000 },
    { label: 'Trên 35 triệu', min: 35_000_000 },
];

export interface ListingPriceFilterProps {
    minPrice?: number;
    maxPrice?: number;
    onChange: (patch: ListingPatch) => void;
}

export const ListingPriceFilter = ({ minPrice, maxPrice, onChange }: ListingPriceFilterProps) => {
    const [min, setMin] = useState(minPrice?.toString() ?? '');
    const [max, setMax] = useState(maxPrice?.toString() ?? '');

    // The URL is the source of truth: a chip removed elsewhere must clear these.
    useEffect(() => { setMin(minPrice?.toString() ?? ''); }, [minPrice]);
    useEffect(() => { setMax(maxPrice?.toString() ?? ''); }, [maxPrice]);

    const commit = () => {
        const parsed = (raw: string) => {
            const n = Number(raw.replace(/\D/g, ''));
            return raw.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
        };
        onChange({ minPrice: parsed(min), maxPrice: parsed(max) });
    };

    return (
        <div className="space-y-3">
            <ul className="space-y-1.5">
                {PRESETS.map((p) => {
                    const active = minPrice === p.min && maxPrice === p.max;
                    return (
                        <li key={p.label}>
                            <button
                                type="button"
                                onClick={() => onChange({ minPrice: p.min ?? null, maxPrice: p.max ?? null })}
                                aria-pressed={active}
                                className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-140 ${
                                    active ? 'bg-brand-subtle font-semibold text-brand-text' : 'text-fg-muted hover:bg-sunken hover:text-fg'
                                }`}
                            >
                                {p.label}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <div className="flex items-end gap-2">
                <Input
                    inputSize="sm"
                    label="Từ"
                    inputMode="numeric"
                    placeholder="0"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                />
                <Input
                    inputSize="sm"
                    label="Đến"
                    inputMode="numeric"
                    placeholder="Không giới hạn"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                />
            </div>
            <Button size="sm" variant="secondary" className="w-full" onClick={commit}>
                Áp dụng khoảng giá
            </Button>
            {(minPrice !== undefined || maxPrice !== undefined) && (
                <p className="text-2xs text-fg-subtle">
                    Đang lọc: {minPrice !== undefined ? `${formatDong(minPrice)}₫` : '0₫'} –{' '}
                    {maxPrice !== undefined ? `${formatDong(maxPrice)}₫` : 'không giới hạn'}
                </p>
            )}
        </div>
    );
};

export default ListingPriceFilter;
