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
};
