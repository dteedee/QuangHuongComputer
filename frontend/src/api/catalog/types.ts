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
}

// ============ Phase 03: Media / Variants / Specifications ============

export type MediaType = 'Image' | 'Video' | 'YoutubeEmbed';

export interface ProductMedia {
    id: string;
    productId: string;
    variantId?: string;
    type: MediaType;
    url: string;
    thumbnailUrl?: string;
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
    slug?: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    deactivatedAt?: string;
    deactivatedBy?: string;
    productCount?: number;
}

export interface Brand {
    id: string;
    name: string;
    description: string;
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
    attributes?: string;
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
