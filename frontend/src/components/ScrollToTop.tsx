import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component ensures that the window scrolls to the top
 * whenever the location (URL path/search) changes.
 */
export const ScrollToTop = () => {
    const { pathname, search } = useLocation();

    useEffect(() => {
        // Scroll to the absolute top of the page
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant' // Use 'instant' for immediate snap to top on navigation
        });
    }, [pathname, search]);

    return null;
};
