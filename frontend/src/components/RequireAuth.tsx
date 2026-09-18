import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { ROUTES } from '../routes';

interface RequireAuthProps {
    /** Backend permission key (`constants/permissions.ts`). Checked when given. */
    permission?: string;
    /** Fallback role allowlist, checked only when `permission` is unset (e.g. the whole
     *  `/backoffice` area, or a route with no clean permission-catalog match). */
    allowedRoles?: readonly string[];
    /** Leaf usage: wrap one route element. Omit to render `<Outlet/>` (layout/group usage,
     *  e.g. gating every child of `/backoffice`). */
    children?: ReactNode;
}

/**
 * Client-side gate only — UX, not the authorization boundary (the backend's policies are, see
 * W1-1 / phase-17 Security Considerations). Three modes:
 *  - no `permission`/`allowedRoles`: any authenticated user (storefront account pages).
 *  - `permission`: gate on `usePermissions().hasPermission(permission)`.
 *  - `allowedRoles` (no `permission`): gate on role membership.
 * Denial renders `<ForbiddenPage/>` in place — the URL stays put, no silent redirect (the old
 * behaviour navigated to `/403`, losing the attempted path from the address bar).
 */
export const RequireAuth = ({ permission, allowedRoles, children }: RequireAuthProps) => {
    const { isAuthenticated } = useAuth();
    const { hasPermission, hasAnyRole } = usePermissions();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
    }

    const denied = permission
        ? !hasPermission(permission)
        : allowedRoles
            ? !hasAnyRole(allowedRoles)
            : false;

    if (denied) return <ForbiddenPage />;

    return children ? <>{children}</> : <Outlet />;
};
