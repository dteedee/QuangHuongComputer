
import client from './client';

// ============================================
// Admin API Types
// ============================================

export interface User {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  userCount?: number;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
  category: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDescending?: boolean;
}

// ============================================
// Admin API Functions
// ============================================

export const adminApi = {
  // ============ Users Management ============
  users: {
    getList: async (params: QueryParams & { role?: string; includeInactive?: boolean }): Promise<PagedResult<User>> => {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortDescending) queryParams.append('sortDescending', params.sortDescending.toString());
      if (params.role) queryParams.append('role', params.role);
      if (params.includeInactive) queryParams.append('includeInactive', params.includeInactive.toString());

      const response = await client.get<PagedResult<User>>(`/auth/users?${queryParams.toString()}`);
      return response.data;
    },

    getById: async (id: string): Promise<User> => {
      const response = await client.get<any>(`/auth/users/${id}`);
      return response.data;
    },

    update: async (id: string, data: { email?: string; fullName?: string }): Promise<{ message: string }> => {
      const response = await client.put<{ message: string }>(`/auth/users/${id}`, data);
      return response.data;
    },

    deactivate: async (id: string): Promise<{ message: string }> => {
      const response = await client.delete<{ message: string }>(`/auth/users/${id}`);
      return response.data;
    },

    assignRoles: async (id: string, roles: string[]): Promise<{ message: string; roles: string[] }> => {
      const response = await client.post<{ message: string; roles: string[] }>(`/auth/users/${id}/roles`, { roles });
      return response.data;
    },

    create: async (data: any): Promise<{ message: string; user: User }> => {
      const response = await client.post<{ message: string; user: User }>('/auth/users', data);
      return response.data;
    },

    delete: async (id: string): Promise<{ message: string }> => {
      const response = await client.delete<{ message: string }>(`/auth/users/${id}`);
      return response.data;
    },

    resetPassword: async (id: string, password: string): Promise<{ message: string }> => {
      const response = await client.post<{ message: string }>(`/auth/users/${id}/reset-password`, { password });
      return response.data;
    },
  },

  // ============ Roles Management ============
  roles: {
    getList: async (): Promise<Role[]> => {
      const response = await client.get<Role[]>('/auth/roles');
      return response.data;
    },

    create: async (name: string): Promise<{ message: string }> => {
      const response = await client.post<{ message: string }>('/auth/roles', name, {
        headers: { 'Content-Type': 'text/plain' }
      });
      return response.data;
    },

    delete: async (roleName: string): Promise<{ message: string }> => {
      const response = await client.delete<{ message: string }>(`/auth/roles/${roleName}`);
      return response.data;
    },

    getPermissions: async (roleId: string): Promise<string[]> => {
      const response = await client.get<string[]>(`/auth/roles/${roleId}/permissions`);
      return response.data;
    },

    updatePermissions: async (roleId: string, permissions: string[]): Promise<{ message: string }> => {
      const response = await client.put<{ message: string }>(`/auth/roles/${roleId}/permissions`, permissions);
      return response.data;
    },
  },

  // ============ Permissions ============
  permissions: {
    getAll: async (): Promise<string[]> => {
      const response = await client.get<string[]>('/auth/permissions');
      return response.data;
    },
  },
};

// ============================================
// Helper Functions
// ============================================

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get status badge class
export const getStatusBadgeClass = (isActive: boolean): string => {
  return isActive
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-800';
};

// Get role badge color
export const getRoleBadgeColor = (role: string): string => {
  const colors: Record<string, string> = {
    Admin: 'bg-red-100 text-red-800',
    Manager: 'bg-orange-100 text-orange-800',
    Customer: 'bg-blue-100 text-blue-800',
    TechnicianInShop: 'bg-purple-100 text-purple-800',
    TechnicianOnSite: 'bg-indigo-100 text-indigo-800',
    Accountant: 'bg-green-100 text-green-800',
    default: 'bg-gray-100 text-gray-800'
  };
  return colors[role] || colors.default;
};
