import { Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { RootLayout } from './layouts/RootLayout';
import { BackofficeLayout } from './layouts/BackofficeLayout';
import { RequireAuth } from './components/RequireAuth';
import { ComparisonBar } from './components/comparison';
import AiChatWidget from './components/ai-chat-widget';
import { ScrollToTop } from './components/ScrollToTop';
import { useAnalyticsTracking } from './hooks/use-analytics-tracking';
import { NotFoundPage } from './pages/NotFoundPage';
import { STAFF_ROLES } from './constants/staff-roles';
import { renderRoutesFor, renderRedirectsFor } from './routes/route-renderer';

// Providers (query client, auth, cart, theme, ...) all live in `main.tsx` now (W1-13) — this file
// is routing only: BrowserRouter -> the two layouts -> routes.map(...) from the manifest
// (`routes/*.ts`). Target < 80 LOC (phase-17-w1-fe-app-shell.md Requirements).

/** Safety-net fallback for routes with no layout of their own (standalone: /login, /403, ...).
 *  RootLayout/BackofficeLayout each have their own content-shaped Suspense (layouts/route-outlet.tsx). */
const PageLoader = () => (
    <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-accent rounded-full animate-spin" />
    </div>
);

/** Must render inside BrowserRouter — both call `useLocation()`. */
function AnalyticsTracker() {
    useAnalyticsTracking();
    return null;
}

/**
 * Storefront shell = RootLayout + các widget CHỈ dành cho khách.
 *
 * Trước đây `<AiChatWidget />` và `<ComparisonBar />` mount ngoài `<Routes>` nên chúng nổi
 * trên cả back office — vi phạm design-guidelines §9.6 ("Widget của khách KHÔNG được xuất
 * hiện trong back office"). Gắn chúng vào chính nhánh route storefront là cách duy nhất
 * không cần `pathname.startsWith('/backoffice')` rải rác trong component.
 * RootLayout vẫn render `<Outlet/>` như cũ; fragment chỉ thêm anh em cạnh nó.
 */
const StorefrontShell = () => (
    <>
        <RootLayout />
        <ComparisonBar />
        <AiChatWidget />
    </>
);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Bọc children bằng GoogleOAuthProvider chỉ khi có client id thật — tránh
// render provider với placeholder gây lỗi console + nút đăng nhập Google giả.
function OptionalGoogleOAuthProvider({ children }: { children: ReactNode }) {
    if (!GOOGLE_CLIENT_ID) return <>{children}</>;
    return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}

function App() {
    return (
        <OptionalGoogleOAuthProvider>
            <Toaster position="top-right" reverseOrder={false} />
            <BrowserRouter>
                <AnalyticsTracker />
                <ScrollToTop />
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/" element={<StorefrontShell />}>
                            {renderRoutesFor('storefront')}
                            {renderRedirectsFor('storefront')}
                            <Route path="*" element={<NotFoundPage />} />
                        </Route>

                        <Route path="/backoffice" element={<RequireAuth allowedRoles={STAFF_ROLES} />}>
                            <Route element={<BackofficeLayout />}>
                                {renderRoutesFor('backoffice')}
                                {renderRedirectsFor('backoffice')}
                                <Route path="*" element={<NotFoundPage />} />
                            </Route>
                        </Route>

                        {renderRoutesFor('standalone')}
                        {renderRedirectsFor('standalone')}
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </OptionalGoogleOAuthProvider>
    );
}

export default App;
