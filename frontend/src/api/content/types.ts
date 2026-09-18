/**
 * Content types — shared by `public.ts` and `admin.ts`. Moved verbatim out of
 * the old flat `api/content.ts` (W1-9, step 7c); `api/content.ts` re-exports
 * everything here.
 */

export interface Post {
    id: string;
    title: string;
    slug: string;
    content: string;
    thumbnailUrl?: string;
    summary?: string;
    category?: string;
    tags?: string[];
    type: 'Article' | 'News' | 'Promotion' | 'Banner' | 'Ad';
    isPublished: boolean;
    publishedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Page {
    id: string;
    title: string;
    slug: string;
    content: string;
    summary?: string;
    type: 'Custom' | 'About' | 'Contact' | 'FAQ' | 'Terms' | 'Privacy' | 'Shipping' | 'Returns' | 'Warranty';
    isPublished: boolean;
    publishedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Coupon {
    id: string;
    code: string;
    description: string;
    discountType: 'Percentage' | 'FixedAmount';
    discountValue: number;
    minOrderAmount: number;
    maxDiscount?: number;
    usageLimit?: number;
    usageCount?: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type MenuLocation = 'HeaderMain' | 'HeaderTop' | 'FooterMain' | 'FooterBottom' | 'Sidebar' | 'Mobile';
export type MenuItemType = 'Custom' | 'Page' | 'Category' | 'Product' | 'Homepage' | 'Contact';

export interface MenuItem {
    id: string;
    label: string;
    url: string;
    icon?: string;
    parentId?: string;
    order: number;
    openInNewTab: boolean;
    type?: MenuItemType;
    cssClass?: string;
    pageId?: string;
    categoryId?: string;
    menuId: string;
}

export interface Menu {
    id: string;
    name: string;
    code: string;
    location: MenuLocation;
    order: number;
    cssClass?: string;
    items: MenuItem[];
}

export interface HomepageSection {
    id: string;
    sectionType: string;
    title: string;
    displayOrder: number;
    configuration: string | null;
    cssClass: string | null;
    isActive?: boolean;
    isVisible?: boolean;
}
export interface FlashSale {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    bannerImageUrl?: string;
    discountType: 'Percentage' | 'FixedAmount';
    discountValue: number;
    maxDiscount?: number;
    startTime: string;
    endTime: string;
    productIds?: string;
    categoryIds?: string;
    applyToAllProducts: boolean;
    maxQuantityPerOrder?: number;
    totalQuantityLimit?: number;
    soldQuantity: number;
    displayOrder: number;
    status: 'Scheduled' | 'Active' | 'Ended' | 'Cancelled';
    badgeText?: string;
    badgeColor?: string;
    isActive: boolean;
    isCurrentlyActive?: boolean;
    timeRemaining?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateFlashSaleDto {
    name: string;
    description: string;
    discountType: 'Percentage' | 'FixedAmount';
    discountValue: number;
    startTime: string;
    endTime: string;
    maxDiscount?: number;
    imageUrl?: string;
    bannerImageUrl?: string;
    productIds?: string;
    categoryIds?: string;
    applyToAllProducts?: boolean;
    maxQuantityPerOrder?: number;
    totalQuantityLimit?: number;
    displayOrder?: number;
    badgeText?: string;
    badgeColor?: string;
}

// Contact Message Types
export interface ContactMessage {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
    subject: string;
    message: string;
    status: 'New' | 'Read' | 'Replied' | 'Archived';
    adminNotes?: string;
    repliedBy?: string;
    repliedAt?: string;
    ipAddress?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateContactMessageDto {
    fullName: string;
    phone: string;
    email?: string;
    subject: string;
    message: string;
}
