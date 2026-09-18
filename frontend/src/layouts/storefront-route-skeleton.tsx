/**
 * Content-shaped Suspense fallback for storefront routes (RootLayout) — a hero band + a
 * product-grid shape, close enough to most storefront pages that swapping it for the real
 * content doesn't jump the layout around. Replaces the old full-page spinner that covered the
 * header/footer on every route change (phase-17 Implementation Steps 7: "Per-layout Suspense
 * ... with content-shaped skeletons").
 */
export const StorefrontRouteSkeleton = () => (
    <div className="animate-pulse px-4 py-8 max-w-7xl mx-auto" aria-hidden="true">
        <div className="h-8 w-1/3 bg-gray-200 rounded-lg mb-3" />
        <div className="h-4 w-1/2 bg-gray-100 rounded mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                    <div className="aspect-square bg-gray-200 rounded-xl" />
                    <div className="h-3 bg-gray-200 rounded w-4/5" />
                    <div className="h-3 bg-gray-100 rounded w-2/5" />
                </div>
            ))}
        </div>
    </div>
);
