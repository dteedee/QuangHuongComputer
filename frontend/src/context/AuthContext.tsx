import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';

interface User {
    email: string;
    fullName: string;
    roles: string[];
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, fullName: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    }, [token]);

    const login = async (email: string, password: string) => {
        try {
            const { data } = await client.post('/auth/login', { email, password });
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            client.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            toast.success(`Chào mừng trở lại, ${data.user.fullName}!`, {
                icon: '👋',
                style: { borderRadius: '15px', fontWeight: 'bold' }
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
            throw error;
        }
    };

    const register = async (email: string, password: string, fullName: string) => {
        try {
            await client.post('/auth/register', { email, password, fullName });
            toast.success('Đăng ký tài khoản thành công!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Đăng ký thất bại');
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete client.defaults.headers.common['Authorization'];
        toast('Đã đăng xuất tài khoản', { icon: '🚪' });
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

