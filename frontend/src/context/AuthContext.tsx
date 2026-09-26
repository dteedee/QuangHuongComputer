import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, adoptSession, type User } from '../api/auth';
import { refreshSession, type AuthSession } from '../api/auth-refresh';
import { userHasPermission } from '../constants/permissions';
import { accessTokenStore, purgeLegacyAuthStorage, sessionHint } from '../lib/auth/access-token-store';
import toast from 'react-hot-toast';

// Runs once per page load, before anything reads auth state: tokens written by the pre-cookie
// build must not linger in localStorage (see lib/auth/access-token-store.ts).
if (typeof window !== 'undefined') purgeLegacyAuthStorage();

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
    /** In-memory access token (never persisted). */
    token: string | null;
    login: (email: string, password: string, recaptchaToken?: string) => Promise<void>;
    /** Resolves the signed-in user so the caller can route by role. */
    loginWithGoogle: (idToken: string) => Promise<User>;
    /** Adopts a session another call already obtained (password/2FA login on LoginPage). */
    completeLogin: (session: AuthSession) => void;
    register: (email: string, password: string, fullName: string, recaptchaToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    hasPermission: (permission: string) => boolean;
    /** True while the page-load silent refresh (below) hasn't resolved yet. */
    isBootstrapping: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Full-screen splash shown only while the page-load silent refresh is in flight (session hint set). */
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
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => accessTokenStore.get());
    // Anonymous visitors (no hint) never wait on, or even send, a refresh that can only fail.
    const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => !accessTokenStore.get() && sessionHint.isSet());

    // The store is the single source of truth for the token: the 401 interceptor may clear it
    // (dead session) or replace it (rotation) at any time. A cleared token drops the user, and
    // RequireAuth then sends protected pages to /login.
    useEffect(() => accessTokenStore.subscribe((next) => {
        setToken(next);
        if (!next) setUser(null);
    }), []);

    // Silent refresh on page load: the HttpOnly cookie buys a fresh access token plus the user
    // (roles AND permissions, straight from the server) — no profile snapshot kept in localStorage.
    useEffect(() => {
        if (!isBootstrapping) return;
        let cancelled = false;
        refreshSession()
            .then((session) => {
                if (!cancelled && session) setUser(session.user);
            })
            .finally(() => {
                if (!cancelled) setIsBootstrapping(false);
            });
        return () => {
            cancelled = true;
        };
        // Mount-only — login()/logout() update state directly.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const completeLogin = (session: AuthSession) => {
        adoptSession(session);
        setUser(session.user);
    };

    const login = async (email: string, password: string, recaptchaToken?: string) => {
        try {
            const data = await authApi.login({ email, password, recaptchaToken });

            // Defensive-only until W1-2 ships it — see TwoFactorRequiredError above.
            if ((data as unknown as { requiresTwoFactor?: boolean }).requiresTwoFactor) {
                throw new TwoFactorRequiredError();
            }

            completeLogin(data);

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

            completeLogin(data);

            toast.success(`Đăng nhập Google thành công! Chào ${data.user.fullName}`, {
                icon: '🚀',
                style: { borderRadius: '15px', fontWeight: 'bold' }
            });
            return data.user;
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
            // authApi.logout() already cleared the in-memory token; the store listener drops the user.
            setUser(null);
            toast('Đã đăng xuất tài khoản', { icon: '🚪' });
        }
    };

    const hasPermission = (permission: string) => userHasPermission(user?.roles, user?.permissions, permission);

    if (isBootstrapping) {
        return <AuthBootstrapSplash />;
    }

    return (
        <AuthContext.Provider value={{ user, token, login, loginWithGoogle, completeLogin, register, logout, isAuthenticated: !!token, hasPermission, isBootstrapping }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
