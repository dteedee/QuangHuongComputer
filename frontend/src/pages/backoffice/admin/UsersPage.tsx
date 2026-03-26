import { useState, useCallback, useMemo } from 'react';
import { useConfirm } from '@context/ConfirmContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit, UserCheck, UserX, Key, Shield, Search,
  Plus, User as UserIcon, Mail,
  ChevronRight, ChevronLeft, RefreshCw, Power, PowerOff,
  CheckSquare, Square, X, Download, Loader2,
  MinusSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type User } from '@api/admin';
import { usePermissions } from '@hooks/usePermissions';
import { UserFormModal } from '@components/admin/UserFormModal';
import { RoleAssignModal } from '@components/admin/RoleAssignModal';
import { PasswordResetModal } from '@components/admin/PasswordResetModal';
import { formatDate, getStatusBadgeClass, getRoleBadgeColor } from '@api/admin';

export function UsersPage() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Permissions
  const canCreate = hasPermission('admin.users.create');
  const canEdit = hasPermission('admin.users.update');
  const canManageRoles = hasPermission('admin.users.manage_roles');

  // Fetch roles
  const { data: roles } = useQuery({
    queryKey: ['admin', 'roles', 'all'],
    queryFn: () => adminApi.roles.getList(),
  });

  // Fetch users
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', page, search, roleFilter, statusFilter],
    queryFn: () => adminApi.users.getList({
      page,
      pageSize,
      search,
      role: roleFilter || undefined,
      includeInactive: statusFilter !== 'active'
    })
  });

  // ======== BULK OPERATIONS STATE ========
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const currentItems = usersData?.items || [];
  const allOnPageSelected = currentItems.length > 0 && currentItems.every(u => selectedIds.has(u.id));
  const someOnPageSelected = currentItems.some(u => selectedIds.has(u.id));

  const toggleSelectOne = useCallback((userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentItems.forEach(u => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentItems.forEach(u => next.add(u.id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkActivate = async () => {
    const selected = currentItems.filter(u => selectedIds.has(u.id) && !u.isActive);
    if (selected.length === 0) {
      toast.error('Không có người dùng nào cần kích hoạt trong các mục đã chọn.');
      return;
    }
    const ok = await confirm({
      message: `Bạn có chắc muốn KÍCH HOẠT ${selected.length} người dùng đã chọn?`,
      variant: 'warning'
    });
    if (!ok) return;
    setBulkProcessing(true);
    let success = 0, fail = 0;
    for (const user of selected) {
      try { await adminApi.users.activate(user.id); success++; }
      catch { fail++; }
    }
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    clearSelection();
    setBulkProcessing(false);
    toast.success(`Đã kích hoạt ${success} người dùng` + (fail > 0 ? `, ${fail} lỗi` : ''));
  };

  const handleBulkDeactivate = async () => {
    const selected = currentItems.filter(u => selectedIds.has(u.id) && u.isActive);
    if (selected.length === 0) {
      toast.error('Không có người dùng nào cần vô hiệu hóa trong các mục đã chọn.');
      return;
    }
    const ok = await confirm({
      message: `Bạn có chắc muốn VÔ HIỆU HÓA ${selected.length} người dùng đã chọn? Họ sẽ không thể đăng nhập!`,
      variant: 'warning'
    });
    if (!ok) return;
    setBulkProcessing(true);
    let success = 0, fail = 0;
    for (const user of selected) {
      try { await adminApi.users.toggleStatus(user.id); success++; }
      catch { fail++; }
    }
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    clearSelection();
    setBulkProcessing(false);
    toast.success(`Đã vô hiệu hóa ${success} người dùng` + (fail > 0 ? `, ${fail} lỗi` : ''));
  };

  const handleBulkExport = () => {
    const selected = currentItems.filter(u => selectedIds.has(u.id));
    if (selected.length === 0) return;
    const headers = ['Họ tên', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tạo'];
    const rows = selected.map(u => [
      u.fullName, u.email, u.roles.join('; '),
      u.isActive ? 'Hoạt động' : 'Đã khóa',
      new Date(u.createdAt).toLocaleDateString('vi-VN')
    ]);
    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NguoiDung_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${selected.length} người dùng ra CSV!`);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsFormOpen(false);
      setSelectedUser(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (user: User) => adminApi.users.toggleStatus(user.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(data.isActive ? 'Đã kích hoạt người dùng!' : 'Đã vô hiệu hóa người dùng!');
    },
    onError: () => toast.error('Thao tác thất bại!')
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      adminApi.users.resetPassword(id, password),
    onSuccess: () => {
      setIsPasswordModalOpen(false);
      setSelectedUser(null);
    },
  });

  // Handlers
  const handleAdd = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? 'vô hiệu hóa' : 'kích hoạt';
    const ok = await confirm({ message: `Bạn có chắc muốn ${action} người dùng "${user.fullName}"?`, variant: 'warning' });
    if (ok) {
      toggleStatusMutation.mutate(user);
    }
  };

  const handleManageRoles = (user: User) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setIsPasswordModalOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRoleUpdate = async (userId: string, roles: string[]) => {
    await adminApi.users.assignRoles(userId, roles);
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    setIsRoleModalOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-8 pb-10 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý Người dùng</h1>
          <p className="text-gray-500">Quản lý tài khoản hệ thống, vai trò và trạng thái hoạt động.</p>
        </div>

        {canCreate && (
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-2xl shadow-lg shadow-red-500/20 font-bold transition-all"
          >
            <Plus size={20} />
            <span>Thêm Người dùng</span>
          </motion.button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-gray-50 border-none rounded-xl text-sm font-medium px-4 py-3 focus:ring-2 focus:ring-blue-100 cursor-pointer min-w-[150px]"
          >
            <option value="">Tất cả Vai trò</option>
            {roles?.map(role => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-gray-50 border-none rounded-xl text-sm font-medium px-4 py-3 focus:ring-2 focus:ring-blue-100 cursor-pointer min-w-[150px]"
          >
            <option value="all">Tất cả Trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa</option>
          </select>

          <button
            onClick={() => refetch()}
            className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
            title="Tải lại"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-4 w-12">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    title={allOnPageSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả trang này'}
                  >
                    {allOnPageSelected ? <CheckSquare size={20} className="text-blue-600" /> :
                     someOnPageSelected ? <MinusSquare size={20} className="text-blue-400" /> :
                     <Square size={20} />}
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Người dùng</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Vai trò</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Ngày tạo</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right pr-10">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {usersData?.items.map((user, idx) => {
                  const isSelected = selectedIds.has(user.id);
                  return (
                  <motion.tr
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    key={user.id}
                    className={`group transition-colors ${isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-blue-50/30'}`}
                  >
                    <td className="px-4 py-5 w-12">
                      <button
                        onClick={() => toggleSelectOne(user.id)}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {isSelected
                          ? <CheckSquare size={20} className="text-blue-600" />
                          : <Square size={20} className="text-gray-300 group-hover:text-gray-400" />
                        }
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{user.fullName}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail size={12} />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${getRoleBadgeColor(role)}`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(user.isActive)}`}>
                        {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm text-gray-500 font-medium">
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-5 pr-10 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManageRoles && (
                          <button
                            onClick={() => handleManageRoles(user)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Phân vai trò"
                          >
                            <Shield size={18} />
                          </button>
                        )}
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Đổi mật khẩu"
                            >
                              <Key size={18} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`p-2 rounded-lg transition-colors ${user.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                              title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                            >
                              {user.isActive ? <PowerOff size={18} /> : <Power size={18} />}
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                  );
                })}
              </AnimatePresence>

              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-10 py-6">
                    <div className="h-12 bg-gray-100 rounded-2xl w-full"></div>
                  </td>
                </tr>
              ))}

              {!isLoading && usersData?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <UserIcon size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 font-medium">Không tìm thấy người dùng nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersData && usersData.totalPages > 1 && (
          <div className="px-10 py-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">
              Hiển thị <span className="text-gray-900">{usersData.items.length}</span> trên <span className="text-gray-900">{usersData.total}</span> người dùng
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(prev => prev - 1)}
                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              {[...Array(usersData.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${page === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={page === usersData.totalPages}
                onClick={() => setPage(prev => prev + 1)}
                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <UserFormModal
          user={selectedUser}
          roles={roles || []}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedUser(null);
          }}
          onSubmit={handleFormSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {isRoleModalOpen && selectedUser && (
        <RoleAssignModal
          user={selectedUser}
          availableRoles={roles || []}
          onClose={() => {
            setIsRoleModalOpen(false);
            setSelectedUser(null);
          }}
          onSubmit={handleRoleUpdate}
        />
      )}

      {isPasswordModalOpen && selectedUser && (
        <PasswordResetModal
          user={selectedUser}
          onClose={() => {
            setIsPasswordModalOpen(false);
            setSelectedUser(null);
          }}
          onSubmit={(password: string) =>
            resetPasswordMutation.mutate({ id: selectedUser.id, password })
          }
          isLoading={resetPasswordMutation.isPending}
        />
      )}

      {/* ======== FLOATING BULK ACTION BAR ======== */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gray-900 text-white rounded-2xl shadow-2xl shadow-black/30 px-6 py-4 flex items-center gap-5 min-w-[500px] border border-gray-700">
              {/* Selection Count */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
                  {selectedIds.size}
                </div>
                <div>
                  <p className="text-sm font-bold">đã chọn</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">người dùng</p>
                </div>
              </div>

              <div className="w-px h-10 bg-gray-700" />

              {/* Bulk Actions */}
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={handleBulkActivate}
                  disabled={bulkProcessing}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                  Kích hoạt
                </button>

                <button
                  onClick={handleBulkDeactivate}
                  disabled={bulkProcessing}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <PowerOff size={14} />}
                  Vô hiệu hóa
                </button>

                <button
                  onClick={handleBulkExport}
                  disabled={bulkProcessing}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={14} />
                  Xuất CSV
                </button>
              </div>

              {/* Close */}
              <button
                onClick={clearSelection}
                className="p-2 hover:bg-gray-700 rounded-xl transition-colors text-gray-400 hover:text-white"
                title="Bỏ chọn tất cả"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
