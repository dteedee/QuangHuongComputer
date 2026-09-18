/**
 * Search box with live suggestions.
 *
 * Suggestions come from the real `GET /catalog/products/search` (catalog
 * contract §2) debounced at 300ms — there is no dedicated suggestions endpoint,
 * and inventing one client-side is not an option. Each row shows the thumbnail,
 * the price and the stock status (the UX-research must-have). Below that:
 * the customer's own recent searches and the catalogue's categories.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { catalogPublicListingApi, type PublicCategory } from '../../api/catalog/public-listing';
import { queryKeys } from '../../lib/query-keys';
import { buildPath, ROUTES } from '../../routes/route-paths';
import { useRecentSearches } from './use-recent-searches';
import { HeaderSearchSuggestions } from './header-search-suggestions';

const SUGGESTION_LIMIT = 6;

export interface HeaderSearchAutocompleteProps {
    categories: PublicCategory[];
    /** Mobile overlay renders the panel inline and full-width. */
    variant?: 'pill' | 'overlay';
    autoFocus?: boolean;
    onNavigate?: () => void;
    className?: string;
}

export const HeaderSearchAutocomplete = ({
    categories,
    variant = 'pill',
    autoFocus = false,
    onNavigate,
    className,
}: HeaderSearchAutocompleteProps) => {
    const navigate = useNavigate();
    const [term, setTerm] = useState('');
    const [open, setOpen] = useState(variant === 'overlay');
    const rootRef = useRef<HTMLDivElement>(null);
    const debounced = useDebounce(term.trim(), 300);
    const { recent, remember, clear } = useRecentSearches();

    const suggestions = useQuery({
        queryKey: queryKeys.catalog.list({ suggest: debounced }),
        queryFn: () => catalogPublicListingApi.searchProducts({ query: debounced, pageSize: SUGGESTION_LIMIT }),
        enabled: debounced.length >= 2,
        staleTime: 60 * 1000,
    });

    useEffect(() => {
        if (variant === 'overlay') return;
        const onClickOutside = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [variant]);

    const go = (to: string, keyword?: string) => {
        if (keyword) remember(keyword);
        setOpen(variant === 'overlay');
        onNavigate?.();
        navigate(to);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = term.trim();
        if (!value) return;
        go(`${ROUTES.SEARCH}?q=${encodeURIComponent(value)}`, value);
    };

    const showPanel = open && (variant === 'overlay' || term.length > 0 || recent.length > 0);

    return (
        <div ref={rootRef} className={`relative ${className ?? ''}`}>
            <form
                onSubmit={submit}
                role="search"
                className={
                    variant === 'pill'
                        ? 'flex h-10 overflow-hidden rounded-full border-2 border-brand bg-surface'
                        : 'flex h-11 overflow-hidden rounded-xl border border-line-strong bg-surface'
                }
            >
                <input
                    type="search"
                    autoFocus={autoFocus}
                    value={term}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
                    placeholder="Tìm laptop, PC, linh kiện..."
                    aria-label="Tìm kiếm sản phẩm"
                    className="min-w-0 flex-1 bg-transparent px-4 text-sm text-fg outline-none placeholder:text-fg-subtle"
                />
                {term && (
                    <button type="button" onClick={() => setTerm('')} aria-label="Xoá từ khoá" className="px-2 text-fg-subtle hover:text-fg">
                        <X size={16} aria-hidden />
                    </button>
                )}
                <button type="submit" aria-label="Tìm kiếm" className="bg-brand px-5 text-white transition-colors duration-140 hover:bg-brand-hover">
                    <Search size={18} aria-hidden />
                </button>
            </form>

            {showPanel && (
                <div
                    className={
                        variant === 'pill'
                            ? 'absolute left-0 right-0 top-full z-floating mt-1 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface shadow-lg'
                            : 'mt-3 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface'
                    }
                >
                    <HeaderSearchSuggestions
                        term={debounced}
                        query={suggestions}
                        onPick={go}
                    />
                    {recent.length > 0 && (
                        <div className="border-b border-line p-2">
                            <div className="flex items-center justify-between px-2 py-1">
                                <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Tìm kiếm gần đây</span>
                                <button type="button" onClick={clear} className="text-2xs text-fg-subtle underline hover:text-brand">Xoá</button>
                            </div>
                            <ul className="flex flex-wrap gap-1.5 px-2 pb-1">
                                {recent.map((keyword) => (
                                    <li key={keyword}>
                                        <button
                                            type="button"
                                            onClick={() => { setTerm(keyword); go(`${ROUTES.SEARCH}?q=${encodeURIComponent(keyword)}`, keyword); }}
                                            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-2xs text-fg-muted hover:border-brand-line hover:text-brand-text"
                                        >
                                            <Clock size={11} aria-hidden /> {keyword}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {categories.length > 0 && (
                        <div className="p-2">
                            <p className="px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Danh mục nổi bật</p>
                            <ul className="flex flex-wrap gap-1.5 px-2 pb-1">
                                {categories.slice(0, 8).map((c) => (
                                    <li key={c.id}>
                                        <button
                                            type="button"
                                            onClick={() => go(buildPath(ROUTES.CATEGORY, c.slug ?? ''))}
                                            className="inline-flex rounded-full border border-line px-2.5 py-1 text-2xs text-fg-muted hover:border-brand-line hover:text-brand-text"
                                        >
                                            {c.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HeaderSearchAutocomplete;
