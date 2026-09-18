/**
 * Pure helpers over the catalog listing DTOs. Split out of
 * `api/catalog/public-listing.ts` to keep every file under 200 LOC: the API
 * module declares shapes and issues requests, this one reshapes what comes back.
 */
import type { CategoryFilter } from '../../api/catalog/types';
import type { ListingFacet, PublicCategory } from '../../api/catalog/public-listing';

/**
 * Facet (server shape) -> `CategoryFilter` (UI shape). Exported because the
 * listing page maps the `facets` array that comes back inline with a search,
 * which saves a second round-trip to `/categories/{id}/filters`.
 *
 * Note (contract §3, adversarially verified 2026-09-18): `values` is `[]` for
 * every attribute until `ProductSpecificationValues` is bulk-loaded, so every
 * mapped filter legitimately has zero options today and the UI hides it.
 */
export function mapFacetsToFilters(facets: ListingFacet[] | null | undefined): CategoryFilter[] {
    return (facets ?? []).map((f) => {
        const base: CategoryFilter = {
            attributeId: f.attributeId,
            key: f.attributeKey,
            name: f.attributeName,
            unit: f.unit ?? undefined,
            dataType: f.dataType,
        };

        if (f.dataType === 'Number') {
            const nums = f.values.map((v) => Number(v.value)).filter((n) => !Number.isNaN(n));
            if (nums.length > 0) {
                base.numberRange = { min: Math.min(...nums), max: Math.max(...nums) };
            }
        } else if (f.dataType === 'Enum' || f.dataType === 'Text') {
            base.options = f.values
                .filter((v) => v.value !== null && v.value !== undefined)
                .map((v) => ({ value: String(v.value), label: String(v.value), count: v.count }));
        }

        return base;
    });
}

/** Builds the category tree the mega menu renders from the flat API list. */
export interface CategoryNode extends PublicCategory {
    children: CategoryNode[];
}

export function buildCategoryTree(categories: PublicCategory[]): CategoryNode[] {
    const nodes = new Map<string, CategoryNode>();
    for (const c of categories) nodes.set(c.id, { ...c, children: [] });
    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
        const parent = node.parentId ? nodes.get(node.parentId) : undefined;
        if (parent) parent.children.push(node);
        else roots.push(node);
    }
    const byOrder = (a: CategoryNode, b: CategoryNode) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name, 'vi');
    roots.sort(byOrder);
    for (const node of nodes.values()) node.children.sort(byOrder);
    return roots;
}
