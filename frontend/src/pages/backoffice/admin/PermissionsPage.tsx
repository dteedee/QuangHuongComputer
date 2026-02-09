import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Shield, Save, Grid, List, Check, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi, type Permission, type Role } from '@api/admin';
import { usePermissions } from '@hooks/usePermissions';

type ViewMode = 'tree' | 'matrix';

export function PermissionsPage() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [filterText, setFilterText] = useState('');

  // Permissions check
  const canManagePermissions = hasPermission('admin.permissions.manage');

  // Fetch data
  const { data: allPermissions, isLoading: loadingPermissions } = useQuery({
    queryKey: ['admin', 'permissions', 'all'],
    queryFn: () => adminApi.permissions.getAll(),
  });

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['admin', 'roles', 'all'],
    queryFn: () => adminApi.roles.getList(),
  });

  // Load role permissions when role is selected
  const { data: rolePermissions } = useQuery({
    queryKey: ['admin', 'roles', selectedRole, 'permissions'],
    queryFn: () => adminApi.roles.getPermissions(selectedRole!),
    enabled: !!selectedRole && viewMode === 'tree',
  });

  // Update selected permissions when role permissions data changes
  useEffect(() => {
    if (rolePermissions) {
      setSelectedPermissions(new Set(rolePermissions));
      setHasChanges(false);
    }
  }, [rolePermissions]);

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      adminApi.roles.updatePermissions(roleId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
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

  const toggleModulePermissions = (module: string, permissions: any[]) => {
    if (!canManagePermissions) return;

    const modulePermissionIds = permissions.map((p) => p.id);
    const allSelected = modulePermissionIds.every((id) => selectedPermissions.has(id));

    const newSelected = new Set(selectedPermissions);
    if (allSelected) modulePermissionIds.forEach((id) => newSelected.delete(id));
    else modulePermissionIds.forEach((id) => newSelected.add(id));

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
      if (!window.confirm('Có các thay đổi chưa được lưu. Bạn có muốn bỏ qua không?')) return;
    }
    setSelectedRole(roleId);
    setHasChanges(false);
  };

  // Group permissions locally since backend returns a flat list of strings
  const groupedPermissions = useMemo(() => {
    if (!allPermissions) return {};

    const grouped: Record<string, Record<string, any[]>> = {};

    allPermissions.forEach((permName) => {
      // Basic grouping logic: module.category.action
      const parts = permName.split('.');
      const module = parts[0] || 'Khác';
      const category = parts[1] || 'Chung';

      if (!grouped[module]) grouped[module] = {};
      if (!grouped[module][category]) grouped[module][category] = [];

      grouped[module][category].push({
        id: permName,
        name: permName, // Use the full name for now
        description: `Quyền thực hiện hành động ${permName}`
      });
    });

    return grouped;
  }, [allPermissions]);

  if (loadingPermissions || loadingRoles) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-500 font-medium">Đang tải dữ liệu phân quyền...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý Phân quyền
          </h1>
          <p className="text-gray-500">
            Cấu hình quyền truy cập và vai trò người dùng trong hệ thống
          </p>
        </div>

        {/* View Mode Selector */}
        <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex items-center">
          <button
            onClick={() => setViewMode('tree')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'tree'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <List size={18} />
            <span>Theo Vai trò</span>
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'matrix'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <Grid size={18} />
            <span>Ma trận Quyền</span>
          </button>
        </div>
      </div>

      {/* Tree View */}
      {viewMode === 'tree' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Role Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-8">
              <div className="p-5 border-b border-gray-50 bg-gray-50/30">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Shield size={18} className="text-blue-500" />
                  Vai trò hiện có
                </h3>
              </div>
              <div className="p-3 space-y-1">
                {roles?.map((role) => (
                  <motion.button
                    whileHover={{ x: 4 }}
                    key={role.id}
                    onClick={() => handleRoleChange(role.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all group ${selectedRole === role.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{role.name}</span>
                      {selectedRole === role.id && <ChevronRight size={16} className="text-blue-500" />}
                    </div>
                    {role.description && (
                      <div className={`text-xs mt-1 truncate ${selectedRole === role.id ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-500'}`}>
                        {role.description}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Permission Tree */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {selectedRole ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[600px]"
                >
                  <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 rounded-t-2xl">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        Phân quyền cho <span className="text-blue-600">{roles?.find((r) => r.id === selectedRole)?.name}</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 font-medium bg-gray-100 inline-block px-2 py-1 rounded-md">ID: {selectedRole}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm quyền..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 w-48 transition-all"
                        />
                      </div>
                      {canManagePermissions && hasChanges && (
                        <motion.button
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSavePermissions}
                          disabled={updatePermissionsMutation.isPending}
                          className="flex items-center gap-2 px-6 py-2 bg-[#D70018] text-white rounded-xl shadow-lg shadow-red-500/30 hover:bg-[#b50014] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save size={18} />
                          {updatePermissionsMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {Object.entries(groupedPermissions).map(([module, categories]) => {
                      // Filter logic
                      const moduleHasMatch = !filterText || module.toLowerCase().includes(filterText.toLowerCase()) ||
                        Object.values(categories).flat().some(p =>
                          p.name.toLowerCase().includes(filterText.toLowerCase()) ||
                          p.description?.toLowerCase().includes(filterText.toLowerCase())
                        );

                      if (!moduleHasMatch) return null;

                      const isExpanded = expandedModules.has(module) || !!filterText; // Auto expand on search
                      const modulePermissions = Object.values(categories).flat();
                      const allSelected = modulePermissions.length > 0 && modulePermissions.every((p) =>
                        selectedPermissions.has(p.id)
                      );
                      const someSelected = modulePermissions.some((p) => selectedPermissions.has(p.id));

                      return (
                        <motion.div
                          initial={false}
                          key={module}
                          className={`rounded-xl border transition-all duration-200 overflow-hidden ${isExpanded ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                        >
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer"
                            onClick={() => toggleModule(module)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 text-lg">{module}</span>
                                <span className="ml-2 text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                  {modulePermissions.length}
                                </span>
                              </div>
                            </div>
                            {canManagePermissions && (
                              <div onClick={(e) => e.stopPropagation()}>
                                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/50 cursor-pointer transition-colors">
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-blue-600 border-blue-600' : someSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                    {allSelected && <Check size={14} className="text-white" />}
                                    {!allSelected && someSelected && <div className="w-3 h-0.5 bg-white rounded-full" />}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={() => toggleModulePermissions(module, modulePermissions)}
                                    className="hidden"
                                  />
                                  <span className="text-sm font-medium text-gray-600">Chọn tất cả</span>
                                </label>
                              </div>
                            )}
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white border-t border-blue-100/50"
                              >
                                <div className="p-4 space-y-6">
                                  {Object.entries(categories).map(([category, permissions]) => {
                                    const filteredPermissions = permissions.filter(p =>
                                      !filterText ||
                                      p.name.toLowerCase().includes(filterText.toLowerCase()) ||
                                      p.description?.toLowerCase().includes(filterText.toLowerCase())
                                    );

                                    if (filteredPermissions.length === 0) return null;

                                    return (
                                      <div key={category}>
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pl-2 border-l-2 border-gray-200">
                                          {category}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {filteredPermissions.map((permission) => {
                                            const isSelected = selectedPermissions.has(permission.id);
                                            return (
                                              <label
                                                key={permission.id}
                                                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all group ${isSelected
                                                  ? 'border-blue-500 bg-blue-50/50'
                                                  : 'border-transparent bg-gray-50 hover:bg-gray-100' // Use border transparent to reserve space
                                                  }`}
                                              >
                                                <div className="pt-0.5">
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => togglePermission(permission.id)}
                                                    disabled={!canManagePermissions}
                                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                                                  />
                                                </div>
                                                <div className="flex-1">
                                                  <div className={`text-sm font-bold transition-colors ${isSelected ? 'text-blue-700' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                                    {permission.name}
                                                  </div>
                                                  {permission.description && (
                                                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                      {permission.description}
                                                    </div>
                                                  )}
                                                </div>
                                              </label>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}

                    {/* Empty state for search */}
                    {filterText && Object.values(groupedPermissions).every(moduleCategories =>
                      !Object.keys(moduleCategories).some(category =>
                        moduleCategories[category].some(p =>
                          p.name.toLowerCase().includes(filterText.toLowerCase()) ||
                          p.description?.toLowerCase().includes(filterText.toLowerCase())
                        )
                      )
                    ) && (
                        <div className="text-center py-12">
                          <Search size={48} className="mx-auto text-gray-200 mb-4" />
                          <p className="text-gray-400 font-medium">Không tìm thấy quyền nào phù hợp với "{filterText}"</p>
                        </div>
                      )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]"
                >
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <Shield size={40} className="text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa chọn Vai trò</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">Vui lòng chọn một vai trò từ danh sách bên trái để xem và chỉnh sửa quyền hạn.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Matrix View - Disabled as API not ready */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-20 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Grid size={40} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Tính năng đang phát triển</h3>
          <p className="text-gray-500 max-w-sm mx-auto">Ma trận quyền hạn đang được xây dựng để cung cấp cái nhìn tổng quan hơn.</p>
        </div>
      )}
    </div>
  );
}
