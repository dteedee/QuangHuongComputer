
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { Mail, Lock, LogIn, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { Input, Button } from '../components/ui';
import { loginSchema, type LoginFormData } from '../lib/validation/schemas';

export const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    const getRedirectPath = (roles: string[]) => {
        if (roles.includes('Admin')) return '/backoffice/admin';
        if (roles.includes('Manager')) return '/backoffice/manager';
        if (roles.includes('Sale')) return '/backoffice/sale';
        if (roles.includes('TechnicianInShop')) return '/backoffice/tech';
        if (roles.includes('TechnicianOnSite')) return '/backoffice/tech';
        if (roles.includes('Accountant')) return '/backoffice/accounting';
        if (roles.includes('Supplier')) return '/backoffice/inventory';
        if (roles.includes('Customer')) return '/profile';
        return '/';
    };

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setLoginError('');
        try {
            await login(data.email, data.password);
            // Login function updates AuthContext, but we might need to get the user data directly from the response 
            // OR rely on the fact that 'user' in context will be updated. 
            // However, context update might be async or not immediate enough for next line if we rely on 'user' from useAuth().
            // Ideally, 'login' should return the user object or we fetch it.
            // Looking at AuthContext, login throws if failed, but doesn't return data.
            // Let's rely on reading localStorage which AuthContext sets synchronously before resolving.

            const savedUser = localStorage.getItem('user');
            const userObj = savedUser ? JSON.parse(savedUser) : null;
            const roles = userObj?.roles || [];

            navigate(getRedirectPath(roles));
        } catch (error: any) {
            setLoginError('Tài khoản hoặc mật khẩu không chính xác');
        } finally {
            setIsLoading(false);
        }
    };


    const handleGoogleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        try {
            const idToken = credentialResponse.credential;
            const response = await client.post('/auth/google', { idToken });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            const roles = response.data.user.roles || [];
            navigate(getRedirectPath(roles));
        } catch (error) {
            console.error("Google Login Failed", error);
            setLoginError('Đăng nhập Google thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in">

                {/* Visual Side */}
                <div className="hidden lg:flex bg-[#D70018] p-12 flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <Link to="/" className="flex items-center gap-3 mb-16 group">
                            <div className="w-12 h-12 bg-white text-[#D70018] rounded-xl flex items-center justify-center font-black text-2xl transition-transform group-hover:rotate-12">QH</div>
                            <span className="text-xl font-black text-white tracking-tighter">QUANG HƯỞNG</span>
                        </Link>

                        <h2 className="text-5xl font-extrabold text-white leading-tight mb-6 italic uppercase">
                            Nâng tầm<br />
                            Trải nghiệm<br />
                            Công nghệ.
                        </h2>
                        <p className="text-white/80 text-lg max-w-sm font-medium">
                            Chào mừng bạn đến với hệ sinh thái công nghệ hàng đầu. Đăng nhập để nhận ưu đãi dành riêng cho thành viên.
                        </p>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 gap-6 pt-12 border-t border-white/20">
                        <div className="flex items-center gap-3 text-white">
                            <ShieldCheck size={20} />
                            <span className="text-xs font-bold uppercase tracking-wider">Hàng chính hãng</span>
                        </div>
                        <div className="flex items-center gap-3 text-white">
                            <Sparkles size={20} />
                            <span className="text-xs font-bold uppercase tracking-wider">Ưu đãi thành viên</span>
                        </div>
                    </div>

                    {/* Decorative pattern */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 pointer-events-none">
                        <LogIn size={500} strokeWidth={0.5} />
                    </div>
                </div>

                {/* Form Side */}
                <div className="p-8 lg:p-16 flex flex-col justify-center bg-white">
                    <div className="mb-10">
                        <h1 className="text-3xl font-black text-gray-800 mb-2 uppercase italic">Đăng nhập tài khoản</h1>
                        <p className="text-gray-500 font-medium italic">Chào mừng bạn quay trở lại với Quang Hưởng Computer.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <Input
                            label="Địa chỉ Email"
                            type="email"
                            icon={Mail}
                            placeholder="name@gmail.com"
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Mật khẩu</label>
                                <Link to="/forgot-password" className="text-[11px] text-[#D70018] hover:underline font-black uppercase">Quên mật khẩu?</Link>
                            </div>
                            <Input
                                type="password"
                                icon={Lock}
                                placeholder="••••••••"
                                error={errors.password?.message}
                                {...register('password')}
                            />
                        </div>

                        {loginError && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold flex items-center gap-3 animate-shake">
                                <ShieldCheck size={18} />
                                {loginError}
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="brand"
                            size="lg"
                            loading={isLoading}
                            icon={ArrowRight}
                            iconPosition="right"
                            className="w-full"
                        >
                            Đăng nhập ngay
                        </Button>

                        <div className="relative my-10">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <span className="px-4 bg-white">Hoặc đăng nhập với</span>
                            </div>
                        </div>

                        <div className="w-full flex justify-center">
                            <div className="scale-110">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setLoginError('Đăng nhập Google thất bại')}
                                />
                            </div>
                        </div>
                    </form>

                    <div className="mt-10 text-center text-gray-500 text-sm font-medium italic">
                        Chưa có tài khoản?{' '}
                        <Link to="/register" className="text-[#D70018] hover:underline font-black not-italic">
                            Đăng ký ngay
                        </Link>
                    </div>
                </div>
            </div>
        </div >
    );
};
