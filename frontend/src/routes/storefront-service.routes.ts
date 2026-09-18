// Storefront services + content — repair, warranty, recruitment, CMS pages, contact
// (W3-3 owns this file from here on; also owns `components/SEO.tsx` per D11 §4).
// Every path here is in D11 §2's canonical Vietnamese list; old English paths are kept
// reachable as redirects (D11's accepted one-hop tradeoff) since components/header/**,
// pages/backoffice/**/repair links etc. (not owned by this track) still hardcode them.
import { lazy } from 'react';
import type { RouteDef, RedirectDef } from './route-types';
import { ROUTES } from './route-paths';

const RepairPage = lazy(() => import('../pages/RepairPage').then((m) => ({ default: m.RepairPage })));
const RepairDetailPage = lazy(() => import('../pages/RepairDetailPage').then((m) => ({ default: m.RepairDetailPage })));
const BookingPage = lazy(() => import('../pages/repair/BookingPage').then((m) => ({ default: m.BookingPage })));
const WarrantyPage = lazy(() => import('../pages/WarrantyPage').then((m) => ({ default: m.WarrantyPage })));
const ChatSupport = lazy(() => import('../components/ChatSupport').then((m) => ({ default: m.ChatSupport })));
const RecruitmentPage = lazy(() => import('../pages/RecruitmentPage').then((m) => ({ default: m.RecruitmentPage })));
const JobDetailPage = lazy(() => import('../pages/JobDetailPage').then((m) => ({ default: m.JobDetailPage })));
const PolicyPage = lazy(() => import('../pages/PolicyPage').then((m) => ({ default: m.PolicyPage })));
const PostDetailPage = lazy(() => import('../pages/PostDetailPage').then((m) => ({ default: m.PostDetailPage })));
const ContactPage = lazy(() => import('../pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const TermsPage = lazy(() => import('../pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const AboutPage = lazy(() => import('../pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const StoresPage = lazy(() => import('../pages/StoresPage'));

export const storefrontServiceRoutes: RouteDef[] = [
  { path: 'sua-chua', element: RepairPage, layout: 'storefront', seo: 'index', name: 'repair' },
  { path: 'sua-chua/:id', element: RepairDetailPage, layout: 'storefront', seo: 'index', hidden: true, name: 'repairDetail' },
  { path: 'booking', element: BookingPage, layout: 'storefront', seo: 'noindex', hidden: true, name: 'booking' },
  { path: 'bao-hanh', element: WarrantyPage, layout: 'storefront', seo: 'index', name: 'warranty' },
  { path: 'support', element: ChatSupport, layout: 'storefront', seo: 'noindex', hidden: true },
  { path: 'tuyen-dung', element: RecruitmentPage, layout: 'storefront', seo: 'index', name: 'recruitment' },
  { path: 'tuyen-dung/:id', element: JobDetailPage, layout: 'storefront', seo: 'index', hidden: true, name: 'recruitmentDetail' },
  { path: 'chinh-sach/:type', element: PolicyPage, layout: 'storefront', seo: 'index', hidden: true, name: 'policy' },
  { path: 'tin-tuc/:slug', element: PostDetailPage, layout: 'storefront', seo: 'index', hidden: true, name: 'newsDetail' },
  { path: 'lien-he', element: ContactPage, layout: 'storefront', seo: 'index', name: 'contact' },
  { path: 'dieu-khoan', element: TermsPage, layout: 'storefront', seo: 'index', name: 'terms' },
  { path: 'bao-mat', element: PrivacyPage, layout: 'storefront', seo: 'index', name: 'privacy' },
  { path: 'gioi-thieu', element: AboutPage, layout: 'storefront', seo: 'index', name: 'about' },
  { path: 'he-thong-cua-hang', element: StoresPage, layout: 'storefront', seo: 'index', name: 'stores' },
];

export const storefrontServiceRedirects: RedirectDef[] = [
  { from: 'repairs', to: ROUTES.REPAIR, layout: 'storefront' },
  { from: 'repair', to: ROUTES.REPAIR, layout: 'storefront' },
  { from: 'repair/:id', to: '/sua-chua/:id', layout: 'storefront' },
  { from: 'warranty', to: ROUTES.WARRANTY, layout: 'storefront' },
  { from: 'recruitment', to: ROUTES.RECRUITMENT, layout: 'storefront' },
  { from: 'recruitment/:id', to: '/tuyen-dung/:id', layout: 'storefront' },
  { from: 'policy/:type', to: '/chinh-sach/:type', layout: 'storefront' },
  { from: 'post/:slug', to: '/tin-tuc/:slug', layout: 'storefront' },
  { from: 'contact', to: ROUTES.CONTACT, layout: 'storefront' },
  { from: 'terms', to: ROUTES.TERMS, layout: 'storefront' },
  { from: 'privacy', to: ROUTES.PRIVACY, layout: 'storefront' },
  { from: 'about', to: ROUTES.ABOUT, layout: 'storefront' },
  { from: 'stores', to: ROUTES.STORES, layout: 'storefront' },
  // Old convenience redirects (pre-existing) — now two hops (old -> /policy/:type old path -> new
  // canonical) is avoided by pointing straight at the final canonical URL.
  { from: 'promotion', to: '/chinh-sach/promotions', layout: 'storefront' },
  { from: 'promotions', to: '/chinh-sach/promotions', layout: 'storefront' },
  { from: 'news', to: '/chinh-sach/news', layout: 'storefront' },
];
