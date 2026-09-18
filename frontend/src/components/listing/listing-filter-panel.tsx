/**
 * The filter body. One implementation, rendered twice: inline in the desktop
 * sidebar and inside the mobile drawer — the audit found two divergent filter
 * components that disagreed on which params they wrote.
 *
 * Groups with no options are not rendered (phase §2). That is load-bearing
 * today: `facets[].values` is `[]` for every spec attribute until
 * `ProductSpecificationValues` is bulk-loaded (catalog contract §3), so the
 * spec groups legitimately stay hidden instead of showing empty checkbox lists.
 */
import { Checkbox } from '../ui';
import { ListingPriceFilter } from './listing-price-filter';
import type { ListingPatch, ListingState } from './use-listing-query';
import type { PublicBrand } from '../../api/catalog/public-listing';
import type { CategoryFilter } from '../../api/catalog/types';

export interface ListingFilterPanelProps {
    state: ListingState;
    brands: PublicBrand[];
    specFilters: CategoryFilter[];
    onChange: (patch: ListingPatch) => void;
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="border-b border-line py-4 first:pt-0 last:border-b-0">
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h3>
        {children}
    </section>
);

export const ListingFilterPanel = ({ state, brands, specFilters, onChange }: ListingFilterPanelProps) => {
    const specGroups = specFilters.filter((f) => (f.options?.length ?? 0) > 0);

    return (
        <div className="text-sm">
            <Group title="Khoảng giá">
                <ListingPriceFilter minPrice={state.minPrice} maxPrice={state.maxPrice} onChange={onChange} />
            </Group>

            {brands.length > 0 && (
                <Group title="Thương hiệu">
                    <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
                        {brands.map((brand) => {
                            const active = state.brandSlug === brand.slug;
                            return (
                                <li key={brand.id}>
                                    <button
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => onChange({ brandSlug: active ? null : brand.slug ?? null })}
                                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors duration-140 ${
                                            active ? 'bg-brand-subtle font-semibold text-brand-text' : 'text-fg-muted hover:bg-sunken hover:text-fg'
                                        }`}
                                    >
                                        <span className="truncate">{brand.name}</span>
                                        {typeof brand.productCount === 'number' && (
                                            <span className="ml-2 shrink-0 text-2xs text-fg-subtle">({brand.productCount})</span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </Group>
            )}

            <Group title="Tình trạng">
                <Checkbox
                    label="Chỉ hiện sản phẩm còn hàng"
                    checked={state.inStock}
                    onChange={(e) => onChange({ inStock: e.target.checked ? true : null })}
                />
            </Group>

            {specGroups.map((filter) => (
                <Group key={filter.attributeId || filter.key} title={filter.unit ? `${filter.name} (${filter.unit})` : filter.name}>
                    <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                        {filter.options!.map((option) => {
                            const active = state.specs[filter.key] === option.value;
                            return (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => onChange({ specs: { [filter.key]: active ? null : option.value } })}
                                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors duration-140 ${
                                            active ? 'bg-brand-subtle font-semibold text-brand-text' : 'text-fg-muted hover:bg-sunken hover:text-fg'
                                        }`}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        <span className="ml-2 shrink-0 text-2xs text-fg-subtle">({option.count})</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </Group>
            ))}
        </div>
    );
};

export default ListingFilterPanel;
