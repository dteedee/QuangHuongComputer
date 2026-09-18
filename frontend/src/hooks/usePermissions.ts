import { useAuth } from '../context/AuthContext';
import { userHasPermission } from '../constants/permissions';

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean =>
    userHasPermission(user?.roles, user?.permissions, permission);

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.roles?.includes(role) ?? false;
  };

  const hasAnyRole = (roles: readonly string[]): boolean => {
    if (!user) return false;
    return roles.some((role) => user.roles?.includes(role));
  };

  const hasAllRoles = (roles: readonly string[]): boolean => {
    if (!user) return false;
    return roles.every((role) => user.roles?.includes(role));
  };

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin: hasRole('Admin'),
  };
}

/** Per-action UI gate as a hook (e.g. `if (!useCan(PERMISSIONS.CATALOG_DELETE)) return null`) —
 *  the hook form of `<Can>` (components/Can.tsx). UX only, see phase-17 Security Considerations. */
export function useCan(permission: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}
