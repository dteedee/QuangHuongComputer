import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, UserCheck, UserX, Key, Shield } from 'lucide-react';
import { CrudListPage } from '../../../components/crud/CrudListPage';
import { Column } from '../../../components/crud/DataTable';
import { FilterBar } from '../../../components/crud/FilterBar';
import { SearchInput } from '../../../components/crud/SearchInput';
import { useCrudList } from '../../../hooks/useCrudList';
import { usePermissions } from '../../../hooks/usePermissions';
import { adminApi, User, CreateUserDto, UpdateUserDto } from '../../../api/admin';
import { UserFormModal } from '../../../components/admin/UserFormModal';
import { RoleAssignModal } from '../../../components/admin/RoleAssignModal';
import { PasswordResetModal } from '../../../components/admin/PasswordResetModal';

export function UsersPage() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Permissions
  const canCreate = hasPermission('admin.users.create');
  const canEdit = hasPermission('admin.users.update');
  const canDelete = hasPermission('admin.users.delete');
  const canManageRoles = hasPermission('admin.users.manage_roles');

  // Fetch roles for filter
  const { data: rolesData } = useQuery({
    queryKey: ['admin', 'roles', 'all'],
    queryFn: () => adminApi.getAllRoles(),
  });

  // CRUD list hook
  const {
    data,
    total,
    page,
    pageSize,
    isLoading,
    search,
    handlePageChange,
    handleSearch,
    handleSort,
    clearFilters,
    refetch,
  } = useCrudList<User>({
    queryKey: ['admin', 'users'],
    fetchFn: (params) =>
      adminApi.getUsers({
        ...params,
        role: roleFilter || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateUserDto) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsFormOpen(false);
      setSelectedUser(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsFormOpen(false);
      setSelectedUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleUserStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      adminApi.resetUserPassword(id, password),
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

  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user "${user.fullName}"?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleToggleStatus = (user: User) => {
    toggleStatusMutation.mutate(user.id);
  };

  const handleManageRoles = (user: User) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setIsPasswordModalOpen(true);
  };

  const handleFormSubmit = (data: CreateUserDto | UpdateUserDto) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data: data as UpdateUserDto });
    } else {
      createMutation.mutate(data as CreateUserDto);
    }
  };

  const handleRoleUpdate = async (userId: string, roles: string[]) => {
    await adminApi.updateUser(userId, { roles });
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    setIsRoleModalOpen(false);
    setSelectedUser(null);
  };

  const handleClearFilters = () => {
    clearFilters();
    setRoleFilter('');
    setStatusFilter('all');
  };

  // Table columns
  const columns: Column<User>[] = [
    {
      key: 'fullName',
      label: 'Full Name',
      sortable: true,
      render: (user) => (
        <div className="font-medium text-gray-900">{user.fullName}</div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (user) => (
        <div className="text-gray-700">{user.email}</div>
      ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {role}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (user) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      sortable: true,
      render: (user) => (
        <div className="text-sm text-gray-600">
          {user.lastLogin
            ? new Date(user.lastLogin).toLocaleString()
            : 'Never'}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (user) => (
        <div className="text-sm text-gray-600">
          {new Date(user.createdAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  // Action buttons
  const renderActions = (user: User) => (
    <div className="flex items-center gap-2">
      {canManageRoles && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleManageRoles(user);
          }}
          className="text-purple-600 hover:text-purple-900"
          title="Manage Roles"
        >
          <Shield size={18} />
        </button>
      )}
      {canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleResetPassword(user);
          }}
          className="text-orange-600 hover:text-orange-900"
          title="Reset Password"
        >
          <Key size={18} />
        </button>
      )}
      {canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleStatus(user);
          }}
          className={user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
          title={user.isActive ? 'Deactivate' : 'Activate'}
        >
          {user.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
        </button>
      )}
      {canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(user);
          }}
          className="text-blue-600 hover:text-blue-900"
          title="Edit"
        >
          <Edit size={18} />
        </button>
      )}
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(user);
          }}
          className="text-red-600 hover:text-red-900"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );

  // Filters
  const filters = (
    <FilterBar onClear={handleClearFilters}>
      <div className="flex-1 min-w-[300px]">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search by name or email..."
        />
      </div>
      <div className="min-w-[200px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role
        </label>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            refetch();
          }}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">All Roles</option>
          {rolesData?.map((role) => (
            <option key={role.id} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[150px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            refetch();
          }}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </FilterBar>
  );

  return (
    <>
      <CrudListPage
        title="User Management"
        subtitle="Manage system users, roles, and permissions"
        columns={columns}
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onSort={handleSort}
        isLoading={isLoading}
        onAdd={canCreate ? handleAdd : undefined}
        actions={renderActions}
        filters={filters}
        addButtonLabel="Add User"
        canAdd={canCreate}
      />

      {isFormOpen && (
        <UserFormModal
          user={selectedUser}
          roles={rolesData || []}
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
          availableRoles={rolesData || []}
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
          onSubmit={(password) =>
            resetPasswordMutation.mutate({ id: selectedUser.id, password })
          }
          isLoading={resetPasswordMutation.isPending}
        />
      )}
    </>
  );
}
