import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
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

    const triggerConfetti = () => {
        confetti({
            particleCount: 100, spread: 70, origin: { y: 0.6 },
            colors: [getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#D70018', '#ff4d6d', '#ffd700', '#00ff00']
        });
    };

    const getRedirectPath = (roles: string[]) => {
        const staffRoles = ['Admin', 'Manager', 'Sale', 'TechnicianInShop', 'TechnicianOnSite', 'Accountant', 'Supplier', 'Marketing'];
        return roles.some(role => staffRoles.includes(role)) ? '/backoffice' : '/';
    };

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setLoginError('');
        try {
            const recaptchaToken = await executeRecaptcha(RECAPTCHA_ACTIONS.LOGIN);
            await login(data.email, data.password, recaptchaToken);
            const savedUser = localStorage.getItem('user');
            const userObj = savedUser ? JSON.parse(savedUser) : null;
            const roles = userObj?.roles || [];
            setLoginSuccess(true);
            triggerConfetti();
            setTimeout(() => navigate(getRedirectPath(roles)), 1500);
        } catch (error: any) {
            setLoginError(error.response?.data?.error || error.response?.data?.Error || 'Tai khoan hoac mat khau khong chinh xac');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        try {
            await loginWithGoogle(credentialResponse.credential);
            const savedUser = localStorage.getItem('user');
            const userObj = savedUser ? JSON.parse(savedUser) : null;
            navigate(getRedirectPath(userObj?.roles || []));
        } catch (error: any) {
            setLoginError(error.response?.data?.error || error.response?.data?.Error || 'Dang nhap Google that bai');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                    {/* Brand */}
                    <Link to="/" className="flex items-center justify-center gap-2 mb-8 cursor-pointer">
                        <div className="w-10 h-10 bg-accent text-white rounded-lg flex items-center justify-center font-black text-lg">QH</div>
                        <span className="text-lg font-black text-gray-900 tracking-tight">QUANG HUONG</span>
                    </Link>

                    <AnimatePresence mode="wait">
                        {loginSuccess ? (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 size={32} className="text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Dang nhap thanh cong!</h2>
                                <p className="text-sm text-gray-500">Dang chuyen huong...</p>
                            </motion.div>
                        ) : (
                            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Dang nhap tai khoan</h1>
                                <p className="text-sm text-gray-500 text-center mb-8">Chao mung ban quay tro lai voi Quang Huong Computer.</p>

                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                    <Input label="Dia chi Email" type="email" icon={Mail} placeholder="name@gmail.com" error={errors.email?.message} {...register('email')} />

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-xs font-semibold text-gray-500">Mat khau</label>
                                            <Link to="/forgot-password" className="text-xs text-accent hover:underline font-semibold cursor-pointer">Quen mat khau?</Link>
                                        </div>
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            icon={Lock}
                                            placeholder="********"
                                            error={errors.password?.message}
                                            {...register('password')}
                                            suffix={
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-accent transition-colors p-1 cursor-pointer">
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            }
                                        />
                                    </div>

                                    <AnimatePresence>
                                        {loginError && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                                                <AlertCircle size={16} /> {loginError}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Button type="submit" variant="primary" size="lg" loading={isLoading} icon={ArrowRight} iconPosition="right" className="w-full cursor-pointer">
                                        Dang nhap
                                    </Button>

                                    {/* Divider */}
                                    <div className="relative my-6">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                                        <div className="relative flex justify-center text-xs font-medium text-gray-400">
                                            <span className="px-3 bg-white">Hoac</span>
                                        </div>
                                    </div>

                                    {/* Google Login */}
                                    <div className="flex justify-center">
                                        {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                                            <GoogleLogin
                                                onSuccess={handleGoogleSuccess}
                                                onError={() => setLoginError('Dang nhap Google that bai. Vui long thu lai.')}
                                                useOneTap={false} theme="outline" size="large" text="signin_with" shape="rectangular" logo_alignment="left"
                                            />
                                        ) : (
                                            <button type="button" disabled className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed">
                                                Google (Chua cau hinh)
                                            </button>
                                        )}
                                    </div>
                                </form>

                                <p className="mt-8 text-center text-sm text-gray-500">
                                    Chua co tai khoan?{' '}
                                    <Link to="/register" className="text-accent font-bold hover:underline cursor-pointer">Dang ky ngay</Link>
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
