/**
 * Content-shaped Suspense fallback for backoffice routes (BackofficeLayout) — a header bar +
 * table-row shape, matching the toolbar+table/card pattern nearly every backoffice page uses.
 * See `layouts/storefront-route-skeleton.tsx` for the storefront counterpart and
 * phase-17 Implementation Steps 7.
 */
export const BackofficeRouteSkeleton = () => (
    <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-9 w-28 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        </div>
        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 flex items-center gap-4 px-4 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-1/6" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-1/6" />
                </div>
            ))}
        </div>
    </div>
);
