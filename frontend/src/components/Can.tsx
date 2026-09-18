import type { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface CanProps {
    /** Backend permission key (`constants/permissions.ts`). */
    permission: string;
    /** Rendered instead when the check fails. Defaults to nothing. */
    fallback?: ReactNode;
    children: ReactNode;
}

/**
 * Per-action UI gate — e.g. hide a "Xoá" button a Sale user has no business seeing.
 * NOT an authorization boundary: the backend policy (W1-1) is what actually blocks the request;
 * this only avoids showing an action that would 403 anyway. See `useCan()` for the hook form.
 */
export const Can = ({ permission, fallback = null, children }: CanProps) => {
    const { hasPermission } = usePermissions();
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
};
