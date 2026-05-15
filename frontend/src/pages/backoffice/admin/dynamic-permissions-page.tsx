import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Check, Loader2, Eye, Plus, Pencil, Trash2, ThumbsUp, Download, Settings } from 'lucide-react';
import { adminApi, getPermissionRegistry } from '../../../api/admin';
import type { PermissionModule, PermissionDefinition } from '../../../api/admin';
import toast from 'react-hot-toast';

const typeIcons: Record<string, React.ElementType> = {
  View: Eye, Create: Plus, Edit: Pencil, Delete: Trash2,
  Approve: ThumbsUp, Export: Download, Manage: Settings,
};

const typeColors: Record<string, string> = {
  View: 'text-blue-600 bg-blue-50',
  Create: 'text-green-600 bg-green-50',
  Edit: 'text-amber-600 bg-amber-50',
  Delete: 'text-red-600 bg-red-50',
  Approve: 'text-purple-600 bg-purple-50',
  Export: 'text-cyan-600 bg-cyan-50',
  Manage: 'text-gray-600 bg-gray-100',
};

export default function DynamicPermissionsPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => adminApi.roles.getAll(),
  });

  const { data: registry } = useQuery({
    queryKey: ['permission-registry'],
    queryFn: getPermissionRegistry,
  });

  const { data: rolePerms } = useQuery({
    queryKey: ['role-permissions', selectedRole],
    queryFn: () => adminApi.roles.getPermissions(selectedRole),
    enabled: !!selectedRole,
  });

  useEffect(() => {
    if (rolePerms) {
      setPermissions(new Set(Array.isArray(rolePerms) ? rolePerms : []));
    }
  }, [rolePerms]);

  const saveMutation = useMutation({
    mutationFn: () => adminApi.roles.updatePermissions(selectedRole, Array.from(permissions)),
    onSuccess: () => {
      toast.success('Đã lưu phân quyền');
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
    },
    onError: () => toast.error('Lỗi lưu phân quyền'),
  });

  const togglePermission = (perm: PermissionDefinition, module: PermissionModule) => {
    const next = new Set(permissions);
    if (next.has(perm.key)) {
      next.delete(perm.key);
      // Removing View → remove all actions in module
      if (perm.type === 'View') {
        module.permissions
          .filter(p => p.dependsOn === perm.key)
          .forEach(p => next.delete(p.key));
      }
    } else {
      next.add(perm.key);
      // Adding action → auto-add View dependency
      if (perm.dependsOn && !next.has(perm.dependsOn)) {
        next.add(perm.dependsOn);
      }
    }
    setPermissions(next);
  };

  const isViewGranted = (module: PermissionModule) => {
    const viewPerm = module.permissions.find(p => p.type === 'View');
    return viewPerm ? permissions.has(viewPerm.key) : false;
  };

  const toggleModule = (module: PermissionModule) => {
    const next = new Set(permissions);
    const allGranted = module.permissions.every(p => next.has(p.key));
    module.permissions.forEach(p => allGranted ? next.delete(p.key) : next.add(p.key));
    setPermissions(next);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-accent" /> Phân Quyền Động
          </h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý quyền hiển thị &amp; thao tác theo từng vai trò</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl font-medium"
          >
            <option value="">Chọn vai trò...</option>
            {(roles ?? []).map((r: { id: string; name: string }) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!selectedRole || saveMutation.isPending}
            className="bg-accent hover:bg-red-700 text-white px-6 py-2 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            Lưu
          </button>
        </div>
      </div>

      {!selectedRole ? (
        <div className="text-center py-20 text-gray-400">
          <Shield size={48} className="mx-auto mb-3 opacity-30" />
          <p>Chọn một vai trò để phân quyền</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(registry ?? []).map(module => {
            const viewGranted = isViewGranted(module);
            const allGranted = module.permissions.every(p => permissions.has(p.key));
            const someGranted = module.permissions.some(p => permissions.has(p.key));

            return (
              <div key={module.module} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <input
                    type="checkbox"
                    checked={allGranted}
                    ref={el => { if (el) el.indeterminate = someGranted && !allGranted; }}
                    onChange={() => toggleModule(module)}
                    className="w-4 h-4 rounded accent-accent cursor-pointer"
                  />
                  <span className="font-semibold text-gray-900">{module.module}</span>
                  <span className="text-xs text-gray-400">
                    {module.permissions.filter(p => permissions.has(p.key)).length}/{module.permissions.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-4">
                  {module.permissions.map(perm => {
                    const Icon = typeIcons[perm.type] ?? Settings;
                    const color = typeColors[perm.type] ?? 'text-gray-600 bg-gray-100';
                    const isView = perm.type === 'View';
                    const disabled = !isView && !viewGranted;
                    const checked = permissions.has(perm.key);

                    return (
                      <label
                        key={perm.key}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          disabled
                            ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50'
                            : checked
                              ? 'border-accent/30 bg-accent/5'
                              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => togglePermission(perm, module)}
                          className="w-4 h-4 rounded accent-accent cursor-pointer"
                        />
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{perm.displayName}</div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide">{perm.type}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
