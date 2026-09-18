/**
 * CMS section adapter (`sectionType: product_grid_with_panels`).
 *
 * The side panels the name refers to were decorative banners with no data
 * behind them; the section now renders the same server-filtered product row as
 * `product_grid` so both CMS section types behave identically instead of
 * diverging.
 */
import { ProductGridSection, type ProductGridSectionProps } from './ProductGridSection';

export const ProductGridWithPanels = (props: ProductGridSectionProps) => <ProductGridSection {...props} />;

export default ProductGridWithPanels;
