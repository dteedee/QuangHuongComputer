import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BrandPill {
    label: string;
    value: string;
}

interface ProductSectionHeaderProps {
    /** Tiêu đề section — sẽ hiển thị UPPERCASE. */
    title: string;
    /** Link "Xem tất cả →". */
    viewAllHref?: string;
    /** Pills lọc theo brand (border, radius full, hover đỏ). */
    brandPills?: BrandPill[];
    activeBrand?: string;
    onBrandChange?: (value: string) => void;
}

/**
 * Header row dùng chung cho mọi product section (homepage + trang danh mục):
 * title UPPERCASE bold trái + brand filter pills + nút "Xem tất cả →" đỏ.
 * DRY theo hacom.vn product section pattern.
 */
export const ProductSectionHeader = ({
    title,
    viewAllHref,
    brandPills,
    activeBrand,
    onBrandChange,
}: ProductSectionHeaderProps) => {
    return (
        <div className="flex flex-nowrap items-center gap-3 mb-4 overflow-hidden">
            <h2 className="shrink-0 text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">
                {title}
            </h2>
            {brandPills && brandPills.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-hide min-w-0">
                    {brandPills.map((pill) => (
                        <button
                            key={pill.value}
                            type="button"
                            onClick={() => onBrandChange?.(pill.value)}
                            className={`shrink-0 px-3 py-1 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                                activeBrand === pill.value
                                    ? 'bg-accent border-accent text-white'
                                    : 'border-gray-200 text-gray-600 hover:border-accent hover:text-accent'
                            }`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            )}
            {viewAllHref && (
                <Link
                    to={viewAllHref}
                    className="shrink-0 ml-auto flex items-center gap-1 text-sm font-bold text-accent hover:text-accent-hover transition-colors cursor-pointer whitespace-nowrap"
                >
                    Xem tất cả <ChevronRight size={16} />
                </Link>
            )}
        </div>
    );
};
