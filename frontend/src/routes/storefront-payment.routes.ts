/**
 * Route thanh toán của storefront (W3-19).
 *
 * Tách khỏi `storefront-checkout.routes.ts` (W3-2) vì các trang thanh toán thuộc track này.
 * **Chưa được `routes/index.ts` import** — `index.ts` do W3-G sở hữu; xem
 * `reports/integration-requests-w3.md` (mục W3-19) cho hai thay đổi cần áp ở gate:
 *   1. import + spread `storefrontPaymentRoutes` trong `routes/index.ts`;
 *   2. xoá các mục `payment/*` khỏi `storefront-checkout.routes.ts` để không trùng path.
 * Trước khi gate áp, các đường cũ vẫn chạy qua file của W3-2 — trừ `payment/result`.
 *
 * `payment/result` là đường backend đang redirect tới sau khi verify ReturnUrl của VNPay
 * (`VnPayGatewayEndpoints.cs:91-95`: `{frontend}/payment/result?paymentId=…&outcome=…`), hôm nay
 * chưa có trong manifest nên sẽ rơi vào 404. VNPay chưa bật ở bản ra mắt nên chưa ai gặp,
 * nhưng đây chính là lý do file này phải được đăng ký.
 *
 * Đường dẫn giữ nguyên tiếng Anh `payment/*` một cách CÓ CHỦ Ý: chúng được khai báo trong trang
 * quản trị của cổng thanh toán và trong `Frontend:Url` của backend — đổi tên là gãy luồng trả về.
 */
import { lazy } from 'react';
import type { RouteDef } from './route-types';

const PaymentPage = lazy(() => import('../pages/PaymentPage').then((m) => ({ default: m.PaymentPage })));
const PaymentResultPage = lazy(() => import('../pages/PaymentResultPage').then((m) => ({ default: m.PaymentResultPage })));
const PaymentCallbackPage = lazy(() => import('../pages/PaymentCallbackPage').then((m) => ({ default: m.PaymentCallbackPage })));

export const storefrontPaymentRoutes: RouteDef[] = [
  { path: 'payment/:orderId', element: PaymentPage, layout: 'storefront', seo: 'noindex', hidden: true, requiresAuth: true, name: 'payment' },
  // Đích redirect của backend sau khi verify ReturnUrl — trang tự poll GET /payments/{id}.
  { path: 'payment/result', element: PaymentResultPage, layout: 'storefront', seo: 'noindex', hidden: true, name: 'paymentResult' },
  // Hai đường cũ, giữ để link/bookmark cũ không gãy.
  { path: 'payment/success', element: PaymentResultPage, layout: 'storefront', seo: 'noindex', hidden: true },
  { path: 'payment/failed', element: PaymentResultPage, layout: 'storefront', seo: 'noindex', hidden: true },
  // Đường quay về do cổng thanh toán cấu hình — không đổi tên được.
  { path: 'payment/callback', element: PaymentCallbackPage, layout: 'storefront', seo: 'noindex', hidden: true },
  { path: 'payment/vnpay-return', element: PaymentCallbackPage, layout: 'storefront', seo: 'noindex', hidden: true },
  { path: 'payment/momo-return', element: PaymentCallbackPage, layout: 'storefront', seo: 'noindex', hidden: true },
];

export default storefrontPaymentRoutes;
