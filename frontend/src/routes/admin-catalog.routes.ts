// Backoffice catalog + content/marketing admin (W3-4 owns this file from here on).
// Permission mapping is best-effort: each route uses the PERMISSIONS_CATALOG entry whose
// `roles` set matches (or is the closest superset of) the OLD hardcoded role array it replaces —
// see phase-17 Security Considerations: this is a client UX gate, backend policies are the
// real boundary, so an imperfect mapping is not a security regression.
import { lazy } from 'react';
import type { RouteDef, RedirectDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const AdminProductsPage = lazy(() => import('../pages/admin/ProductsPage').then((m) => ({ default: m.AdminProductsPage })));
const CategoriesPage = lazy(() => import('../pages/admin/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const BrandsPage = lazy(() => import('../pages/admin/BrandsPage'));
const MenuManager = lazy(() => import('../pages/admin/MenuManager').then((m) => ({ default: m.MenuManager })));
const HomepageBuilder = lazy(() => import('../pages/admin/HomepageBuilder').then((m) => ({ default: m.HomepageBuilder })));
const PromotionsPage = lazy(() => import('../pages/admin/PromotionsPage'));
const CouponsPage = lazy(() => import('../pages/backoffice/admin/CouponsPage').then((m) => ({ default: m.CouponsPage })));
const CMSPortal = lazy(() => import('../pages/backoffice/CMSPortal').then((m) => ({ default: m.CMSPortal })));
const ReviewsManagementPage = lazy(() => import('../pages/backoffice/admin/ReviewsManagementPage').then((m) => ({ default: m.ReviewsManagementPage })));

// custom-fields / form-builder / automation-rules: deleted, not migrated — `/api/config/*` is
// Admin-only server-side and the pages were unmaintained scope creep (delete-only ownership,
// phase-17 Related Code Files: `pages/admin/{FormBuilderPage,CustomFieldsManager,AutomationRulesPage}.tsx`).

export const adminCatalogRoutes: RouteDef[] = [
  { path: 'products', element: AdminProductsPage, layout: 'backoffice', group: 'sales', icon: 'Package', title: 'Sản phẩm', description: 'Danh sách sản phẩm', permission: PERMISSIONS.CATALOG_MANAGE, name: 'products' },
  { path: 'categories', element: CategoriesPage, layout: 'backoffice', group: 'sales', icon: 'Archive', title: 'Danh mục', description: 'Phân loại sản phẩm', permission: PERMISSIONS.CATALOG_MANAGE, name: 'categories' },
  { path: 'brands', element: BrandsPage, layout: 'backoffice', group: 'sales', icon: 'Tag', title: 'Thương hiệu', description: 'Hãng sản xuất', permission: PERMISSIONS.CATALOG_MANAGE, name: 'brands' },
  { path: 'menus', element: MenuManager, layout: 'backoffice', group: 'content', icon: 'Menu', title: 'Menu Manager', description: 'Quản lý menu', permission: PERMISSIONS.CONTENT_MANAGE_MENUS, name: 'menus' },
  { path: 'homepage-builder', element: HomepageBuilder, layout: 'backoffice', group: 'content', icon: 'Sparkles', title: 'Homepage Builder', description: 'Xây dựng trang chủ', permission: PERMISSIONS.CONTENT_MANAGE_PAGES, name: 'homepageBuilder' },
  { path: 'promotions', element: PromotionsPage, layout: 'backoffice', group: 'content', icon: 'Zap', title: 'Khuyến mãi', description: 'Giảm giá & Flash Sale', permission: PERMISSIONS.CONTENT_MANAGE_COUPONS, name: 'promotions' },
  { path: 'coupons', element: CouponsPage, layout: 'backoffice', group: 'content', icon: 'Ticket', title: 'Mã giảm giá', description: 'Voucher & coupon', permission: PERMISSIONS.CONTENT_MANAGE_COUPONS, name: 'coupons' },
  { path: 'cms', element: CMSPortal, layout: 'backoffice', group: 'content', icon: 'FileText', title: 'Quản lý Nội dung', description: 'Bài viết & trang', permission: PERMISSIONS.CONTENT_MANAGE_PAGES, name: 'cms' },
  // No `Permissions.Reviews.*` exists in the W1-1 catalog — escape hatch (route-types.ts `allowedRoles`).
  { path: 'reviews', element: ReviewsManagementPage, layout: 'backoffice', group: 'content', icon: 'Star', title: 'Đánh giá', description: 'Review sản phẩm', allowedRoles: ['Admin', 'Manager'], name: 'reviews' },
];

export const adminCatalogRedirects: RedirectDef[] = [
  // Flash Sales merged into Promotions (kept as a query-string alias, not a component — see App.tsx history).
  { from: 'flash-sales', to: '/backoffice/promotions?type=FlashSale', layout: 'backoffice' },
];
