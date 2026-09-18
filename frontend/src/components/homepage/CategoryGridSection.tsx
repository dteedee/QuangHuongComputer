/**
 * Category tiles on the homepage, from the real category list.
 *
 * Fixed here (W3-1): tiles linked to `/products?category=<guid>` — a param no
 * page has ever read — so every tile showed the full catalogue. They now link
 * to `/danh-muc/<slug>` through `ROUTES`. The column count came from a
 * `md:grid-cols-${columns}` template string, which Tailwind purges (the class
 * never existed in the build), so the grid silently fell back to one column.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Camera, ChevronRight, Cpu, Gamepad, Headset, Laptop, LayoutGrid,
    Monitor, MousePointer2, Server, Speaker, Wifi, Wrench,
} from 'lucide-react';
import { Skeleton } from '../ui';
import { Reveal } from '../motion';
import { catalogPublicListingApi } from '../../api/catalog/public-listing';
import { queryKeys } from '../../lib/query-keys';
import { buildPath, ROUTES } from '../../routes/route-paths';

interface CategoryGridSectionProps {
    title?: string;
    config?: { limit?: number; columns?: number };
}

const ICONS: Array<[RegExp, typeof Laptop]> = [
    [/laptop/, Laptop],
    [/game|gaming/, Gamepad],
    [/workstation|đồ họa/, Server],
    [/màn|monitor/, Monitor],
    [/linh kiện|cpu|ram/, Cpu],
    [/phím|chuột|gear/, MousePointer2],
    [/mạng|wifi/, Wifi],
    [/camera/, Camera],
    [/loa|âm thanh|mic/, Speaker],
    [/phụ kiện|tai nghe/, Headset],
];

const iconFor = (name: string) => {
    const lower = name.toLowerCase();
    return ICONS.find(([re]) => re.test(lower))?.[1] ?? Wrench;
};

/* Static class strings — Tailwind must see them literally to emit them. */
const COLUMN_CLASS: Record<number, string> = {
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-3 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
    6: 'sm:grid-cols-3 lg:grid-cols-6',
};

export const CategoryGridSection = ({ title, config }: CategoryGridSectionProps) => {
    const { limit = 10, columns = 5 } = config ?? {};
    const query = useQuery({
        queryKey: queryKeys.catalog.list({ resource: 'categories' }),
        queryFn: catalogPublicListingApi.getCategories,
        staleTime: 5 * 60 * 1000,
    });

    // Only active categories that have products — the catalogue still holds
    // empty `w02-probe-*` rows left by a wave-2 API probe.
    const categories = (query.data ?? [])
        .filter((c) => c.isActive && (c.productCount ?? 0) > 0)
        .slice(0, limit);

    if (!query.isPending && categories.length === 0) return null;

    const gridClass = `grid grid-cols-2 gap-3 sm:gap-4 ${COLUMN_CLASS[columns] ?? COLUMN_CLASS[5]}`;

    return (
        <section className="mx-auto mt-10 w-full max-w-shell px-4">
            <div className="mb-3 flex items-end justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-fg sm:text-xl">
                    <LayoutGrid size={20} className="text-brand" aria-hidden />
                    {title || 'Danh mục sản phẩm'}
                </h2>
                <Link to={ROUTES.PRODUCTS} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-text hover:underline">
                    Tất cả <ChevronRight size={15} aria-hidden />
                </Link>
            </div>

            {query.isPending ? (
                <div className={gridClass} aria-hidden>
                    {Array.from({ length: Math.min(limit, columns * 2) }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                    ))}
                </div>
            ) : (
                <div className={gridClass}>
                    {categories.map((cat, i) => {
                        const Icon = iconFor(cat.name);
                        return (
                            <Reveal key={cat.id} index={i} cap={6} className="h-full">
                                <Link
                                    to={buildPath(ROUTES.CATEGORY, cat.slug ?? '')}
                                    className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-4 text-center transition duration-220 ease-out hover:-translate-y-0.5 hover:border-brand-line hover:shadow-md motion-reduce:transform-none"
                                >
                                    <Icon size={28} className="text-brand" aria-hidden />
                                    <span className="line-clamp-2 text-sm font-semibold text-fg">{cat.name}</span>
                                    <span className="text-2xs text-fg-subtle">{cat.productCount} sản phẩm</span>
                                </Link>
                            </Reveal>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default CategoryGridSection;
