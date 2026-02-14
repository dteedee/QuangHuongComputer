
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { Mail, Lock, LogIn, ArrowRight, ShieldCheck, Sparkles, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { loginSchema, type LoginFormData } from '../lib/validation/schemas';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { RECAPTCHA_SITE_KEY, RECAPTCHA_ACTIONS } from '../config/recaptcha';

export const LoginPage = () => {
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { isLoaded, executeRecaptcha } = useRecaptcha(RECAPTCHA_SITE_KEY);

    const getRedirectPath = (_roles: string[]) => {
        return '/';
    };

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setLoginError('');
        try {
            // Get reCAPTCHA token
            const recaptchaToken = await executeRecaptcha(RECAPTCHA_ACTIONS.LOGIN);

            await login(data.email, data.password, recaptchaToken);

            const savedUser = localStorage.getItem('user');
            const userObj = savedUser ? JSON.parse(savedUser) : null;
            const roles = userObj?.roles || [];

            navigate(getRedirectPath(roles));
        } catch (error: any) {
            setLoginError(error.response?.data?.error || error.response?.data?.Error || 'Tài khoản hoặc mật khẩu không chính xác');
        } finally {
            setIsLoading(false);
        }
    };


    const handleGoogleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        try {
            const idToken = credentialResponse.credential;
            await loginWithGoogle(idToken);

            const savedUser = localStorage.getItem('user');
            const userObj = savedUser ? JSON.parse(savedUser) : null;
            const roles = userObj?.roles || [];

            navigate(getRedirectPath(roles));
        } catch (error) {
            console.error("Google Login Failed", error);
            setLoginError((error as any).response?.data?.error || (error as any).response?.data?.Error || 'Đăng nhập Google thất bại');
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
                                type={showPassword ? 'text' : 'password'}
                                icon={Lock}
                                placeholder="••••••••"
                                error={errors.password?.message}
                                {...register('password')}
                                suffix={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>
                                }
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
                            variant="primary"
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

                        <div className="w-full flex flex-col items-center gap-4">
                            <div className="scale-110">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setLoginError('Đăng nhập Google thất bại')}
                                />
                            </div>

                            {import.meta.env.DEV && (
                                <button
                                    type="button"
                                    onClick={() => handleGoogleSuccess({ credential: 'simulation_google_token' })}
                                    className="text-[10px] font-bold text-gray-400 hover:text-[#D70018] uppercase tracking-tighter transition-colors border border-dashed border-gray-200 px-3 py-1 rounded-full"
                                >
                                    ⚡ Run Google Login Simulator (Dev Only)
                                </button>
                            )}
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
