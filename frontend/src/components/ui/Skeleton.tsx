import { cn } from '../../lib/utils';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = ({
    className,
    variant = 'text',
    width,
    height,
    animation = 'wave'
}: SkeletonProps) => {
    const variants = {
        text: 'rounded-md',
        circular: 'rounded-full',
        rectangular: 'rounded-none',
        rounded: 'rounded-xl'
    };

    const animations = {
        pulse: 'animate-pulse',
        wave: 'skeleton',
        none: ''
    };

    const style: React.CSSProperties = {
        width: width,
        height: height || (variant === 'text' ? '1em' : undefined)
    };

    return (
        <div
            className={cn(
                'bg-gray-200',
                variants[variant],
                animations[animation],
                className
            )}
            style={style}
        />
    );
};

// Product Card Skeleton
export const ProductCardSkeleton = () => {
    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <Skeleton className="w-full aspect-square" variant="rectangular" />
            <div className="p-4 space-y-3">
                <Skeleton width="60%" height={12} />
                <Skeleton width="100%" height={16} />
                <Skeleton width="80%" height={16} />
                <div className="flex justify-between items-center pt-2">
                    <Skeleton width={80} height={24} />
                    <Skeleton width={32} height={32} variant="circular" />
                </div>
            </div>
        </div>
    );
};

// Article/Blog Skeleton
export const ArticleSkeleton = () => {
    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <Skeleton className="w-full h-48" variant="rectangular" />
            <div className="p-4 space-y-3">
                <Skeleton width="40%" height={12} />
                <Skeleton width="100%" height={20} />
                <Skeleton width="90%" height={14} />
                <Skeleton width="70%" height={14} />
            </div>
        </div>
    );
};

// List Item Skeleton
export const ListItemSkeleton = () => {
    return (
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl">
            <Skeleton width={48} height={48} variant="circular" />
            <div className="flex-1 space-y-2">
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={12} />
            </div>
            <Skeleton width={80} height={32} variant="rounded" />
        </div>
    );
};

// Table Row Skeleton
export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => {
    return (
        <tr className="border-b border-gray-100">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton width={i === 0 ? '80%' : '60%'} height={14} />
                </td>
            ))}
        </tr>
    );
};

// Stats Card Skeleton
export const StatsCardSkeleton = () => {
    return (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center gap-4">
                <Skeleton width={56} height={56} variant="rounded" />
                <div className="space-y-2">
                    <Skeleton width={100} height={12} />
                    <Skeleton width={80} height={28} />
                </div>
            </div>
        </div>
    );
};

// Page Loading Skeleton
export const PageLoadingSkeleton = () => {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton width={200} height={32} />
                    <Skeleton width={300} height={16} />
                </div>
                <Skeleton width={120} height={40} variant="rounded" />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
};

export default Skeleton;
