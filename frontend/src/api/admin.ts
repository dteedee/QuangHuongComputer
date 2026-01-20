import client from './client';
import { QueryParams, PagedResult } from '../hooks/useCrudList';

// Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  userCount?: number;
  createdAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
  category: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  roles: string[];
}

export interface UpdateUserDto {
  email?: string;
  fullName?: string;
  roles?: string[];
  isActive?: boolean;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
}

// Build query string from params
function buildQueryString(params: QueryParams & { role?: string; isActive?: boolean }): string {
  const query = new URLSearchParams();

  if (params.page) query.append('page', params.page.toString());
  if (params.pageSize) query.append('pageSize', params.pageSize.toString());
  if (params.search) query.append('search', params.search);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortDescending !== undefined) query.append('sortDescending', params.sortDescending.toString());
  if (params.role) query.append('role', params.role);
  if (params.isActive !== undefined) query.append('isActive', params.isActive.toString());

  return query.toString();
}

// API Functions
export const adminApi = {
  // Users
  getUsers: async (params: QueryParams & { role?: string; isActive?: boolean }): Promise<PagedResult<User>> => {
    const queryString = buildQueryString(params);
    const response = await client.get<PagedResult<User>>(`/admin/users?${queryString}`);
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await client.get<User>(`/admin/users/${id}`);
    return response.data;
  },

  createUser: async (data: CreateUserDto): Promise<User> => {
    const response = await client.post<User>('/admin/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: UpdateUserDto): Promise<User> => {
    const response = await client.put<User>(`/admin/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await client.delete(`/admin/users/${id}`);
  },

  toggleUserStatus: async (id: string): Promise<User> => {
    const response = await client.post<User>(`/admin/users/${id}/toggle-status`);
    return response.data;
  },

  resetUserPassword: async (id: string, newPassword: string): Promise<void> => {
    await client.post(`/admin/users/${id}/reset-password`, { newPassword });
  },

  // Roles
  getRoles: async (params?: QueryParams): Promise<PagedResult<Role>> => {
    const queryString = params ? buildQueryString(params) : '';
    const response = await client.get<PagedResult<Role>>(`/admin/roles?${queryString}`);
    return response.data;
  },

  getAllRoles: async (): Promise<Role[]> => {
    const response = await client.get<Role[]>('/admin/roles/all');
    return response.data;
  },

  getRole: async (id: string): Promise<Role> => {
    const response = await client.get<Role>(`/admin/roles/${id}`);
    return response.data;
  },

  createRole: async (data: CreateRoleDto): Promise<Role> => {
    const response = await client.post<Role>('/admin/roles', data);
    return response.data;
  },

  updateRole: async (id: string, data: UpdateRoleDto): Promise<Role> => {
    const response = await client.put<Role>(`/admin/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: string): Promise<void> => {
    await client.delete(`/admin/roles/${id}`);
  },

  // Permissions
  getAllPermissions: async (): Promise<Permission[]> => {
    const response = await client.get<Permission[]>('/admin/permissions');
    return response.data;
  },

  getPermissionsByModule: async (): Promise<Record<string, Permission[]>> => {
    const response = await client.get<Record<string, Permission[]>>('/admin/permissions/by-module');
    return response.data;
  },

  getRolePermissions: async (roleId: string): Promise<string[]> => {
    const response = await client.get<string[]>(`/admin/roles/${roleId}/permissions`);
    return response.data;
  },

  updateRolePermissions: async (roleId: string, permissions: string[]): Promise<void> => {
    await client.put(`/admin/roles/${roleId}/permissions`, { permissions });
  },

  // Permission Matrix
  getPermissionMatrix: async (): Promise<{
    roles: Role[];
    permissions: Permission[];
    matrix: Record<string, string[]>; // roleId -> permissionIds
  }> => {
    const response = await client.get('/admin/permissions/matrix');
    return response.data;
  },
};
