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
    user: User;
}

interface User {
    email: string;
    fullName: string;
    roles: string[];
    permissions: string[];
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
     * Logout user - NOTE: Backend doesn't have this endpoint
     * Just clear local storage
     */
    logout: async (): Promise<void> => {
        // Clear tokens locally
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
 * NOTE: Backend doesn't have refresh-token endpoint, so this is simplified
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

            // Get stored user info
            const userStr = localStorage.getItem('user');

            if (!userStr) {
                // No user data available, redirect to login
                processQueue(error, null);
                isRefreshing = false;
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }

                return Promise.reject(error);
            }

            try {
                // Simply store token from login response - no refresh endpoint
                const token = localStorage.getItem('token');

                // Update stored token
                if (token) {
                    localStorage.setItem('token', token);
                    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                }

                // Process queued requests
                processQueue(null, token);

                // Retry original request
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                return client(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;

                localStorage.removeItem('token');
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
    localStorage.setItem('user', JSON.stringify(data.user));
};

// Helper to clear auth data
export const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

// Helper to get stored token
export const getStoredToken = (): string | null => {
    return localStorage.getItem('token');
};
