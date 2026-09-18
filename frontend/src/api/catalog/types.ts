/**
 * Catalog types — shared by `public-listing.ts`, `public-product.ts` and
 * `admin.ts`. Moved verbatim out of the old flat `api/catalog.ts` (W1-9,
 * `phase-18-w1-fe-form-kit-api.md` step 7c); `api/catalog.ts` now re-exports
 * everything here so existing importers (`import { Product } from
 * '../api/catalog'`) keep working unchanged.
 */

export interface Product {
    id: string;
    slug?: string;
    name: string;
    sku: string;
    description: string;
    specifications?: string;
    warrantyInfo?: string;
    categoryId: string;
    brandId: string;
    stockQuantity: number;
    stockLocations?: string; // JSON string
    status: 'InStock' | 'LowStock' | 'OutOfStock' | 'PreOrder';

    // Enhanced fields
    price: number;
    oldPrice?: number;
    costPrice?: number;
    barcode?: string;
    weight: number;
    imageUrl?: string;
    galleryImages?: string;
    viewCount: number;
    soldCount: number;
    averageRating: number;
    reviewCount: number;
    publishedAt?: string;
    discontinuedAt?: string;
    lowStockThreshold: number;
    createdByUserId?: string;
    updatedByUserId?: string;

    // SEO fields
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    canonicalUrl?: string;

    // Audit fields
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;

    // Variant-aware fields (Phase 03)
    defaultVariantId?: string;
    priceFrom?: number; // Giá thấp nhất khi có nhiều biến thể; nếu undefined coi như dùng `price`

    /** JSON extensibility: freeform key/value attributes (JSON string, validated against CustomFieldDefinition) */
    attributes?: string;

    // ---- Fields the ONE `ProductDto` projection really returns (docs/api-contracts/catalog.md §1).
    // Added by W3-4 after probing GET /api/catalog/products against :5050 — they were already on
    // the wire, the TS type just did not declare them.
    categoryName?: string | null;
    categorySlug?: string | null;
    brandName?: string | null;
    brandSlug?: string | null;
    /** D02 — relative path derived from the primary media row. */
    thumbnailUrl?: string | null;
    /** D08 — product-level warranty override, in months. `null` = fall back to category policy. */
    warrantyMonths?: number | null;
    /** D08 — excluded from 1-for-1 exchange / buy-back ONLY, never from warranty. */
    isReturnExcluded?: boolean;
    /** D07 — "Chiếc" by default, "Lần" for services. */
    unitName?: string | null;
    /** Present only when the detail call used `?include=media`. */
    medias?: ProductMedia[] | null;
    /** Present only when the detail call used `?include=variants`. */
    variants?: ProductVariant[] | null;
}

/**
 * Detail shape the ADMIN editor asks for (`?include=media,specs,variants`).
 * Kept separate from `ProductDetailBundle` (storefront, W3-7) because that one
 * declares `specGroups` as the *schema* type `SpecificationGroup[]`, while the
 * projection actually returns group+value pairs — see catalog.md §1.
 */
export interface AdminProductDetail extends Product {
    specGroups?: ProductSpecGroup[] | null;
}

/** `specGroups[i]` of the detail projection — see catalog.md §1. */
export interface ProductSpecGroup {
    groupId: string;
    groupName: string;
    sortOrder: number;
    values: Array<{
        attributeId: string;
        key: string;
        name: string;
        unit?: string | null;
        dataType: SpecDataType;
        value: string;
    }>;
}

/** One row of `ProductPriceChanges` (D10). Written by the CatalogDbContext SaveChanges hook. */
export interface ProductPriceChange {
    id: string;
    productId: string;
    oldPrice?: number | null;
    newPrice?: number | null;
    oldCostPrice?: number | null;
    newCostPrice?: number | null;
    source?: string | null;
    actorId?: string | null;
    at: string;
}

// ============ Phase 03: Media / Variants / Specifications ============

export type MediaType = 'Image' | 'Video' | 'YoutubeEmbed';

export interface ProductMedia {
    id: string;
    productId: string;
    variantId?: string;
    type: MediaType;
    url: string;
    thumbnailUrl?: string | null;
    altText?: string;
    sortOrder: number;
    isPrimary: boolean;
    fileSize?: number;
    durationSeconds?: number;
}

export type OptionInputType = 'Dropdown' | 'Swatch' | 'Button';

export interface ProductOptionValue {
    id: string;
    optionTypeId: string;
    value: string;
    displayValue: string;
    colorHex?: string;
    sortOrder: number;
}

export interface ProductOptionType {
    id: string;
    name: string;
    displayName: string;
    inputType: OptionInputType;
    sortOrder: number;
    values: ProductOptionValue[];
}

export interface VariantOptionAssignment {
    optionTypeId: string;
    optionValueId: string;
    typeName: string;
    valueDisplay: string;
    colorHex?: string;
}

export type VariantStatus = 'Active' | 'Inactive' | 'OutOfStock';

export interface ProductVariant {
    id: string;
    productId: string;
    sku: string;
    name: string;
    price: number;
    oldPrice?: number;
    costPrice?: number;
    stockQuantity: number;
    barcode?: string;
    isDefault: boolean;
    status: VariantStatus;
    sortOrder: number;
    options: VariantOptionAssignment[];
}

export type SpecDataType = 'Text' | 'Number' | 'Boolean' | 'Enum';

export interface SpecificationAttribute {
    id: string;
    groupId: string;
    key: string;
    name: string;
    unit?: string;
    dataType: SpecDataType;
    isFilterable: boolean;
    isComparable: boolean;
    sortOrder: number;
}

export interface SpecificationGroup {
    id: string;
    categoryId?: string;
    name: string;
    sortOrder: number;
    attributes: SpecificationAttribute[];
}

export interface ProductSpecificationValue {
    productId: string;
    attributeId: string;
    valueText?: string;
    valueNumber?: number;
    valueBool?: boolean;
    /** Payload sẵn có cho UI hiển thị (nếu backend trả kèm). */
    attribute?: SpecificationAttribute;
}

export interface StockByBranch {
    warehouseId: string;
    warehouseName: string;
    quantity: number;
    address?: string;
    openingHours?: string;
}

export interface CategoryFilterOption {
    value: string;
    label: string;
    count: number;
}

export interface CategoryFilter {
    attributeId: string;
    key: string;
    name: string;
    unit?: string;
    dataType: SpecDataType;
    options?: CategoryFilterOption[];
    numberRange?: { min: number; max: number };
}

export interface ProductDetailBundle extends Product {
    medias: ProductMedia[];
    variants: ProductVariant[];
    specs: ProductSpecificationValue[];
    specGroups?: SpecificationGroup[];
    stockByBranch?: StockByBranch[];
}

export interface ProductReview {
    id: string;
    productId: string;
    customerId: string;
    rating: number;
    title?: string;
    comment: string;
    isVerifiedPurchase: boolean;
    isApproved: boolean;
    helpfulCount: number;
    approvedAt?: string;
    approvedBy?: string;
    imageUrls?: string;
    videoUrl?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface ProductAttribute {
    id: string;
    productId: string;
    attributeName: string;
    attributeValue: string;
    displayOrder: number;
    isFilterable: boolean;
}

export interface Category {
    id: string;
    slug?: string | null;
    name: string;
    description: string;
    /** Tree edge — `GET /categories` returns a FLAT list, the FE builds the tree. */
    parentId?: string | null;
    imageUrl?: string | null;
    icon?: string | null;
    displayOrder?: number;
    metaTitle?: string | null;
    metaDescription?: string | null;
    /** D01 — statutory VAT fraction (0 / 0.05 / 0.1), NOT a percentage. */
    vatRate?: number | null;
    /** D01 — eligible for the Nghị quyết VAT reduction. */
    vatReductionEligible?: boolean;
    /** D08 — every SKU in this category is tracked by serial number. */
    isSerialTracked?: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    deactivatedAt?: string;
    deactivatedBy?: string;
    productCount?: number;
}

export interface Brand {
    id: string;
    slug?: string | null;
    name: string;
    description: string;
    logoUrl?: string | null;
    website?: string | null;
    displayOrder?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    deactivatedAt?: string;
    deactivatedBy?: string;
    productCount?: number;
}

export interface ProductsResponse {
    total: number;
    page: number;
    pageSize: number;
    products: Product[];
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    rangeFrom?: number;
    rangeTo?: number;
}

export interface CreateProductDto {
    name: string;
    sku?: string;
    description: string;
    price: number;
    costPrice?: number;
    categoryId: string;
    brandId: string;
    stockQuantity: number;
    specifications?: string;
    warrantyInfo?: string;
    barcode?: string;
    weight?: number;
    imageUrl?: string;
    galleryImages?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    attributes?: string;
    warrantyMonths?: number;
    isReturnExcluded?: boolean;
    unitName?: string | null;
}

export interface UpdateProductDto {
    name?: string;
    description?: string;
    price?: number;
    oldPrice?: number;
    costPrice?: number;
    categoryId?: string;
    brandId?: string;
    stockQuantity?: number;
    lowStockThreshold?: number;
    sku?: string;
    barcode?: string;
    weight?: number;
    specifications?: string;
    warrantyInfo?: string;
    stockLocations?: string;
    imageUrl?: string;
    galleryImages?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    canonicalUrl?: string;
    attributes?: string;
    slug?: string;
    warrantyMonths?: number;
    isReturnExcluded?: boolean;
    unitName?: string | null;
    /** JSON cannot tell "absent" from "null" on a nullable — these erase explicitly. */
    clearOldPrice?: boolean;
    clearWarrantyMonths?: boolean;
}

/** `CreateCategoryDto` / `UpdateCategoryDto` (backend `CatalogDtos.cs:62-90`). */
export interface CategoryWriteDto {
    name: string;
    description: string;
    parentId?: string | null;
    clearParent?: boolean;
    imageUrl?: string | null;
    icon?: string | null;
    displayOrder?: number;
    metaTitle?: string | null;
    metaDescription?: string | null;
    vatRate?: number | null;
    vatReductionEligible?: boolean;
    isSerialTracked?: boolean;
    isActive?: boolean;
    slug?: string;
}

/** `CreateBrandDto` / `UpdateBrandDto` (backend `CatalogDtos.cs:92-106`). */
export interface BrandWriteDto {
    name: string;
    description: string;
    logoUrl?: string | null;
    website?: string | null;
    displayOrder?: number;
    isActive?: boolean;
    slug?: string;
}

/** Body of the specification-group CRUD routes (catalog.md §8). */
export interface SpecGroupWriteDto {
    name: string;
    categoryId?: string | null;
    sortOrder: number;
}

/** Body of the specification-attribute CRUD routes (catalog.md §8). `key` is immutable on update. */
export interface SpecAttributeWriteDto {
    key?: string;
    name: string;
    dataType: SpecDataType;
    unit?: string | null;
    enumValuesJson?: string | null;
    isFilterable: boolean;
    isComparable: boolean;
    sortOrder: number;
}

/** Row shape of `GET /catalog/reviews/admin/pending` (catalog.md §9). */
export interface PendingReview {
    id: string;
    productId: string;
    productName: string;
    customerId: string;
    rating: number;
    title?: string | null;
    comment: string;
    isVerifiedPurchase: boolean;
    createdAt: string;
}

/** Row shape of `GET /catalog/reviews/admin/sentiment-analysis`. */
export interface ReviewSentiment {
    positivePercent: number;
    neutralPercent: number;
    negativePercent: number;
    totalReviews: number;
    topKeywords: string[];
}

export interface UpdateBundleRequest {
    name: string;
    description?: string;
    totalPrice: number;
    originalPrice: number;
    imageUrl?: string;
    validFrom?: string;
    validTo?: string;
    items: Array<{ productId: string; isMainItem: boolean; quantity: number; discountPercentage: number }>;
}
