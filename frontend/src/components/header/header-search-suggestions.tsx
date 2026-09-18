/**
 * The product-suggestion block of the header search panel: thumbnail, name,
 * price and stock status per row, plus a "see all N results" footer.
 * Split out of `header-search-autocomplete.tsx` to keep files under 200 LOC.
 */
import type { UseQueryResult } from '@tanstack/react-query';
import { Img, Price } from '../ui';
import type { ListingResponse } from '../../api/catalog/public-listing';
import { buildPath, ROUTES } from '../../routes/route-paths';

export interface HeaderSearchSuggestionsProps {
    /** Debounced term; nothing renders below 2 characters. */
    term: string;
    query: UseQueryResult<ListingResponse>;
    onPick: (to: string, keyword?: string) => void;
}

export const HeaderSearchSuggestions = ({ term, query, onPick }: HeaderSearchSuggestionsProps) => {
    if (term.length < 2) return null;
    const products = query.data?.products ?? [];

    return (
        <div className="border-b border-line p-2">
            {query.isPending ? (
                <p className="px-2 py-3 text-sm text-fg-muted">Đang tìm…</p>
            ) : query.isError ? (
                <p className="px-2 py-3 text-sm text-danger">Không tải được gợi ý. Nhấn Enter để tìm.</p>
            ) : products.length === 0 ? (
                <p className="px-2 py-3 text-sm text-fg-muted">Không có sản phẩm nào khớp “{term}”.</p>
            ) : (
                <ul>
                    {products.map((p) => (
                        <li key={p.id}>
                            <button
                                type="button"
                                onClick={() => onPick(p.slug ? buildPath(ROUTES.PRODUCT_DETAIL, p.slug) : `/product/${p.id}`, term)}
                                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors duration-140 hover:bg-sunken"
                            >
                                <Img
                                    src={p.thumbnailUrl || p.imageUrl}
                                    alt={p.name}
                                    ratio="1/1"
                                    blend
                                    wrapperClassName="w-12 shrink-0 rounded-md"
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="line-clamp-2 block text-sm text-fg">{p.name}</span>
                                    <span className="mt-0.5 flex items-center gap-2">
                                        <Price value={p.price} compareAt={p.oldPrice ?? null} className="text-sm" />
                                        <span className={`text-2xs ${p.stockQuantity > 0 ? 'text-stock' : 'text-fg-subtle'}`}>
                                            {p.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                                        </span>
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                    <li>
                        <button
                            type="button"
                            onClick={() => onPick(`${ROUTES.SEARCH}?q=${encodeURIComponent(term)}`, term)}
                            className="w-full rounded-lg px-2 py-2 text-center text-sm font-semibold text-brand-text hover:bg-sunken"
                        >
                            Xem tất cả {query.data?.total ?? 0} kết quả
                        </button>
                    </li>
                </ul>
            )}
        </div>
    );
};

export default HeaderSearchSuggestions;
