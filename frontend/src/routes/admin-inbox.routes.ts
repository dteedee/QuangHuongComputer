// Contact inbox + promotion insights (W3-18). NOT yet wired into
// `routes/index.ts` — that file belongs to W3-G (route-types.ts: "ONE file
// per wave-3 track" so tracks never touch the manifest directly). Registered
// as an integration request; see reports/integration-requests-w3.md.
import { lazy } from 'react';
import type { RouteDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const InboxPage = lazy(() => import('../pages/admin/inbox/inbox-page'));
const PromotionInsightsPage = lazy(() => import('../pages/admin/promotion-insights/promotion-insights-page'));

export const adminInboxRoutes: RouteDef[] = [
  {
    path: 'inbox',
    element: InboxPage,
    layout: 'backoffice',
    group: 'content',
    // 'Inbox' is not in `utils/icon-registry.ts` (not owned here — falls back
    // to a generic box icon); using an already-registered icon instead.
    icon: 'Mail',
    title: 'Hộp thư liên hệ',
    description: 'Tin nhắn từ form liên hệ khách hàng',
    permission: PERMISSIONS.CONTENT_MANAGE_CONTACTS,
    // Real unread count once `use-backoffice-menu.ts` (not owned here) adds a
    // case for this source, reading `GET /api/content/admin/contact-messages/stats`.
    badgeSource: 'unreadContacts',
    name: 'adminInbox',
  },
  {
    path: 'promotion-insights',
    element: PromotionInsightsPage,
    layout: 'backoffice',
    group: 'content',
    icon: 'BarChart3',
    title: 'Hiệu quả khuyến mãi',
    description: 'Đơn hàng, doanh thu, giảm giá theo chương trình',
    permission: PERMISSIONS.REPORTING_VIEW_SALES,
    name: 'adminPromotionInsights',
  },
];
