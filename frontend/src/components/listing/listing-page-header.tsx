/** Breadcrumb + H1 + result count for the listing page. */
import { Breadcrumb, type BreadcrumbItem } from '../ui';

export interface ListingPageHeaderProps {
    breadcrumb: BreadcrumbItem[];
    title: string;
    total: number;
    /** Hidden when the category slug matched nothing — "0 sản phẩm" would lie. */
    showCount: boolean;
    isLoading: boolean;
}

export const ListingPageHeader = ({ breadcrumb, title, total, showCount, isLoading }: ListingPageHeaderProps) => (
    <div className="mx-auto w-full max-w-shell px-4 pt-4">
        <Breadcrumb items={breadcrumb} />
        <h1 className="mt-2 text-2xl font-bold text-fg sm:text-3xl">{title}</h1>
        {showCount && (
            <p className="mt-1 text-sm text-fg-muted" aria-live="polite">
                {isLoading ? 'Đang tải sản phẩm…' : `${total} sản phẩm`}
            </p>
        )}
    </div>
);

export default ListingPageHeader;
