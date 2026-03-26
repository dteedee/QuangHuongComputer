import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Shield, Save, Grid, List, Check, Search, Filter, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi, type Permission, type Role } from '@api/admin';
import { usePermissions } from '@hooks/usePermissions';
import { useConfirm } from '@context/ConfirmContext';
import toast from 'react-hot-toast';

type ViewMode = 'tree' | 'matrix';

// ============================================
// Matrix View Component
// ============================================
interface MatrixViewProps {
  roles: Role[];
  allPermissions: string[];
  groupedPermissions: Record<string, Record<string, any[]>>;
  canManagePermissions: boolean;
}

function MatrixView({ roles, allPermissions, groupedPermissions, canManagePermissions }: MatrixViewProps) {
  const queryClient = useQueryClient();
  const [matrixData, setMatrixData] = useState<Record<string, Set<string>>>({});
  const [changedRoles, setChangedRoles] = useState<Set<string>>(new Set());
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  // Fetch permissions for ALL roles
  const rolePermissionQueries = useQueries({
    queries: roles.map(role => ({
      queryKey: ['admin', 'roles', role.id, 'permissions', 'matrix'],
      queryFn: () => adminApi.roles.getPermissions(role.id),
      staleTime: 30000,
    }))
  });

  const allLoaded = rolePermissionQueries.every(q => !q.isLoading);

  useEffect(() => {
    if (!allLoaded) return;
    const data: Record<string, Set<string>> = {};
    roles.forEach((role, i) => {
      data[role.id] = new Set(rolePermissionQueries[i]?.data || []);
    });
    setMatrixData(data);
    setChangedRoles(new Set());
  }, [allLoaded, roles.length]);

  const toggleCell = useCallback((roleId: string, permissionId: string) => {
    if (!canManagePermissions) return;
    setMatrixData(prev => {
      const newData = { ...prev };
      const rolePerms = new Set(prev[roleId] || []);
      if (rolePerms.has(permissionId)) rolePerms.delete(permissionId);
      else rolePerms.add(permissionId);
      newData[roleId] = rolePerms;
      return newData;
    });
    setChangedRoles(prev => new Set(prev).add(roleId));
  }, [canManagePermissions]);

  const saveRole = async (roleId: string) => {
    setSavingRole(roleId);
    try {
      await adminApi.roles.updatePermissions(roleId, Array.from(matrixData[roleId] || []));
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      setChangedRoles(prev => { const s = new Set(prev); s.delete(roleId); return s; });
      toast.success(`Đã lưu quyền cho ${roles.find(r => r.id === roleId)?.name}`);
    } catch { toast.error('Lỗi khi lưu quyền'); }
    finally { setSavingRole(null); }
  };

  const saveAll = async () => {
    for (const roleId of changedRoles) { await saveRole(roleId); }
  };

  if (!allLoaded) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center">
        <Loader2 size={48} className="mx-auto animate-spin text-blue-500 mb-4" />
        <p className="text-gray-500 font-medium">Đang tải ma trận quyền hạn...</p>
      </div>
    );
  }

  const filteredModules = Object.entries(groupedPermissions).filter(([module, categories]) => {
    if (!filterText) return true;
    const lower = filterText.toLowerCase();
    return module.toLowerCase().includes(lower) ||
      Object.values(categories).flat().some((p: any) => p.name.toLowerCase().includes(lower));
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Lọc quyền..." value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium">
            {roles.length} vai trò × {allPermissions.length} quyền
          </span>
          {changedRoles.size > 0 && (
            <button onClick={saveAll}
              className="flex items-center gap-2 px-5 py-2 bg-accent text-white rounded-xl shadow-lg shadow-red-500/30 hover:bg-accent-hover font-bold text-sm transition-all">
              <Save size={16} /> Lưu tất cả ({changedRoles.size})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-white">
              <tr>
                <th className="sticky left-0 z-30 bg-gray-50 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest border-b border-r border-gray-100 min-w-[280px]">
                  Quyền hạn
                </th>
                {roles.map(role => (
                  <th key={role.id} className="px-3 py-4 text-center border-b border-gray-100 min-w-[100px] bg-gray-50">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-gray-900 whitespace-nowrap">{role.name}</span>
                      {changedRoles.has(role.id) && (
                        <button onClick={() => saveRole(role.id)} disabled={savingRole === role.id}
                          className="text-[10px] px-2 py-0.5 bg-accent text-white rounded-full font-bold hover:bg-accent-hover transition-all">
                          {savingRole === role.id ? '...' : 'Lưu'}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredModules.map(([module, categories]) => (
                <>{/* Module Header */}
                  <tr key={`mod-${module}`} className="bg-blue-50/50">
                    <td colSpan={1 + roles.length} className="px-6 py-3 border-b border-gray-100">
                      <span className="text-sm font-black text-gray-800 uppercase tracking-tight">{module}</span>
                      <span className="ml-2 text-xs font-bold text-gray-400">({Object.values(categories).flat().length})</span>
                    </td>
                  </tr>
                  {Object.entries(categories).map(([category, permissions]) =>
                    (permissions as any[]).filter((p: any) => !filterText || p.name.toLowerCase().includes(filterText.toLowerCase()))
                      .map((permission: any) => (
                        <tr key={permission.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="sticky left-0 bg-white group-hover:bg-gray-50 px-6 py-2.5 border-b border-r border-gray-50 z-10">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-300 uppercase">{category}.</span>
                              <span className="text-xs font-medium text-gray-700 truncate max-w-[200px]" title={permission.name}>
                                {permission.name.split('.').pop()}
                              </span>
                            </div>
                          </td>
                          {roles.map(role => {
                            const has = matrixData[role.id]?.has(permission.id) ?? false;
                            return (
                              <td key={role.id} className="px-3 py-2.5 text-center border-b border-gray-50">
                                <button onClick={() => toggleCell(role.id, permission.id)} disabled={!canManagePermissions}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all transform hover:scale-110 ${
                                    has ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 shadow-sm'
                                      : 'bg-gray-50 text-gray-200 hover:bg-gray-100 hover:text-gray-400'
                                  } ${!canManagePermissions ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                  {has && <Check size={16} strokeWidth={3} />}
                                </button>
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
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function PermissionsPage() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [filterText, setFilterText] = useState('');
  const confirm = useConfirm();

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

  const handleRoleChange = async (roleId: string) => {
    if (hasChanges) {
      const ok = await confirm({ message: 'Có các thay đổi chưa được lưu. Bạn có muốn bỏ qua không?', variant: 'warning' });
      if (!ok) return;
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
                          className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-xl shadow-lg shadow-red-500/30 hover:bg-accent-hover font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Matrix View - Full Implementation */}
      {viewMode === 'matrix' && (
        <MatrixView
          roles={roles || []}
          allPermissions={allPermissions || []}
          groupedPermissions={groupedPermissions}
          canManagePermissions={canManagePermissions}
        />
      )}
    </div>
  );
}
