import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Scrolls to top on a real page change (pathname). A search-param-only change
 * (filters, pagination, tab query) never triggers a scroll jump — the grid
 * below handles its own loading state.
 *
 * On browser back/forward (POP) it instead restores the scroll offset the
 * user had on that page before they navigated away, remembered per pathname
 * for the lifetime of this mounted component (it lives at the app root and
 * never unmounts, so the map survives the whole session).
 */
export const ScrollToTop = () => {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();
    const scrollPositions = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        const restored = navigationType === 'POP' ? scrollPositions.current.get(pathname) : undefined;
        window.scrollTo({
            top: restored ?? 0,
            left: 0,
            behavior: 'instant', // immediate snap, no smooth-scroll on navigation
        });

        return () => {
            // Capture where the user ended up on this page before leaving it,
            // so a later POP back to it can restore the position.
            scrollPositions.current.set(pathname, window.scrollY);
        };
        // Intentionally pathname-only: reacting to `navigationType` too would
        // also re-run this effect for a POP that only changes the search string.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    return null;
};
