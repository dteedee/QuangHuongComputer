import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, setupTokenRefreshInterceptor, type User } from '../api/auth';
import toast from 'react-hot-toast';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string, recaptchaToken?: string) => Promise<void>;
    loginWithGoogle: (idToken: string) => Promise<void>;
    register: (email: string, password: string, fullName: string, recaptchaToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    // Setup token refresh interceptor on mount
    useEffect(() => {
        setupTokenRefreshInterceptor();
    }, []);

    const login = async (email: string, password: string, recaptchaToken?: string) => {
        try {
            const data = await authApi.login({ email, password, recaptchaToken });

            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));

            toast.success(`Chào mừng trở lại, ${data.user.fullName}!`, {
                icon: '👋',
                style: { borderRadius: '15px', fontWeight: 'bold' }
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
            throw error;
        }
    };

    const loginWithGoogle = async (idToken: string) => {
        try {
            const data = await authApi.googleLogin(idToken);

            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));

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
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            toast('Đã đăng xuất tài khoản', { icon: '🚪' });
        }
    };

    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.roles.includes('Admin')) return true;
        return user.permissions?.includes(permission) ?? false;
    };

    return (
        <AuthContext.Provider value={{ user, token, login, loginWithGoogle, register, logout, isAuthenticated: !!token, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

