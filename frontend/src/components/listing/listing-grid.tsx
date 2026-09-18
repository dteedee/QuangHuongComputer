/** Result grid + its skeleton. Cards reveal in a 40ms storefront stagger. */
import { ProductCard } from '../ProductCard';
import { Reveal } from '../motion';
import { Skeleton } from '../ui';
import type { ListingProduct } from '../../api/catalog/public-listing';

export const ListingGridSkeleton = ({ count = 12 }: { count?: number }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4" aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="space-y-2 p-3">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-5 w-1/2" />
                </div>
            </div>
        ))}
    </div>
);

export const ListingGrid = ({ products }: { products: ListingProduct[] }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {products.map((product, i) => (
            // `Reveal` registers with the shared IntersectionObserver on mount,
            // so cards rendered AFTER the fetch resolves are observed too (the
            // prototype's bug: late nodes stayed at opacity 0 forever).
            <Reveal key={product.id} index={i} cap={6} className="h-full">
                <ProductCard product={product} />
            </Reveal>
        ))}
    </div>
);

export default ListingGrid;
