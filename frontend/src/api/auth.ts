import client from './client';

// ========================================
// Authentication Types
// ========================================
interface LoginRequest {
    email: string;
    password: string;
}

interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
}

interface AuthResponse {
    token: string;
    refreshToken: string;
    user: User;
}

export interface User {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
    permissions?: string[];
    isActive?: boolean;
    createdAt?: string;
    lastLogin?: string;
}

export interface Role {
    id: string;
    name: string;
}

export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

// ========================================
// Authentication API
// ========================================
export const authApi = {
    /**
     * Login user
     */
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await client.post<AuthResponse>('/auth/login', data);
        return response.data;
    },

    /**
     * Register new user
     */
    register: async (data: RegisterRequest): Promise<void> => {
        await client.post('/auth/register', data);
    },

    /**
     * Login with Google
     */
    googleLogin: async (idToken: string): Promise<AuthResponse> => {
        const response = await client.post<AuthResponse>('/auth/google', { idToken });
        return response.data;
    },

    /**
     * Logout user - revoke refresh token
     */
    logout: async (): Promise<void> => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                await client.post('/auth/logout', { refreshToken });
            } catch (error) {
                console.error('Logout API error:', error);
            }
        }
        // Clear tokens locally
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    },

    /**
     * Refresh access token using refresh token
     */
    refreshToken: async (): Promise<AuthResponse> => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }
        const response = await client.post<AuthResponse>('/auth/refresh-token', { refreshToken });
        return response.data;
    },

    /**
     * Get current user profile - NOTE: Backend doesn't have /auth/me
     * User info is returned from login response
     */
    getCurrentUser: async (): Promise<User | null> => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            return JSON.parse(userStr);
        }
        return null;
    },

    /**
     * Request password reset
     */
    forgotPassword: async (email: string): Promise<void> => {
        await client.post('/auth/forgot-password', { email });
    },

    /**
     * Reset password with token
     */
    resetPassword: async (token: string, newPassword: string): Promise<void> => {
        await client.post('/auth/reset-password', { token, newPassword });
    },

    // ========================================
    // Admin - User Management
    // ========================================

    /**
     * Get paginated list of users (Admin only)
     */
    getUsers: async (page: number = 1, pageSize: number = 10, search?: string, role?: string, includeInactive?: boolean): Promise<PagedResult<User>> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());
        if (search) params.append('search', search);
        if (role) params.append('role', role);
        if (includeInactive) params.append('includeInactive', 'true');

        const response = await client.get<PagedResult<User>>(`/auth/users?${params.toString()}`);
        return response.data;
    },

    /**
     * Get all roles
     */
    getRoles: async (): Promise<Role[]> => {
        const response = await client.get<Role[]>('/auth/roles');
        return response.data;
    },

    /**
     * Update user roles
     */
    updateUserRoles: async (userId: string, roles: string[]): Promise<{ message: string; roles: string[] }> => {
        const response = await client.post<{ message: string; roles: string[] }>(`/auth/users/${userId}/roles`, { roles });
        return response.data;
    },

    /**
     * Delete/deactivate user
     */
    deleteUser: async (userId: string): Promise<{ message: string }> => {
        const response = await client.delete<{ message: string }>(`/auth/users/${userId}`);
        return response.data;
    },

    /**
     * Update user details
     */
    updateUser: async (userId: string, data: { email?: string; fullName?: string }): Promise<{ message: string }> => {
        const response = await client.put<{ message: string }>(`/auth/users/${userId}`, data);
        return response.data;
    },

    /**
     * Create new role
     */
    createRole: async (name: string): Promise<{ message: string }> => {
        const response = await client.post<{ message: string }>('/auth/roles', name, {
            headers: { 'Content-Type': 'text/plain' }
        });
        return response.data;
    },

    /**
     * Delete role
     */
    deleteRole: async (roleName: string): Promise<{ message: string }> => {
        const response = await client.delete<{ message: string }>(`/auth/roles/${roleName}`);
        return response.data;
    },

    /**
     * Get all permissions
     */
    getPermissions: async (): Promise<string[]> => {
        const response = await client.get<string[]>('/auth/permissions');
        return response.data;
    },

    /**
     * Get role permissions
     */
    getRolePermissions: async (roleId: string): Promise<string[]> => {
        const response = await client.get<string[]>(`/auth/roles/${roleId}/permissions`);
        return response.data;
    },

    /**
     * Update role permissions
     */
    updateRolePermissions: async (roleId: string, permissions: string[]): Promise<{ message: string }> => {
        const response = await client.put<{ message: string }>(`/auth/roles/${roleId}/permissions`, permissions);
        return response.data;
    }
};

// ========================================
// Token Refresh Utilities (Simplified)
// ========================================
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

/**
 * Setup axios interceptors for automatic token refresh
 */
export const setupTokenRefreshInterceptor = () => {
    client.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            // If error is not 401 or already retrying, reject
            if (error.response?.status !== 401 || originalRequest._retry) {
                return Promise.reject(error);
            }

            // If refreshing token, add to queue
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        return client(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            // Start token refresh
            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                // No refresh token available, redirect to login
                processQueue(error, null);
                isRefreshing = false;
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');

                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }

                return Promise.reject(error);
            }

            try {
                // Call refresh token endpoint
                const response = await client.post<AuthResponse>('/auth/refresh-token', { refreshToken });
                const { token: newToken, refreshToken: newRefreshToken, user } = response.data;

                // Update stored tokens
                localStorage.setItem('token', newToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                localStorage.setItem('user', JSON.stringify(user));
                client.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

                // Process queued requests
                processQueue(null, newToken);

                // Retry original request
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return client(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;

                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');

                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
    );

    // Request interceptor to add token
    client.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );
};

// Initialize interceptors immediately when module loads
if (typeof window !== 'undefined') {
    setupTokenRefreshInterceptor();
}

// Helper to store auth data after login
export const storeAuthData = (data: AuthResponse) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
};

// Helper to clear auth data
export const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
};

// Helper to get stored token
export const getStoredToken = (): string | null => {
    return localStorage.getItem('token');
};
