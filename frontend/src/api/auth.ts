import client from './client';
import { CSRF_HEADERS, refreshSession, type AuthSession } from './auth-refresh';
import { accessTokenStore, sessionHint } from '../lib/auth/access-token-store';

// ========================================
// Authentication Types
// ========================================
interface LoginRequest {
    email: string;
    password: string;
    recaptchaToken?: string;
}

interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
    recaptchaToken?: string;
}

/**
 * Successful sign-in. No `refreshToken` field any more: it arrives as the HttpOnly `qh_rt` cookie
 * and the SPA never sees it. `token` (the access token) is kept in memory only.
 */
type AuthResponse = AuthSession;

/**
 * `POST /auth/login` answers this shape instead of `AuthResponse` when the account has 2FA
 * enabled (docs/api-contracts/identity.md §1). No token, no roles — nothing usable until step 2.
 */
export interface TwoFactorChallengeResponse {
    requiresTwoFactor: true;
    challengeToken: string;
    expiresInSeconds: number;
    message?: string;
}

export type LoginResult = AuthResponse | TwoFactorChallengeResponse;

export function isTwoFactorChallenge(result: LoginResult): result is TwoFactorChallengeResponse {
    return (result as TwoFactorChallengeResponse).requiresTwoFactor === true;
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

export interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    phoneNumber?: string;
    avatarUrl?: string;
    roles: string[];
    lastLoginAt?: string;
    emailVerified?: boolean;
    profile?: {
        gender?: string;
        dateOfBirth?: string;
        address?: string;
        city?: string;
        district?: string;
        ward?: string;
        customerType?: string;
        companyName?: string;
        taxCode?: string;
    };
    defaultAddress?: CustomerAddress;
}

export interface CustomerAddress {
    id: string;
    recipientName: string;
    phoneNumber: string;
    addressLine: string;
    city: string;
    district: string;
    ward: string;
    postalCode?: string;
    isDefault?: boolean;
    addressLabel?: string;
}

export interface CustomerStats {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    totalSpent: number;
    monthlySpent: number;
    yearlySpent: number;
    averageOrderValue: number;
    lastOrderDate?: string;
    firstOrderDate?: string;
    customerTier: string;
    loyaltyPoints: number;
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
     * Same call as `login()` but typed for the real union response (docs/api-contracts/identity.md
     * §1): either a normal `AuthResponse` or a `{requiresTwoFactor}` challenge. `login()` above
     * keeps its old `AuthResponse`-only signature untouched — `AuthContext.tsx` (owned by W1-8, not
     * this track) calls it and a widened return type there would be a cross-file type error this
     * track cannot fix. `LoginPage` (this track) calls `loginRaw` instead so it can branch safely.
     */
    loginRaw: async (data: LoginRequest): Promise<LoginResult> => {
        const response = await client.post<LoginResult>('/auth/login', data);
        return response.data;
    },

    /**
     * Step 2 of a 2FA login (docs/api-contracts/identity.md §1). `code` XOR `backupCode`.
     * Returns the same `AuthResponse` shape a non-2FA login would have.
     */
    loginTwoFactor: async (payload: { challengeToken: string; code?: string; backupCode?: string }): Promise<AuthResponse> => {
        const response = await client.post<AuthResponse>('/auth/login/2fa', payload);
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
     * Logout: the backend revokes the device session named by the `qh_rt` cookie and expires the
     * cookie. The in-memory access token is dropped whatever the network says.
     */
    logout: async (): Promise<void> => {
        try {
            await client.post('/auth/logout', null, { headers: CSRF_HEADERS });
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            accessTokenStore.set(null);
            sessionHint.clear();
        }
    },

    /** New access token from the refresh cookie (single-flight). `null` = no live session. */
    refreshToken: (): Promise<AuthSession | null> => refreshSession(),

    /**
     * Get current user full profile with addresses
     */
    getMyProfile: async (): Promise<UserProfile> => {
        const response = await client.get<UserProfile>('/auth/me');
        return response.data;
    },

    /**
     * Update current user profile
     */
    updateMyProfile: async (data: { fullName: string; phoneNumber?: string; address?: string }): Promise<{ message: string }> => {
        const response = await client.put<{ message: string }>('/auth/me', data);
        return response.data;
    },

    /**
     * Change password
     */
    changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
        const response = await client.post<{ message: string }>('/auth/me/change-password', { currentPassword, newPassword });
        return response.data;
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
     * Deactivate user (Soft Delete)
     */
    deleteUser: async (userId: string): Promise<{ message: string; isActive: boolean }> => {
        const response = await client.delete<{ message: string; isActive: boolean }>(`/auth/users/${userId}`);
        return response.data;
    },

    /**
     * Activate user
     */
    activateUser: async (userId: string): Promise<{ message: string; isActive: boolean }> => {
        const response = await client.post<{ message: string; isActive: boolean }>(`/auth/users/${userId}/activate`);
        return response.data;
    },

    /**
     * Toggle user active status
     */
    toggleUserStatus: async (userId: string): Promise<{ message: string; isActive: boolean }> => {
        const response = await client.post<{ message: string; isActive: boolean }>(`/auth/users/${userId}/toggle-status`);
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
    // W0-13: same fix as admin.ts roles.create - JSON body { name } (W0-1
    // backend contract) + ?roleName= kept on the URL for the pre-restart binary.
    createRole: async (name: string): Promise<{ message: string }> => {
        const response = await client.post<{ message: string }>(
            `/auth/roles?roleName=${encodeURIComponent(name)}`,
            { name }
        );
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
     * Alias for getPermissions
     */
    getAllPermissions: async (): Promise<string[]> => {
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
// 2FA API
// ========================================
export async function setup2FA() {
    const { data } = await client.post('/identity/2fa/setup');
    return data as { secret: string; qrUri: string };
}

export async function verify2FASetup(code: string) {
    const { data } = await client.post('/identity/2fa/verify-setup', { code });
    return data as { enabled: boolean; backupCodes: string[] };
}

export async function disable2FA() {
    const { data } = await client.post('/identity/2fa/disable');
    return data;
}

export async function get2FAStatus() {
    const { data } = await client.get('/identity/2fa/status');
    return data as { isEnabled: boolean; enabledDate?: string };
}

// ========================================
// Sessions API
// ========================================
export async function getActiveSessions() {
    const { data } = await client.get('/identity/sessions');
    return data as Array<{ id: string; deviceInfo: string; ipAddress: string; userAgent: string; lastActiveAt: string; createdAt: string }>;
}

export async function revokeSession(sessionId: string) {
    const { data } = await client.delete(`/identity/sessions/${sessionId}`);
    return data;
}

export async function revokeAllOtherSessions() {
    const { data } = await client.delete('/identity/sessions/all-others');
    return data;
}

/**
 * Adopts a session a sign-in call just returned: access token into memory, plus the non-secret
 * "had a session" hint. The refresh token is already in its HttpOnly cookie. Nothing is written to
 * localStorage — the 401 -> refresh -> retry interceptor lives in `auth-refresh.ts`.
 */
export const adoptSession = (data: AuthSession): void => {
    accessTokenStore.set(data.token);
    sessionHint.set();
};
