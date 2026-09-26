// Trang CMS (`CMSPage` đã xuất bản) phục vụ ở `/:slug`, ví dụ `/huong-dan-mua-hang`.
// Đặt CUỐI manifest (routes/index.ts): React Router v6 luôn xếp đoạn tĩnh (`gio-hang`,
// `san-pham`, alias `/cart`...) trên đoạn động, nên route này chỉ nhận slug mà không route nào
// khác nhận; slug không có trang -> CmsPage tự vẽ NotFoundPage (SEO shell trả 404 thật cho bot).
// Bảng chuyển hướng URL chạy ở SEO shell TRƯỚC mọi provider, nên một đường dẫn cũ đang 301
// không bao giờ tới được route này khi tải trang đầy đủ (docs/seo-shell.md).
import { lazy } from 'react';
import type { RouteDef } from './route-types';

const CmsPage = lazy(() => import('../pages/cms/cms-page'));

export const storefrontCmsRoutes: RouteDef[] = [
  { path: ':slug', element: CmsPage, layout: 'storefront', seo: 'index', hidden: true, name: 'cmsPage' },
];
