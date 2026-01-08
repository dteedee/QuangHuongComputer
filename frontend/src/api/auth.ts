import client from './client';

// Types
export interface User {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    email: string;
    password: string;
    fullName: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

// API Functions
export const authApi = {
    login: async (data: LoginDto) => {
        const response = await client.post<LoginResponse>('/auth/login', data);
        return response.data;
    },

    register: async (data: RegisterDto) => {
        const response = await client.post<{ message: string }>('/auth/register', data);
        return response.data;
    },

    getUsers: async () => {
        const response = await client.get<User[]>('/auth/users');
        return response.data;
    },

    getUser: async (id: string) => {
        const response = await client.get<User>(`/auth/users/${id}`);
        return response.data;
    },

    updateUser: async (id: string, data: { email: string; fullName: string }) => {
        const response = await client.put<{ message: string; user: User }>(`/auth/users/${id}`, data);
        return response.data;
    },

    deleteUser: async (id: string) => {
        const response = await client.delete<{ message: string }>(`/auth/users/${id}`);
        return response.data;
    },

    updateUserRoles: async (id: string, roles: string[]) => {
        const response = await client.post<{ message: string; roles: string[] }>(`/auth/users/${id}/roles`, roles);
        return response.data;
    },

    getRoles: async () => {
        const response = await client.get<{ id: string; name: string }[]>('/auth/roles');
        return response.data;
    },

    createRole: async (roleName: string) => {
        const response = await client.post('/auth/roles?roleName=' + roleName);
        return response.data;
    },

    deleteRole: async (roleName: string) => {
        const response = await client.delete(`/auth/roles/${roleName}`);
        return response.data;
    },

    getAllPermissions: async () => {
        const response = await client.get<string[]>('/auth/permissions');
        return response.data;
    },

    getRolePermissions: async (roleId: string) => {
        const response = await client.get<string[]>(`/auth/roles/${roleId}/permissions`);
        return response.data;
    },

    updateRolePermissions: async (roleId: string, permissions: string[]) => {
        const response = await client.put(`/auth/roles/${roleId}/permissions`, permissions);
        return response.data;
    },
};
