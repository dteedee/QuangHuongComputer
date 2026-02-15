
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, ArrowRight, ShieldCheck, Sparkles, Eye, EyeOff, CheckCircle2, Zap, Gift } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { loginSchema, type LoginFormData } from '../lib/validation/schemas';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { RECAPTCHA_SITE_KEY, RECAPTCHA_ACTIONS } from '../config/recaptcha';
import confetti from 'canvas-confetti';

export const LoginPage = () => {
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { executeRecaptcha } = useRecaptcha(RECAPTCHA_SITE_KEY);

    // Confetti celebration effect
    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#D70018', '#ff4d6d', '#ffd700', '#00ff00']
        });
    };

    const getRedirectPath = (roles: string[]) => {
        // Staff roles redirect to backoffice dashboard
        const staffRoles = ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier', 'Marketing'];
        if (roles.some(role => staffRoles.includes(role))) {
            return '/backoffice';
        }
        // Customer redirect to homepage
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

            // Show success animation
            setLoginSuccess(true);
            triggerConfetti();

            // Navigate after animation
            setTimeout(() => {
                navigate(getRedirectPath(roles));
            }, 1500);
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center p-6 font-sans relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-40 -right-40 w-80 h-80 bg-[#D70018]/10 rounded-full blur-3xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#D70018]/5 rounded-full blur-3xl"
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 bg-white rounded-3xl overflow-hidden shadow-2xl relative z-10"
            >

                {/* Visual Side */}
                <div className="hidden lg:flex bg-gradient-to-br from-[#D70018] via-[#c50016] to-[#a00012] p-12 flex-col justify-between relative overflow-hidden">
                    {/* Animated shapes */}
                    <motion.div
                        className="absolute top-20 right-20 w-32 h-32 border border-white/10 rounded-2xl"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute bottom-40 left-10 w-20 h-20 border border-white/10 rounded-full"
                        animate={{ y: [-10, 10, -10] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <div className="relative z-10">
                        <Link to="/" className="flex items-center gap-3 mb-16 group">
                            <motion.div
                                whileHover={{ rotate: 12, scale: 1.1 }}
                                className="w-12 h-12 bg-white text-[#D70018] rounded-xl flex items-center justify-center font-black text-2xl shadow-lg"
                            >
                                QH
                            </motion.div>
                            <span className="text-xl font-black text-white tracking-tighter">QUANG HƯỞNG</span>
                        </Link>

                        <motion.h2
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="text-5xl font-extrabold text-white leading-tight mb-6 italic uppercase"
                        >
                            Nâng tầm<br />
                            Trải nghiệm<br />
                            Công nghệ.
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            className="text-white/80 text-lg max-w-sm font-medium"
                        >
                            Chào mừng bạn đến với hệ sinh thái công nghệ hàng đầu. Đăng nhập để nhận ưu đãi dành riêng cho thành viên.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="relative z-10 grid grid-cols-2 gap-6 pt-12 border-t border-white/20"
                    >
                        <div className="flex items-center gap-3 text-white group">
                            <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                <ShieldCheck size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Hàng chính hãng</span>
                        </div>
                        <div className="flex items-center gap-3 text-white group">
                            <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                <Gift size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Ưu đãi thành viên</span>
                        </div>
                        <div className="flex items-center gap-3 text-white group">
                            <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                <Zap size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Giao hàng nhanh</span>
                        </div>
                        <div className="flex items-center gap-3 text-white group">
                            <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                <Sparkles size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Hỗ trợ 24/7</span>
                        </div>
                    </motion.div>

                    {/* Decorative pattern */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 pointer-events-none">
                        <LogIn size={500} strokeWidth={0.5} />
                    </div>
                </div>

                {/* Form Side */}
                <div className="p-8 lg:p-16 flex flex-col justify-center bg-white relative">
                    <AnimatePresence mode="wait">
                        {loginSuccess ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-20"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
                                >
                                    <CheckCircle2 size={48} className="text-emerald-600" />
                                </motion.div>
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-2xl font-black text-gray-900 mb-2"
                                >
                                    Đăng nhập thành công!
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-gray-500"
                                >
                                    Đang chuyển hướng...
                                </motion.p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="mb-10"
                                >
                                    <h1 className="text-3xl font-black text-gray-800 mb-2 uppercase italic">Đăng nhập tài khoản</h1>
                                    <p className="text-gray-500 font-medium italic">Chào mừng bạn quay trở lại với Quang Hưởng Computer.</p>
                                </motion.div>

                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <Input
                                            label="Địa chỉ Email"
                                            type="email"
                                            icon={Mail}
                                            placeholder="name@gmail.com"
                                            error={errors.email?.message}
                                            {...register('email')}
                                        />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="space-y-2"
                                    >
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Mật khẩu</label>
                                            <Link to="/forgot-password" className="text-[11px] text-[#D70018] hover:underline font-black uppercase transition-colors hover:text-[#b50014]">Quên mật khẩu?</Link>
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
                                                    className="text-gray-400 hover:text-[#D70018] focus:outline-none transition-colors p-1"
                                                >
                                                    {showPassword ? (
                                                        <EyeOff size={18} />
                                                    ) : (
                                                        <Eye size={18} />
                                                    )}
                                                </button>
                                            }
                                        />
                                    </motion.div>

                                    <AnimatePresence>
                                        {loginError && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, height: 0 }}
                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                exit={{ opacity: 0, y: -10, height: 0 }}
                                                className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold flex items-center gap-3"
                                            >
                                                <ShieldCheck size={18} />
                                                {loginError}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            loading={isLoading}
                                            icon={ArrowRight}
                                            iconPosition="right"
                                            className="w-full group"
                                        >
                                            Đăng nhập ngay
                                        </Button>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="relative my-10"
                                    >
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-100"></div>
                                        </div>
                                        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            <span className="px-4 bg-white">Hoặc đăng nhập với</span>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 }}
                                        className="w-full flex flex-col items-center gap-4"
                                    >
                                        {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                                            <div className="transform hover:scale-105 transition-transform duration-300">
                                                <GoogleLogin
                                                    onSuccess={handleGoogleSuccess}
                                                    onError={() => setLoginError('Đăng nhập Google thất bại. Vui lòng thử lại.')}
                                                    useOneTap={false}
                                                    theme="outline"
                                                    size="large"
                                                    text="signin_with"
                                                    shape="rectangular"
                                                    logo_alignment="left"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled
                                                    className="flex items-center gap-3 px-6 py-3 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                                                >
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                        <path fill="#9CA3AF" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                        <path fill="#9CA3AF" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                        <path fill="#9CA3AF" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                        <path fill="#9CA3AF" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                    </svg>
                                                    <span className="text-sm font-medium">Google (Chưa cấu hình)</span>
                                                </button>
                                                <p className="text-[10px] text-gray-400 text-center">
                                                    Liên hệ quản trị viên để kích hoạt
                                                </p>
                                            </div>
                                        )}

                                    </motion.div>
                                </form>

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className="mt-10 text-center text-gray-500 text-sm font-medium italic"
                                >
                                    Chưa có tài khoản?{' '}
                                    <Link to="/register" className="text-[#D70018] hover:underline font-black not-italic transition-colors hover:text-[#b50014]">
                                        Đăng ký ngay
                                    </Link>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
