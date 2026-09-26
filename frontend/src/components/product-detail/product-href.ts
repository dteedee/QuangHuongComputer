import type { Product } from '../../api/catalog/types';
import { buildPath, ROUTES } from '../../routes/route-paths';

/** Canonical PDP link: slug URL, or the legacy `/product/:id` route while a slug is missing. */
export function productHref(product: Pick<Product, 'id' | 'slug'>): string {
    return product.slug ? buildPath(ROUTES.PRODUCT_DETAIL, product.slug) : `/product/${product.id}`;
}
