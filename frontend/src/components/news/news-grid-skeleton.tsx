/** Loading frame for a post grid — same card shape as `NewsPostCard`, so nothing jumps when data lands. */
import { Skeleton, SkeletonText } from '../ui';

export const NewsGridSkeleton = ({ count = 6 }: { count?: number }) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Đang tải bài viết">
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <Skeleton rounded="rounded-none" className="aspect-video w-full" />
                <div className="p-4">
                    <SkeletonText lines={3} />
                </div>
            </div>
        ))}
    </div>
);

export default NewsGridSkeleton;
