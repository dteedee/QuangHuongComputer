/**
 * Category mega menu, built from the real category tree
 * (`GET /catalog/categories`, flat + `parentId` — the FE builds the tree).
 *
 * Brand logos are NOT rendered: every `brands[].logoUrl` is null on the live
 * data, and a fabricated logo strip is exactly the kind of invented content
 * this overhaul removes. Brands are reachable from the listing sidebar.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import type { PublicCategory } from '../../api/catalog/public-listing';
import { buildCategoryTree } from '../listing/catalog-listing-helpers';
import { buildPath, ROUTES } from '../../routes/route-paths';

export interface HeaderMegaMenuProps {
    categories: PublicCategory[];
    isLoading?: boolean;
}

export const HeaderMegaMenu = ({ categories, isLoading }: HeaderMegaMenuProps) => {
    const [open, setOpen] = useState(false);
    const tree = buildCategoryTree(categories);
    const [activeId, setActiveId] = useState<string | null>(null);
    const active = tree.find((c) => c.id === activeId) ?? tree[0];

    return (
        <div className="relative" onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onMouseEnter={() => setOpen(true)}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="true"
                className="flex h-10 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white transition-colors duration-140 hover:bg-brand-hover"
            >
                <LayoutGrid size={17} aria-hidden />
                Danh mục
            </button>

            {open && (
                <div className="absolute left-0 top-full z-floating flex w-[min(760px,90vw)] overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
                    <ul className="w-60 shrink-0 border-r border-line py-1.5">
                        {isLoading && <li className="px-4 py-2 text-sm text-fg-muted">Đang tải danh mục…</li>}
                        {!isLoading && tree.length === 0 && (
                            <li className="px-4 py-2 text-sm text-fg-muted">Chưa có danh mục nào.</li>
                        )}
                        {tree.map((c) => (
                            <li key={c.id}>
                                <Link
                                    to={buildPath(ROUTES.CATEGORY, c.slug ?? '')}
                                    onMouseEnter={() => setActiveId(c.id)}
                                    onClick={() => setOpen(false)}
                                    className={`flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors duration-140 ${
                                        active?.id === c.id ? 'bg-sunken font-semibold text-brand-text' : 'text-fg-muted hover:bg-sunken hover:text-fg'
                                    }`}
                                >
                                    <span className="truncate">{c.name}</span>
                                    <span className="flex shrink-0 items-center gap-1 text-2xs text-fg-subtle">
                                        {c.productCount ?? 0}
                                        <ChevronRight size={13} aria-hidden />
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>

                    <div className="min-w-0 flex-1 p-4">
                        {active ? (
                            <>
                                <Link
                                    to={buildPath(ROUTES.CATEGORY, active.slug ?? '')}
                                    onClick={() => setOpen(false)}
                                    className="text-sm font-bold uppercase tracking-wide text-fg hover:text-brand-text"
                                >
                                    {active.name}
                                </Link>
                                {active.children.length > 0 ? (
                                    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                                        {active.children.map((child) => (
                                            <li key={child.id}>
                                                <Link
                                                    to={buildPath(ROUTES.CATEGORY, child.slug ?? '')}
                                                    onClick={() => setOpen(false)}
                                                    className="block truncate py-0.5 text-sm text-fg-muted hover:text-brand-text"
                                                >
                                                    {child.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    /* `description` in the catalogue is an internal slug-ish
                                       note ("laptop", "components") — not customer copy. */
                                    <p className="mt-3 text-sm text-fg-muted">
                                        {active.productCount ?? 0} sản phẩm đang bán trong danh mục này.
                                    </p>
                                )}
                                <Link
                                    to={buildPath(ROUTES.CATEGORY, active.slug ?? '')}
                                    onClick={() => setOpen(false)}
                                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-text hover:underline"
                                >
                                    Xem tất cả <ChevronRight size={14} aria-hidden />
                                </Link>
                            </>
                        ) : (
                            <p className="text-sm text-fg-muted">Chưa có danh mục nào để hiển thị.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeaderMegaMenu;
