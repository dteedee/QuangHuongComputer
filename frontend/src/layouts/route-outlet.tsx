import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import { PageTransition } from '../components/motion';

interface RouteOutletProps {
    /** Content-shaped skeleton shown while the matched route's lazy chunk loads. */
    skeleton: ReactNode;
}

/**
 * The single place the two layouts (RootLayout, BackofficeLayout) mount routed page content —
 * per-layout `Suspense` + a route-level error boundary around `<Outlet/>`, plus the W1-7 page
 * transition (phase-17 Implementation Steps 7). Keyed by `pathname` so:
 *  - `PageTransition`'s `AnimatePresence` actually sees a key change and animates (its own doc
 *    comment: a key set anywhere else never produces an exit animation);
 *  - `ErrorBoundary` remounts fresh on navigation — a page that threw doesn't keep the whole
 *    shell stuck in its error state after the user has already clicked away from it.
 */
export const RouteOutlet = ({ skeleton }: RouteOutletProps) => {
    const location = useLocation();

    return (
        <ErrorBoundary key={location.pathname}>
            <Suspense fallback={skeleton}>
                <AnimatePresence mode="wait">
                    <PageTransition key={location.pathname}>
                        <Outlet />
                    </PageTransition>
                </AnimatePresence>
            </Suspense>
        </ErrorBoundary>
    );
};
