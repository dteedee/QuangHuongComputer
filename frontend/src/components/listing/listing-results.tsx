/**
 * The four states of the result area, in one place: skeleton while loading,
 * a retryable error, an empty state that says what to do next, or the grid +
 * pagination. No path renders a silent blank.
 */
import type { UseQueryResult } from '@tanstack/react-query';
import { PackageSearch } from 'lucide-react';
import { EmptyState, ErrorState, Pagination } from '../ui';
import { ListingGrid, ListingGridSkeleton } from './listing-grid';
import { PAGE_SIZE } from './use-listing-query';
import type { ListingResponse } from '../../api/catalog/public-listing';

export interface ListingResultsProps {
    query: UseQueryResult<ListingResponse>;
    /** The URL carries a category slug that matches no category. */
    unknownCategory: boolean;
    hasFilters: boolean;
    onClearFilters: () => void;
    onBrowseAll: () => void;
    onPageChange: (page: number) => void;
}

export const ListingResults = ({
    query,
    unknownCategory,
    hasFilters,
    onClearFilters,
    onBrowseAll,
    onPageChange,
}: ListingResultsProps) => {
    if (unknownCategory) {
        return (
            <EmptyState
                icon={PackageSearch}
                title="Không tìm thấy danh mục"
                description="Danh mục này không còn tồn tại hoặc đã đổi đường dẫn."
                action={{ label: 'Xem tất cả sản phẩm', onClick: onBrowseAll }}
            />
        );
    }
    if (query.isPending) return <ListingGridSkeleton count={PAGE_SIZE / 2} />;
    if (query.isError) {
        return (
            <ErrorState
                title="Không tải được danh sách sản phẩm"
                error={query.error}
                onRetry={() => query.refetch()}
            />
        );
    }

    const data = query.data;
    if (data.total === 0) {
        return (
            <EmptyState
                icon={PackageSearch}
                title="Chưa có sản phẩm phù hợp"
                description={
                    hasFilters
                        ? 'Thử bỏ bớt bộ lọc hoặc mở rộng khoảng giá để thấy nhiều sản phẩm hơn.'
                        : 'Danh mục này chưa có sản phẩm nào được đăng bán.'
                }
                action={hasFilters ? { label: 'Xoá bộ lọc', onClick: onClearFilters } : undefined}
            />
        );
    }

    return (
        <>
            <ListingGrid products={data.products} />
            <Pagination
                className="mt-6"
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                onPageChange={onPageChange}
            />
        </>
    );
};

export default ListingResults;
