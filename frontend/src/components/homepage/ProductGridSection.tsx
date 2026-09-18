/**
 * CMS section adapter (`sectionType: product_grid` / `product_grid_with_panels`).
 *
 * The old implementation pulled ONE 50-item page of products and filtered it in
 * the browser by `categoryId`, so sections silently emptied once the catalogue
 * passed ~70 rows. All it does now is translate the CMS `configuration` blob
 * into `<ProductSection>`, which queries the server per section.
 */
import { ProductSection } from './product-section';
import type { ListingSort } from '../../api/catalog/public-listing';

export interface ProductGridSectionProps {
    title: string;
    config?: {
        categoryId?: string;
        categorySlug?: string;
        limit?: number;
        sortBy?: ListingSort;
        showViewAll?: boolean;
    };
}

export const ProductGridSection = ({ title, config }: ProductGridSectionProps) => (
    <ProductSection
        title={title}
        categoryId={config?.categoryId}
        categorySlug={config?.categorySlug}
        limit={config?.limit ?? 10}
        sortBy={config?.sortBy ?? 'newest'}
        showViewAll={config?.showViewAll !== false}
    />
);

export default ProductGridSection;
