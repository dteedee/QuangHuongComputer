/**
 * Loading skeleton for the homepage.
 * Shows shimmer placeholders for hero, banners, and product grids.
 */
export const HomepageSkeleton = () => (
    <div className="space-y-8 pb-20 animate-pulse">
        {/* Hero Skeleton */}
        <div className="max-w-[1400px] mx-auto px-4 pt-6">
            <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl h-[400px] md:h-[480px] relative overflow-hidden">
                <div className="absolute inset-0 shimmer-fast" />
            </div>
        </div>

        {/* Category Grid Skeleton */}
        <div className="max-w-[1400px] mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-xl h-28 relative overflow-hidden border border-gray-100">
                        <div className="absolute inset-0 shimmer-fast" />
                    </div>
                ))}
            </div>
        </div>

        {/* Product Grid Skeleton */}
        <div className="max-w-[1400px] mx-auto px-4 mt-8">
            <div className="bg-gray-200 rounded-t-2xl h-14 relative overflow-hidden">
                <div className="absolute inset-0 shimmer-fast" />
            </div>
            <div className="bg-white rounded-b-2xl border border-gray-200 border-t-0 p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="space-y-3">
                            <div className="aspect-[4/3] bg-gray-100 rounded-lg relative overflow-hidden">
                                <div className="absolute inset-0 shimmer-fast" />
                            </div>
                            <div className="h-3 bg-gray-100 rounded w-full" />
                            <div className="h-3 bg-gray-100 rounded w-2/3" />
                            <div className="h-5 bg-gray-200 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Trust Badges Skeleton */}
        <div className="max-w-[1400px] mx-auto px-4">
            <div className="bg-white rounded-2xl h-24 relative overflow-hidden border border-gray-100">
                <div className="absolute inset-0 shimmer-fast" />
            </div>
        </div>
    </div>
);
