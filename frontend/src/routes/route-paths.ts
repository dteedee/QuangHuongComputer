import type { RouteDef, RouteLayout } from './route-types';

/**
 * Canonical public Vietnamese URL contract (D11 §2, `docs/seo-url-contract.md`).
 * Every internal `<Link to>` must resolve through this constant or through
 * `paths` below — never a hand-typed string (enforced by the
 * `no-hardcoded-route-strings` ESLint rule, see eslint.config.js).
 *
 * `/xay-dung-cau-hinh` (PC builder, W3-9) is reserved here but NOT yet a
 * rendered route — no page component exists in this codebase yet
 * (`api/pcbuilder.ts` does, the FE page doesn't). Wiring a `<Route>` to a
 * component that doesn't exist would fabricate a feature, so it stays a
 * 404 until W3-9 ships the page.
 */
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/san-pham',
  PRODUCT_DETAIL: '/san-pham/:slug',
  CATEGORY: '/danh-muc/:slug',
  SEARCH: '/tim-kiem',
  NEWS: '/tin-tuc',
  NEWS_DETAIL: '/tin-tuc/:slug',
  PROMOTIONS: '/khuyen-mai',
  PROMOTION_DETAIL: '/khuyen-mai/:slug',
  // `Promotion` (FlashSale) has no slug — one landing page shows every running sale.
  FLASH_SALE: '/flash-sale',
  POLICY: '/chinh-sach/:type',
  TERMS: '/dieu-khoan',
  PRIVACY: '/bao-mat',
  ABOUT: '/gioi-thieu',
  CONTACT: '/lien-he',
  WARRANTY: '/bao-hanh',
  REPAIR: '/sua-chua',
  REPAIR_DETAIL: '/sua-chua/:id',
  REPAIR_TRACKING: '/tra-cuu-sua-chua',
  MY_WARRANTIES: '/tai-khoan/bao-hanh',
  WARRANTY_CLAIM_NEW: '/tai-khoan/bao-hanh/yeu-cau-moi',
  SUPPORT: '/ho-tro',
  BACKOFFICE: '/backoffice',
  RECRUITMENT: '/tuyen-dung',
  RECRUITMENT_DETAIL: '/tuyen-dung/:id',
  STORES: '/he-thong-cua-hang',
  PC_BUILDER: '/xay-dung-cau-hinh',
  COMPARE: '/so-sanh',
  // Public but noindex (D11) — real pages, not meant to be indexed.
  CART: '/gio-hang',
  CHECKOUT: '/thanh-toan',
  ACCOUNT: '/tai-khoan',
  GUEST_ORDER_LOOKUP: '/tra-cuu-don-hang',
  // Unchanged on purpose (D11 §2): no SEO value, 20+ call sites, backend emails
  // link to `{Frontend:Url}/reset-password` literally.
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  // Catch-all cho trang CMS đã xuất bản (`storefront-cms.routes.ts`) — React Router xếp mọi
  // đoạn tĩnh ở trên trước nó, nên nó chỉ bắt slug không route nào khác nhận.
  CMS_PAGE: '/:slug',
} as const;

/** Replaces `:param` tokens in a route template with positional values, in the order they appear. */
export function buildPath(template: string, ...params: Array<string | number>): string {
  let i = 0;
  return template.replace(/:[A-Za-z0-9_]+\??/g, () => {
    const value = params[i++];
    return value === undefined ? '' : String(value);
  });
}

function layoutPrefix(layout: RouteLayout): string {
  return layout === 'backoffice' ? '/backoffice' : layout === 'storefront' ? '' : '';
}

/** Full absolute path for a manifest entry (its `path` is relative to its layout's mount point). */
export function fullPath(route: Pick<RouteDef, 'path' | 'layout'>): string {
  if (route.layout === 'standalone') return route.path;
  const prefix = layoutPrefix(route.layout);
  if (route.path === '') return prefix || '/';
  return `${prefix}/${route.path}`;
}

/** One area's flat `name -> path-builder` map, e.g. `paths.backoffice.rfqDetail(id)`. */
type AreaPaths = Record<string, (...params: Array<string | number>) => string>;

/**
 * Builds `paths.<area>.<name>(...)` from the merged manifest — generated, not
 * hand-maintained, so it can never drift from the actual route table. `area`
 * is `storefront` or `backoffice` (routes without a `name` are skipped: pure
 * `<Navigate>` aliases and the layout's own `*` catch-all have none).
 */
export function buildPathsIndex(routes: readonly RouteDef[]): Record<string, AreaPaths> {
  const byArea: Record<string, AreaPaths> = {};
  for (const route of routes) {
    if (!route.name) continue;
    const area = route.layout === 'backoffice' ? 'backoffice' : 'storefront';
    const template = fullPath(route);
    (byArea[area] ??= {})[route.name] = (...params) => buildPath(template, ...params);
  }
  return byArea;
}
