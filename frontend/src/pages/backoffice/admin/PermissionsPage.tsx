import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Shield, Save } from 'lucide-react';
import { adminApi, Permission, Role } from '../../../api/admin';
import { usePermissions } from '../../../hooks/usePermissions';

type ViewMode = 'tree' | 'matrix';

export function PermissionsPage() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Permissions check
  const canManagePermissions = hasPermission('admin.permissions.manage');

  // Fetch data
  const { data: permissionsByModule, isLoading: loadingPermissions } = useQuery({
    queryKey: ['admin', 'permissions', 'by-module'],
    queryFn: () => adminApi.getPermissionsByModule(),
  });

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['admin', 'roles', 'all'],
    queryFn: () => adminApi.getAllRoles(),
  });

  const { data: permissionMatrix, isLoading: loadingMatrix } = useQuery({
    queryKey: ['admin', 'permissions', 'matrix'],
    queryFn: () => adminApi.getPermissionMatrix(),
    enabled: viewMode === 'matrix',
  });

  // Load role permissions when role is selected
  const { data: rolePermissions } = useQuery({
    queryKey: ['admin', 'roles', selectedRole, 'permissions'],
    queryFn: () => adminApi.getRolePermissions(selectedRole!),
    enabled: !!selectedRole && viewMode === 'tree',
    onSuccess: (data) => {
      setSelectedPermissions(new Set(data));
      setHasChanges(false);
    },
  });

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      adminApi.updateRolePermissions(roleId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'permissions', 'matrix'] });
      setHasChanges(false);
    },
  });

  // Handlers
  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
  };

  const togglePermission = (permissionId: string) => {
    if (!canManagePermissions) return;

    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
    setHasChanges(true);
  };

  const toggleModulePermissions = (module: string, permissions: Permission[]) => {
    if (!canManagePermissions) return;

    const modulePermissionIds = permissions.map((p) => p.id);
    const allSelected = modulePermissionIds.every((id) => selectedPermissions.has(id));

    const newSelected = new Set(selectedPermissions);
    if (allSelected) {
      modulePermissionIds.forEach((id) => newSelected.delete(id));
    } else {
      modulePermissionIds.forEach((id) => newSelected.add(id));
    }
    setSelectedPermissions(newSelected);
    setHasChanges(true);
  };

  const handleSavePermissions = () => {
    if (!selectedRole || !canManagePermissions) return;

    updatePermissionsMutation.mutate({
      roleId: selectedRole,
      permissions: Array.from(selectedPermissions),
    });
  };

  const handleRoleChange = (roleId: string) => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Do you want to discard them?')) {
        return;
      }
    }
    setSelectedRole(roleId);
    setHasChanges(false);
  };

  const toggleMatrixPermission = (roleId: string, permissionId: string) => {
    if (!canManagePermissions || !permissionMatrix) return;

    const currentPermissions = permissionMatrix.matrix[roleId] || [];
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter((id) => id !== permissionId)
      : [...currentPermissions, permissionId];

    updatePermissionsMutation.mutate({
      roleId,
      permissions: newPermissions,
    });
  };

  // Group permissions by category within each module
  const groupedPermissions = useMemo(() => {
    if (!permissionsByModule) return {};

    const grouped: Record<string, Record<string, Permission[]>> = {};

    Object.entries(permissionsByModule).forEach(([module, permissions]) => {
      grouped[module] = {};
      permissions.forEach((permission) => {
        const category = permission.category || 'General';
        if (!grouped[module][category]) {
          grouped[module][category] = [];
        }
        grouped[module][category].push(permission);
      });
    });

    return grouped;
  }, [permissionsByModule]);

  if (loadingPermissions || loadingRoles) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Permission Management</h1>
        <p className="mt-2 text-gray-600">
          Manage role permissions and view permission assignments
        </p>
      </div>

      {/* View Mode Selector */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'tree'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tree View
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'matrix'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Permission Matrix
          </button>
        </div>
      </div>

      {/* Tree View */}
      {viewMode === 'tree' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Role Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Role</h3>
              <div className="space-y-2">
                {roles?.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleChange(role.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedRole === role.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={16} />
                      <span className="font-medium">{role.name}</span>
                    </div>
                    {role.description && (
                      <div className="text-xs text-gray-500 mt-1 ml-6">
                        {role.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Permission Tree */}
          <div className="lg:col-span-3">
            {selectedRole ? (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Permissions for {roles?.find((r) => r.id === selectedRole)?.name}
                  </h3>
                  {canManagePermissions && hasChanges && (
                    <button
                      onClick={handleSavePermissions}
                      disabled={updatePermissionsMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={18} />
                      {updatePermissionsMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([module, categories]) => {
                    const isExpanded = expandedModules.has(module);
                    const modulePermissions = Object.values(categories).flat();
                    const allSelected = modulePermissions.every((p) =>
                      selectedPermissions.has(p.id)
                    );

                    return (
                      <div key={module} className="border border-gray-200 rounded-lg">
                        <div
                          className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                          onClick={() => toggleModule(module)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown size={18} className="text-gray-500" />
                            ) : (
                              <ChevronRight size={18} className="text-gray-500" />
                            )}
                            <span className="font-semibold text-gray-900">{module}</span>
                            <span className="text-sm text-gray-500">
                              ({modulePermissions.length})
                            </span>
                          </div>
                          {canManagePermissions && (
                            <label
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() =>
                                  toggleModulePermissions(module, modulePermissions)
                                }
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-600">Select All</span>
                            </label>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="p-3 space-y-3">
                            {Object.entries(categories).map(([category, permissions]) => (
                              <div key={category}>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                  {category}
                                </h4>
                                <div className="space-y-2 ml-4">
                                  {permissions.map((permission) => (
                                    <label
                                      key={permission.id}
                                      className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedPermissions.has(permission.id)}
                                        onChange={() => togglePermission(permission.id)}
                                        disabled={!canManagePermissions}
                                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {permission.name}
                                        </div>
                                        {permission.description && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {permission.description}
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <Shield size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Select a role to view and manage permissions</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {loadingMatrix ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      Permission
                    </th>
                    {permissionMatrix?.roles.map((role) => (
                      <th
                        key={role.id}
                        className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider"
                      >
                        <div className="flex flex-col items-center">
                          <Shield size={16} className="mb-1" />
                          <span>{role.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(groupedPermissions).map(([module, categories]) => (
                    <>
                      <tr key={`module-${module}`} className="bg-gray-100">
                        <td
                          colSpan={
                            (permissionMatrix?.roles.length || 0) + 1
                          }
                          className="px-6 py-2 text-sm font-semibold text-gray-900"
                        >
                          {module}
                        </td>
                      </tr>
                      {Object.entries(categories).map(([category, permissions]) =>
                        permissions.map((permission) => (
                          <tr key={permission.id} className="hover:bg-gray-50">
                            <td className="sticky left-0 z-10 bg-white hover:bg-gray-50 px-6 py-4 text-sm border-r border-gray-200">
                              <div className="font-medium text-gray-900">
                                {permission.name}
                              </div>
                              {permission.description && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {permission.description}
                                </div>
                              )}
                            </td>
                            {permissionMatrix?.roles.map((role) => {
                              const hasPermission =
                                permissionMatrix.matrix[role.id]?.includes(
                                  permission.id
                                ) || false;

                              return (
                                <td
                                  key={role.id}
                                  className="px-4 py-4 text-center"
                                >
                                  <input
                                    type="checkbox"
                                    checked={hasPermission}
                                    onChange={() =>
                                      toggleMatrixPermission(role.id, permission.id)
                                    }
                                    disabled={!canManagePermissions}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
