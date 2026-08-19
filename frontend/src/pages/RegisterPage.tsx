import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { RECAPTCHA_SITE_KEY, RECAPTCHA_ACTIONS } from '../config/recaptcha';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import confetti from 'canvas-confetti';
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const RegisterPage = () => {
    const { register: signup } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const { executeRecaptcha } = useRecaptcha(RECAPTCHA_SITE_KEY);

    const triggerConfetti = () => {
        const end = Date.now() + 3000;
        const frame = () => {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#D70018', '#ff4d6d', '#ffd700'] });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#D70018', '#ff4d6d', '#ffd700'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const schema = z.object({
            fullName: z.string().min(1, msg.requireInput('Họ và tên')),
            email: z.string().min(1, msg.requireInput('Email')).email(msg.email),
            password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
            confirmPassword: z.string().min(1, msg.requireInput('Xác nhận mật khẩu')),
            acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Vui lòng đồng ý với điều khoản sử dụng' }) })
        }).refine((data) => data.password === data.confirmPassword, {
            message: 'Mật khẩu xác nhận không khớp', path: ['confirmPassword']
        });

        const result = schema.safeParse({ fullName, email, password, confirmPassword, acceptTerms });
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                const path = issue.path[0]?.toString();
                if (path) fieldErrors[path] = issue.message;
            });
            setErrors(fieldErrors);
            setLoading(false);
            return;
        }
        setErrors({});

        try {
            const recaptchaToken = await executeRecaptcha(RECAPTCHA_ACTIONS.REGISTER);
            await signup(email, password, fullName, recaptchaToken);
            setRegisterSuccess(true);
            triggerConfetti();
            setTimeout(() => navigate('/login'), 2500);
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string; errors?: Array<{ description?: string }> } } };
            const errs = axiosError.response?.data?.errors;
            if (errs && errs.length > 0) {
                setError(errs.map(e => e.description).filter(Boolean).join('. ') || 'Đăng ký thất bại. Vui lòng thử lại.');
            } else {
                setError(axiosError.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    };

    const PasswordToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
        <button type="button" onClick={onToggle} className="text-gray-400 hover:text-accent transition-colors p-1 cursor-pointer">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                    {/* Brand */}
                    <Link to="/" className="flex items-center justify-center gap-2 mb-8 cursor-pointer">
                        <div className="w-10 h-10 bg-accent text-white rounded-lg flex items-center justify-center font-black text-lg">QH</div>
                        <span className="text-lg font-black text-gray-900 tracking-tight">QUANG HƯỞNG</span>
                    </Link>

                    <AnimatePresence mode="wait">
                        {registerSuccess ? (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 size={32} className="text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Đăng ký thành công!</h2>
                                <p className="text-sm text-gray-500">Đang chuyển hướng đến trang đăng nhập...</p>
                            </motion.div>
                        ) : (
                            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Tạo tài khoản mới</h1>
                                <p className="text-sm text-gray-500 text-center mb-8">Đăng ký để trở thành thành viên của Quang Hưởng.</p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <Input label="Họ và tên" type="text" icon={User} placeholder="Nhập họ và tên của bạn" value={fullName} onChange={e => setFullName(e.target.value)} error={errors.fullName} />
                                    <Input label="Địa chỉ Email" type="email" icon={Mail} placeholder="name@gmail.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} />
                                    <Input label="Mật khẩu" type={showPassword ? 'text' : 'password'} icon={Lock} placeholder="Tối thiểu 6 ký tự" value={password} onChange={e => setPassword(e.target.value)} error={errors.password} hint="Mật khẩu cần ít nhất 6 ký tự" suffix={<PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />} />
                                    <Input label="Xác nhận mật khẩu" type={showConfirmPassword ? 'text' : 'password'} icon={Lock} placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} error={errors.confirmPassword} suffix={<PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />} />

                                    {/* Terms checkbox */}
                                    <div className="flex items-start gap-3">
                                        <input type="checkbox" id="acceptTerms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent cursor-pointer" />
                                        <label htmlFor="acceptTerms" className="text-sm text-gray-600 cursor-pointer">
                                            Tôi đồng ý với{' '}
                                            <Link to="/policy/terms" target="_blank" className="text-accent hover:underline font-bold cursor-pointer">Điều khoản sử dụng</Link>
                                            {' '}của Quang Hưởng Computer
                                        </label>
                                    </div>
                                    {errors.acceptTerms && <p className="text-red-500 text-sm ml-7 -mt-2">{errors.acceptTerms}</p>}

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                                                <AlertCircle size={16} /> {error}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Button type="submit" variant="primary" size="lg" loading={loading} icon={ArrowRight} iconPosition="right" className="w-full cursor-pointer">
                                        Đăng ký tài khoản
                                    </Button>
                                </form>

                                <p className="mt-8 text-center text-sm text-gray-500">
                                    Đã có tài khoản?{' '}
                                    <Link to="/login" className="text-accent font-bold hover:underline cursor-pointer">Đăng nhập ngay</Link>
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
