// Auth pages + the bookmarkable /403 — outside both shells on purpose (no header/sidebar chrome).
// D11 §2: these paths are UNCHANGED — no SEO value, 20+ internal call sites, and the backend
// emails a literal `{Frontend:Url}/reset-password` link (Identity/Services/EmailService.cs).
import { lazy } from 'react';
import type { RouteDef } from './route-types';

const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const ForbiddenPage = lazy(() => import('../pages/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage })));
const KitchenSinkPage = lazy(() => import('../pages/dev/kitchen-sink-page').then((m) => ({ default: m.KitchenSinkPage })));

export const standaloneRoutes: RouteDef[] = [
  { path: '/login', element: LoginPage, layout: 'standalone', hidden: true, seo: 'noindex', name: 'login' },
  { path: '/register', element: RegisterPage, layout: 'standalone', hidden: true, seo: 'noindex', name: 'register' },
  { path: '/forgot-password', element: ForgotPasswordPage, layout: 'standalone', hidden: true, seo: 'noindex', name: 'forgotPassword' },
  { path: '/reset-password', element: ResetPasswordPage, layout: 'standalone', hidden: true, seo: 'noindex', name: 'resetPassword' },
  { path: '/403', element: ForbiddenPage, layout: 'standalone', hidden: true, seo: 'noindex' },
  // Trang soi UI kit — CHỈ bản dev. Ghi chú đầu `pages/dev/kitchen-sink-page.tsx` nói route này
  // do W1-8 đăng ký, nhưng việc đó chưa từng xảy ra: trang nằm mồ côi và trả 404, nên không ai
  // soi được kit bằng mắt. Đăng ký ở đây, và `import.meta.env.DEV` giữ nó ngoài bản production.
  ...(import.meta.env.DEV
    ? [{ path: '/dev/kitchen-sink', element: KitchenSinkPage, layout: 'standalone', hidden: true, seo: 'noindex', name: 'kitchenSink' } as RouteDef]
    : []),
];
