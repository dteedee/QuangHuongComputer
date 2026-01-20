import { useAuth } from '../context/AuthContext';

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.roles?.includes('Admin')) return true; // Admin has all permissions
    return user.permissions?.includes(permission) ?? false;
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.roles?.includes(role) ?? false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.some((role) => user.roles?.includes(role));
  };

  const hasAllRoles = (roles: string[]): boolean => {
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
