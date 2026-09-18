import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, type User } from '../api/auth';
import { userHasPermission } from '../constants/permissions';
import { browserStorage } from '../lib/browser-storage';
import toast from 'react-hot-toast';

/**
 * Thrown by `login()` when the backend says a 2FA code is still needed. Defensive-only today —
 * `POST /auth/login` sends no `requiresTwoFactor` yet (verified: TwoFactorEndpoints.cs only
 * covers setup/verify/disable) — activates automatically once W1-2 adds it. No token/user is
 * persisted when it fires. `LoginPage.tsx` (not owned here) doesn't special-case it yet — see
 * reports/w1-8-report.md "Unresolved".
 */
export class TwoFactorRequiredError extends Error {
    constructor() {
        super('Yêu cầu xác thực hai lớp (2FA) trước khi hoàn tất đăng nhập.');
        this.name = 'TwoFactorRequiredError';
    }
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string, recaptchaToken?: string) => Promise<void>;
    loginWithGoogle: (idToken: string) => Promise<void>;
    register: (email: string, password: string, fullName: string, recaptchaToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    hasPermission: (permission: string) => boolean;
    /** True while the initial `/auth/me` session check (below) hasn't resolved yet. */
    isBootstrapping: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Full-screen splash shown only while the initial session check is in flight (mount, token present). */
const AuthBootstrapSplash = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <svg width="40" height="40" viewBox="0 0 38 38" stroke="#6366f1">
            <g fill="none" fillRule="evenodd">
                <g transform="translate(1 1)" strokeWidth="2">
                    <circle strokeOpacity=".25" cx="18" cy="18" r="18" />
                    <path d="M36 18c0-9.94-8.06-18-18-18">
                        <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.8s" repeatCount="indefinite" />
                    </path>
                </g>
            </g>
        </svg>
    </div>
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => browserStorage.getJSON<User | null>('user', null));
    const [token, setToken] = useState<string | null>(browserStorage.getItem('token'));
    const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => !!browserStorage.getItem('token'));

    // `setupTokenRefreshInterceptor()` used to also run here on every AuthProvider mount, ON TOP
    // OF `api/auth.ts`'s own module-load call — two live interceptor registrations (integration
    // request from W1-13, reports/integration-requests-w1.md). ES modules evaluate once, so the
    // module-load registration alone is sufficient; removed the duplicate.

    // Bootstrap: refresh a persisted session from `/auth/me` (roles + profile) instead of trusting
    // a stale snapshot. `/auth/me` returns no `permissions` (only `/auth/login` does) — keep
    // whatever we already have rather than wiping it (integration request: add it to `/auth/me`).
    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        authApi.getMyProfile()
            .then((profile) => {
                if (cancelled) return;
                setUser((prev) => {
                    const next: User = {
                        id: profile.id,
                        email: profile.email,
                        fullName: profile.fullName,
                        roles: profile.roles,
                        permissions: prev?.permissions,
                        isActive: prev?.isActive,
                        createdAt: prev?.createdAt,
                        lastLogin: profile.lastLoginAt,
                    };
                    browserStorage.setJSON('user', next);
                    return next;
                });
            })
            .catch((error: { response?: { status?: number } }) => {
                // Refresh already tried once before this rejects — a still-401 session is dead.
                if (!cancelled && error?.response?.status === 401) {
                    setToken(null);
                    setUser(null);
                    browserStorage.removeItem('token');
                    browserStorage.removeItem('refreshToken');
                    browserStorage.removeItem('user');
                }
            })
            .finally(() => {
                if (!cancelled) setIsBootstrapping(false);
            });
        return () => {
            cancelled = true;
        };
        // Mount-only — login()/logout() already update `user`/`token` directly.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (email: string, password: string, recaptchaToken?: string) => {
        try {
            const data = await authApi.login({ email, password, recaptchaToken });

            // Defensive-only until W1-2 ships it — see TwoFactorRequiredError above.
            if ((data as unknown as { requiresTwoFactor?: boolean }).requiresTwoFactor) {
                throw new TwoFactorRequiredError();
            }

            setToken(data.token);
            setUser(data.user);
            browserStorage.setItem('token', data.token);
            browserStorage.setItem('refreshToken', data.refreshToken);
            browserStorage.setJSON('user', data.user);

            toast.success(`Chào mừng trở lại, ${data.user.fullName}!`, {
                icon: '👋',
                style: { borderRadius: '15px', fontWeight: 'bold' }
            });
        } catch (error: any) {
            if (error instanceof TwoFactorRequiredError) throw error;
            toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
            throw error;
        }
    };

    const loginWithGoogle = async (idToken: string) => {
        try {
            const data = await authApi.googleLogin(idToken);

            setToken(data.token);
            setUser(data.user);
            browserStorage.setItem('token', data.token);
            browserStorage.setItem('refreshToken', data.refreshToken);
            browserStorage.setJSON('user', data.user);

            toast.success(`Đăng nhập Google thành công! Chào ${data.user.fullName}`, {
                icon: '🚀',
                style: { borderRadius: '15px', fontWeight: 'bold' }
            });
        } catch (error: any) {
            const errorData = error.response?.data;
            let errorMessage = 'Đăng nhập Google thất bại';

            if (errorData?.Error === 'Configuration Error') {
                errorMessage = 'Tính năng đăng nhập Google chưa được cấu hình. Vui lòng liên hệ quản trị viên.';
            } else if (errorData?.Error === 'Invalid Google Token') {
                errorMessage = 'Token Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.';
            } else if (errorData?.error) {
                errorMessage = errorData.error;
            } else if (errorData?.Error) {
                errorMessage = errorData.Error;
            }

            toast.error(errorMessage, {
                duration: 5000,
                style: { borderRadius: '15px', fontWeight: 'bold' }
            });
            throw error;
        }
    };

    const register = async (email: string, password: string, fullName: string, recaptchaToken?: string) => {
        try {
            await authApi.register({ email, password, fullName, recaptchaToken });
            toast.success('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
        } catch (error: any) {
            // ASP.NET Identity returns errors array
            const errors = error.response?.data;
            if (Array.isArray(errors) && errors.length > 0) {
                const errorMessage = errors.map((e: { description?: string }) => e.description).filter(Boolean).join('. ');
                toast.error(errorMessage || 'Đăng ký thất bại');
            } else {
                toast.error(error.response?.data?.message || 'Đăng ký thất bại');
            }
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setToken(null);
            setUser(null);
            browserStorage.removeItem('token');
            browserStorage.removeItem('refreshToken');
            browserStorage.removeItem('user');
            toast('Đã đăng xuất tài khoản', { icon: '🚪' });
        }
    };

    const hasPermission = (permission: string) => userHasPermission(user?.roles, user?.permissions, permission);

    if (isBootstrapping) {
        return <AuthBootstrapSplash />;
    }

    return (
        <AuthContext.Provider value={{ user, token, login, loginWithGoogle, register, logout, isAuthenticated: !!token, hasPermission, isBootstrapping }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
